module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const url = 'https://dbaiwcqoigqgknmtctwl.supabase.co';
    const key = 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';

    let body = req.body || {};
    if (typeof body === 'string') body = Object.fromEntries(new URLSearchParams(body));
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const company = String(body.company || '').trim();
    const name = String(body.name || '').trim();

    if (!email || !company || !name || password.length < 6) {
      return res.redirect(303, '/register-v2.html?register_error=Bitte+alle+Felder+ausfüllen');
    }

    const r = await fetch(url + '/auth/v1/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({ email, password, data: { company_name: company, full_name: name } })
    });

    const text = await r.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!r.ok) {
      const msg = data.msg || data.message || data.error_description || data.error || 'Registrierung fehlgeschlagen';
      return res.redirect(303, '/register-v2.html?register_error=' + encodeURIComponent(msg));
    }

    return res.redirect(303, '/login?registered=1');
  } catch (e) {
    return res.redirect(303, '/register-v2.html?register_error=' + encodeURIComponent(e.message || 'Serverfehler'));
  }
};