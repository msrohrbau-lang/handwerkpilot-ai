export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const fallbackUrl = 'https://buy.stripe.com/cNicN7fERfLZ92M19QcbC01';

  try {
    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
    const price = String(process.env.STRIPE_PRICE_ID || '').trim();
    const supabaseUrl = String(process.env.SUPABASE_URL || 'https://dbaiwcqoigqgknmtctwl.supabase.co').trim();
    const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr').trim();

    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bitte erneut anmelden.' });
    const accessToken = auth.slice(7);

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResp.json();
    if (!userResp.ok || !user?.id || !user?.email) return res.status(401).json({ error: 'Anmeldung ist abgelaufen. Bitte erneut anmelden.' });

    // If the API credentials are not usable, keep sales working via the verified Stripe Payment Link.
    if (!stripeSecret.startsWith('sk_') || !price.startsWith('price_')) {
      return res.status(200).json({ url: fallbackUrl, fallback: true });
    }

    let organizationId = '';
    try {
      const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=organization_id&limit=1`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
      });
      const profiles = await profileResp.json();
      organizationId = Array.isArray(profiles) ? String(profiles[0]?.organization_id || '') : '';
    } catch (_) {}

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
    params.set('subscription_data[trial_period_days]', '14');
    if (organizationId) {
      params.set('client_reference_id', organizationId);
      params.set('metadata[organization_id]', organizationId);
      params.set('metadata[user_id]', user.id);
      params.set('subscription_data[metadata][organization_id]', organizationId);
      params.set('subscription_data[metadata][user_id]', user.id);
    }

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok || !data?.url) {
      console.error('Stripe checkout error', { status: r.status, type: data?.error?.type, code: data?.error?.code, message: data?.error?.message });
      return res.status(200).json({ url: fallbackUrl, fallback: true });
    }

    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('checkout', e);
    return res.status(200).json({ url: fallbackUrl, fallback: true });
  }
}
