module.exports = function handler(req, res) {
  const clean = value => String(value || '').replace(/\s+/g, '');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: 'https://dbaiwcqoigqgknmtctwl.supabase.co',
    supabaseAnonKey: clean(process.env.SUPABASE_ANON_KEY),
    stripeCheckoutUrl: 'https://buy.stripe.com/3cI6oJcsF7ft7YI4m2cbC00',
    version: '1.3'
  });
};
