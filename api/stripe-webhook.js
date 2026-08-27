const SUPABASE_URL = 'https://dbaiwcqoigqgknmtctwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';

async function sync(payload) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/sync_stripe_subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  if (!r.ok) throw new Error('Supabase sync failed: ' + text);
  return text;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const secret = String(req.query && req.query.key || '');
  if (!secret) return res.status(401).send('Missing webhook key');

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const obj = event.data && event.data.object || {};

    if (event.type === 'checkout.session.completed') {
      const email = obj.customer_details && obj.customer_details.email || obj.customer_email || null;
      await sync({
        p_secret: secret,
        p_email: email,
        p_customer_id: obj.customer || null,
        p_subscription_id: obj.subscription || null,
        p_price_id: null,
        p_status: 'trialing',
        p_period_end: null,
        p_cancel_at_period_end: false
      });
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const firstItem = obj.items && obj.items.data && obj.items.data[0] || {};
      const priceId = firstItem.price && firstItem.price.id || null;
      const periodUnix = obj.current_period_end || firstItem.current_period_end || null;
      const periodEnd = periodUnix ? new Date(periodUnix * 1000).toISOString() : null;
      await sync({
        p_secret: secret,
        p_email: null,
        p_customer_id: obj.customer || null,
        p_subscription_id: obj.id || null,
        p_price_id: priceId,
        p_status: event.type === 'customer.subscription.deleted' ? 'canceled' : (obj.status || 'active'),
        p_period_end: periodEnd,
        p_cancel_at_period_end: !!obj.cancel_at_period_end
      });
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('stripe-webhook', e);
    return res.status(400).json({ error: e.message || 'Webhook error' });
  }
};