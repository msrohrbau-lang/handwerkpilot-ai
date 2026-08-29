export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const price = process.env.STRIPE_PRICE_ID;
    if (!secret || !price) {
      return res.status(500).json({ error: 'Stripe ist noch nicht vollständig konfiguriert.' });
    }

    const origin = 'https://handwerkpilot-ai.vercel.app';
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', price);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', `${origin}/?checkout=success`);
    params.set('cancel_url', `${origin}/?checkout=cancel`);
    params.set('allow_promotion_codes', 'true');
    params.set('billing_address_collection', 'auto');

    const email = req.body?.email;
    if (email) params.set('customer_email', email);

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Stripe Checkout konnte nicht gestartet werden.' });
    return res.status(200).json({ url: data.url });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Checkout-Fehler' });
  }
}
