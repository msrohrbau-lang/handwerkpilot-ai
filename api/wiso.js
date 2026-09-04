import crypto from 'node:crypto';

const API_BASE = 'https://api.meinbuero.de/openapi';
const SUPABASE_URL_FALLBACK = 'https://dbaiwcqoigqgknmtctwl.supabase.co';
const SUPABASE_PROJECT_HOST = 'dbaiwcqoigqgknmtctwl.supabase.co';

function cleanUrl(value, fallback = '') {
  const raw = String(value || fallback || '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  let url = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  url = url.replace(/\/$/, '');
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== SUPABASE_PROJECT_HOST) return SUPABASE_URL_FALLBACK;
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return SUPABASE_URL_FALLBACK;
  }
}

function fromB64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized + '='.repeat((4 - normalized.length % 4) % 4), 'base64');
}

async function verifyHandwerkPilotUser(req) {
  const supabaseUrl = cleanUrl(process.env.SUPABASE_URL, SUPABASE_URL_FALLBACK);
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');

  const token = auth.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('UNAUTHORIZED');

  let header, payload;
  try {
    header = JSON.parse(fromB64Url(parts[0]).toString('utf8'));
    payload = JSON.parse(fromB64Url(parts[1]).toString('utf8'));
  } catch {
    throw new Error('UNAUTHORIZED');
  }

  if (!payload?.sub || !payload?.exp || payload.exp * 1000 <= Date.now()) throw new Error('UNAUTHORIZED');
  if (typeof payload.iss === 'string' && !payload.iss.startsWith(`${supabaseUrl}/auth/v1`)) throw new Error('UNAUTHORIZED');

  const jwksRes = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, { cache: 'no-store' });
  if (!jwksRes.ok) throw new Error('UNAUTHORIZED');
  const jwks = await jwksRes.json().catch(() => ({}));
  const jwk = Array.isArray(jwks?.keys) ? jwks.keys.find(k => !header.kid || k.kid === header.kid) : null;
  if (!jwk) throw new Error('UNAUTHORIZED');

  try {
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const data = Buffer.from(`${parts[0]}.${parts[1]}`);
    const signature = fromB64Url(parts[2]);
    let valid = false;
    if (header.alg === 'RS256') {
      valid = crypto.verify('RSA-SHA256', data, key, signature);
    } else if (header.alg === 'ES256') {
      valid = crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, signature);
    }
    if (!valid) throw new Error('UNAUTHORIZED');
  } catch {
    throw new Error('UNAUTHORIZED');
  }

  return { id: payload.sub, email: payload.email || '' };
}

async function getWisoToken(ownershipId) {
  const key = String(process.env.WISO_API_KEY || '').trim();
  const secret = String(process.env.WISO_API_SECRET || '').trim();
  if (!key || !secret) throw new Error('WISO_NOT_CONFIGURED');
  if (!ownershipId) throw new Error('OWNERSHIP_ID_MISSING');

  const basic = Buffer.from(`${key}:${secret}`).toString('base64');
  const r = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ ownershipId })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('WISO auth error', r.status, data);
    throw new Error(data?.message || data?.detail || `WISO Anmeldung fehlgeschlagen (${r.status}).`);
  }
  const token = data?.accessToken || data?.access_token || data?.token;
  if (!token) throw new Error('WISO hat kein Zugriffstoken geliefert.');
  return token;
}

async function wisoFetch(path, token, options = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('WISO API error', path, r.status, data);
    throw new Error(data?.message || data?.detail || `WISO API Fehler (${r.status}).`);
  }
  return data;
}

function parseCity(value = '') {
  const text = String(value).trim();
  const match = text.match(/^(\d{5})\s+(.+)$/);
  return match ? { zipCode: match[1], city: match[2] } : { zipCode: '', city: text };
}

function customerPayload(c = {}) {
  const place = parseCity(c.city);
  return {
    email: c.email || undefined,
    phone: c.phone || undefined,
    customerDefaultAddress: {
      billingAddress: {
        kind: 'company',
        companyName: c.name || '',
        firstName: c.contact_person || '',
        lastName: '',
        street: c.street || '',
        zipCode: place.zipCode,
        city: place.city,
        countryIso: 'DE'
      }
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt.' });
  try {
    await verifyHandwerkPilotUser(req);
    const body = req.body || {};
    const action = String(body.action || '').trim();
    const token = await getWisoToken(String(body.ownershipId || '').trim());

    if (action === 'status') {
      const account = await wisoFetch('/setting/account', token);
      return res.status(200).json({ connected: true, account });
    }

    if (action === 'createCustomer') {
      if (!body.customer?.name) return res.status(400).json({ error: 'Kundenname fehlt.' });
      const customer = await wisoFetch('/customer/', token, {
        method: 'POST',
        body: JSON.stringify(customerPayload(body.customer))
      });
      return res.status(200).json({ ok: true, customer });
    }

    return res.status(400).json({ error: 'Unbekannte WISO-Aktion.' });
  } catch (e) {
    const m = String(e?.message || e);
    if (m === 'UNAUTHORIZED') return res.status(401).json({ error: 'Bitte erneut bei HandwerkPilot anmelden.' });
    if (m === 'WISO_NOT_CONFIGURED') return res.status(503).json({ error: 'WISO-Zugang ist fast fertig. Bitte WISO_API_KEY und WISO_API_SECRET einmalig sicher in Vercel hinterlegen.' });
    if (m === 'OWNERSHIP_ID_MISSING') return res.status(400).json({ error: 'Bitte zuerst die WISO Ownership-ID eintragen.' });
    console.error('HandwerkPilot WISO', e);
    return res.status(502).json({ error: m || 'WISO-Verbindung fehlgeschlagen.' });
  }
}
