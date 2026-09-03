const API_BASE = 'https://api.meinbuero.de';

async function verifyHandwerkPilotUser(req) {
  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const auth = String(req.headers.authorization || '');
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('SUPABASE_CONFIG');
  if (!auth.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: auth }
  });
  const user = await r.json().catch(() => ({}));
  if (!r.ok || !user?.id) throw new Error('UNAUTHORIZED');
  return user;
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
    if (m === 'SUPABASE_CONFIG') return res.status(500).json({ error: 'Supabase-Konfiguration fehlt.' });
    if (m === 'WISO_NOT_CONFIGURED') return res.status(503).json({ error: 'WISO ist serverseitig noch nicht freigeschaltet. Es fehlen WISO_API_KEY und WISO_API_SECRET.' });
    if (m === 'OWNERSHIP_ID_MISSING') return res.status(400).json({ error: 'Bitte zuerst die WISO Ownership-ID eintragen.' });
    console.error('HandwerkPilot WISO', e);
    return res.status(502).json({ error: m || 'WISO-Verbindung fehlgeschlagen.' });
  }
}
