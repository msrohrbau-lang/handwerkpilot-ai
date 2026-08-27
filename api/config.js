module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: 'https://dbaiwcqoigqgknmtctwl.supabase.co',
    supabaseAnonKey: 'sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr',
    stripeCheckoutUrl: 'https://buy.stripe.com/3cI6oJcsF7ft7YI4m2cbC00',
    version: '1.3'
  });
};
