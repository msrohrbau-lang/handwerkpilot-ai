export default async function handler(req, res) {
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
