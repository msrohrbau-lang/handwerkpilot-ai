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
    const invite = String(body.invite || '').trim();

    if (!email || !name || password.length < 6 || (!invite && !company)) {
      const back = invite ? '/register-v2.html?invite='+encodeURIComponent(invite) : '/register-v2.html';
      return res.redirect(303, back + (back.includes('?')?'&':'?') + 'register_error=Bitte+alle+Felder+ausfüllen');
    }

    const metadata = { full_name: name };
    if (invite) metadata.invite_token = invite;
    else metadata.company_name = company;

    const r = await fetch(url + '/auth/v1/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({ email, password, data: metadata })
    });

    const text = await r.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!r.ok) {
      const msg = data.msg || data.message || data.error_description || data.error || 'Registrierung fehlgeschlagen';
      const back = invite ? '/register-v2.html?invite='+encodeURIComponent(invite) : '/register-v2.html';
      return res.redirect(303, back + (back.includes('?')?'&':'?') + 'register_error=' + encodeURIComponent(msg));
    }

    return res.redirect(303, invite ? '/login?joined=1' : '/register-success.html');
  } catch (e) {
    return res.redirect(303, '/register-v2.html?register_error=' + encodeURIComponent(e.message || 'Serverfehler'));
  }
};