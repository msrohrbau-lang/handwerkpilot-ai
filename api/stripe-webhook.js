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

    const r = await fetch('https://dbaiwcqoigqgknmtctwl.supabase.co/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payload
    });

    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (e) {
    console.error('stripe-webhook', e);
    return res.status(500).json({ error: e.message || 'Webhook error' });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
