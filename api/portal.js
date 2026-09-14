async function handleSupport(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt.' });
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const subject = String(req.body?.subject || 'Allgemeine Frage').trim();
  const message = String(req.body?.message || '').trim();
  const website = String(req.body?.website || '').trim();
  if (website) return res.status(200).json({ ok: true });
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5) return res.status(400).json({ error: 'Bitte Name, gültige E-Mail-Adresse und Nachricht ausfüllen.' });
  if (name.length > 120 || subject.length > 160 || message.length > 5000) return res.status(400).json({ error: 'Die Nachricht ist zu lang.' });
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!resendKey) return res.status(503).json({ error: 'Der Support ist gerade nicht verfügbar. Bitte später erneut versuchen.' });
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#039;' }[char]));
  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'HandwerkPilot Support <hallo@handwerkpilot.app>', to: ['schmidt@ms-rohrbau.de'], reply_to: email, subject: '[HandwerkPilot Support] ' + subject,
      text: 'Neue Supportanfrage\n\nVon: ' + name + ' <' + email + '>\nBetreff: ' + subject + '\n\n' + message,
      html: '<h2>Neue Supportanfrage</h2><p><b>Von:</b> ' + esc(name) + ' &lt;' + esc(email) + '&gt;</p><p><b>Betreff:</b> ' + esc(subject) + '</p><p style="white-space:pre-wrap">' + esc(message) + '</p>' })
  });
  const data = await mail.json().catch(() => ({}));
  if (!mail.ok) { console.error('support mail', mail.status, data); return res.status(502).json({ error: 'Die Nachricht konnte nicht gesendet werden. Bitte später erneut versuchen.' }); }
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  const url = new URL(req.url || '/', 'https://handwerkpilot-ai.vercel.app');
  if (url.searchParams.get('mode') === 'support') return handleSupport(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
    const supabaseUrl = String(process.env.SUPABASE_URL || 'https://dbaiwcqoigqgknmtctwl.supabase.co').trim();
    const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr').trim();
    if (!stripeSecret.startsWith('sk_')) return res.status(500).json({ error: 'Stripe ist nicht vollständig konfiguriert.' });

    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bitte erneut anmelden.' });
    const accessToken = auth.slice(7);

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
    const user = await userResp.json().catch(() => ({}));
    if (!userResp.ok || !user?.id) return res.status(401).json({ error: 'Anmeldung ist abgelaufen. Bitte erneut anmelden.' });

    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=organization_id&limit=1`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
    const profiles = await profileResp.json().catch(() => []);
    const organizationId = Array.isArray(profiles) ? profiles[0]?.organization_id : null;
    if (!organizationId) return res.status(400).json({ error: 'Firmenkonto konnte nicht ermittelt werden.' });

    const subResp = await fetch(`${supabaseUrl}/rest/v1/subscriptions?organization_id=eq.${encodeURIComponent(organizationId)}&select=customer_id,status&limit=1`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
    const subs = await subResp.json().catch(() => []);
    const customerId = Array.isArray(subs) ? subs[0]?.customer_id : null;
    if (!customerId) return res.status(400).json({ error: 'Für dieses Konto wurde noch kein Stripe-Abo gefunden.' });

    const params = new URLSearchParams();
    params.set('customer', customerId);
    params.set('return_url', 'https://handwerkpilot-ai.vercel.app/konto.html');
    const stripeResp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await stripeResp.json().catch(() => ({}));
    if (!stripeResp.ok || !data?.url) {
      console.error('Stripe portal error', data?.error || data);
      return res.status(stripeResp.status || 500).json({ error: data?.error?.message || 'Abo-Verwaltung konnte nicht geöffnet werden.' });
    }
    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('portal', e);
    return res.status(500).json({ error: e?.message || 'Abo-Verwaltung konnte nicht geöffnet werden.' });
  }
}
