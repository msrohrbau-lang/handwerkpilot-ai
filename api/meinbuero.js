const BASE = 'https://api.meinbuero.de';

function send(res, status, payload) {
  res.status(status).json(payload);
}

async function createToken(iid) {
  const apiKey = process.env.MEINBUERO_API_KEY;
  const apiSecret = process.env.MEINBUERO_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('WISO API-Zugang ist auf dem Server noch nicht eingerichtet.');
  if (!iid) throw new Error('Ownership-ID (iid) fehlt.');

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const r = await fetch(`${BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ ownershipId: iid })
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(data?.message || data?.detail || `WISO Token-Fehler (${r.status})`);
  return data.token || data.Token || data.access_token;
}

async function wisoGet(path, token) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(data?.message || data?.detail || `WISO API-Fehler (${r.status})`);
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const { action = 'test', iid } = req.body || {};
    const token = await createToken(String(iid || '').trim());

    if (action === 'test') {
      const account = await wisoGet('/setting/account', token);
      return send(res, 200, { ok: true, connected: true, account });
    }

    if (action === 'customers') {
      const customers = await wisoGet('/customer', token);
      return send(res, 200, { ok: true, customers });
    }

    return send(res, 400, { ok: false, error: 'Unbekannte Aktion.' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || 'WISO-Verbindung fehlgeschlagen.' });
  }
}
