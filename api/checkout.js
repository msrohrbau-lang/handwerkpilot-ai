async function ensureGermanVatTaxRate(stripeSecret) {
  const list = await fetch('https://api.stripe.com/v1/tax_rates?active=true&limit=100', {
    headers: { Authorization: `Bearer ${stripeSecret}` }
  });
  const existing = await list.json().catch(() => ({}));
  const found = Array.isArray(existing?.data) && existing.data.find(rate =>
    rate?.active && rate?.inclusive === false && Number(rate?.percentage) === 19 &&
    rate?.country === 'DE' && rate?.display_name === 'Umsatzsteuer'
  );
  if (found?.id) return found.id;

  const body = new URLSearchParams();
  body.set('display_name', 'Umsatzsteuer');
  body.set('description', '19 % deutsche Umsatzsteuer');
  body.set('jurisdiction', 'DE');
  body.set('country', 'DE');
  body.set('percentage', '19');
  body.set('inclusive', 'false');
  const created = await fetch('https://api.stripe.com/v1/tax_rates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await created.json().catch(() => ({}));
  if (!created.ok || !data?.id) throw new Error('Umsatzsteuersatz konnte nicht eingerichtet werden.');
  return data.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
    const price = 'price_1UFYJjRu87phJbODNTJk5hPw';
    const supabaseUrl = 'https://dbaiwcqoigqgknmtctwl.supabase.co';
    const supabaseAnonKey = 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';

    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bitte erneut anmelden.' });
    const accessToken = auth.slice(7);

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResp.json();
    if (!userResp.ok || !user?.id || !user?.email) return res.status(401).json({ error: 'Anmeldung ist abgelaufen. Bitte erneut anmelden.' });

    if (!(stripeSecret.startsWith('sk_') || stripeSecret.startsWith('rk_'))) {
      return res.status(503).json({ error: 'Zahlungsdienst ist noch nicht eingerichtet. Bitte später erneut versuchen.' });
    }

    const taxRateId = await ensureGermanVatTaxRate(stripeSecret);

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
    params.set('billing_address_collection', 'required');
    params.set('tax_id_collection[enabled]', 'true');
    params.set('customer_email', user.email);
    params.set('payment_method_collection', 'always');
    params.set('subscription_data[trial_period_days]', '30');
    params.set('subscription_data[default_tax_rates][0]', taxRateId);
    params.set('subscription_data[trial_settings][end_behavior][missing_payment_method]', 'cancel');
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
      return res.status(502).json({ error: 'Checkout konnte nicht gestartet werden. Bitte später erneut versuchen.' });
    }

    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('checkout', e);
    return res.status(500).json({ error: 'Checkout konnte nicht gestartet werden. Bitte später erneut versuchen.' });
  }
}
