module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: 'https://dbaiwcqoigqgknmtctwl.supabase.co',
    supabaseAnonKey: 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr',
    stripeCheckoutUrl: 'https://buy.stripe.com/test_fZu4gBezQ0ffeOp3h55Rm00',
    stripeMode: 'sandbox',
    version: '1.3.1'
  });
};
