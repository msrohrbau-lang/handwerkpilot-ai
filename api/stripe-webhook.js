const SUPABASE_URL = 'https://dbaiwcqoigqgknmtctwl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const payload = await readRaw(req);
    const signature = String(req.headers['stripe-signature'] || '');
    if (!payload || !signature) return res.status(400).send('Missing Stripe payload or signature');

    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/process_stripe_webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({ p_payload: payload, p_signature: signature })
    });
    const text = await r.text();
    if (!r.ok) throw new Error('Supabase webhook validation failed: ' + text);
    if (text !== 'true') return res.status(400).send('Invalid or unmapped Stripe webhook');

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('stripe-webhook', e);
    return res.status(400).json({ error: e.message || 'Webhook error' });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
