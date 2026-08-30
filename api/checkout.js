export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const price = process.env.STRIPE_PRICE_ID;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!stripeSecret || !price || !supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Checkout ist noch nicht vollständig konfiguriert.' });
    }

    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bitte erneut anmelden.' });
    const accessToken = auth.slice(7);

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResp.json();
    if (!userResp.ok || !user?.id || !user?.email) return res.status(401).json({ error: 'Anmeldung ist abgelaufen. Bitte erneut anmelden.' });

    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=organization_id&limit=1`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
    });
    const profiles = await profileResp.json();
    const organizationId = Array.isArray(profiles) ? profiles[0]?.organization_id : null;
    if (!profileResp.ok || !organizationId) return res.status(400).json({ error: 'Firmenkonto konnte nicht ermittelt werden.' });

    const origin = 'https://handwerkpilot-ai.vercel.app';
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', price);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/?checkout=cancel`);
    params.set('allow_promotion_codes', 'true');
    params.set('billing_address_collection', 'auto');
    params.set('customer_email', user.email);
    params.set('client_reference_id', organizationId);
    params.set('metadata[organization_id]', organizationId);
    params.set('metadata[user_id]', user.id);
    params.set('subscription_data[metadata][organization_id]', organizationId);
    params.set('subscription_data[metadata][user_id]', user.id);
    params.set('subscription_data[trial_period_days]', '14');

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Stripe Checkout konnte nicht gestartet werden.' });
    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('checkout', e);
    return res.status(500).json({ error: e.message || 'Checkout-Fehler' });
  }
}
