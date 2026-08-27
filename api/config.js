module.exports = function handler(req, res) {
  const clean = value => String(value || '').replace(/\s+/g, '');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: clean(process.env.SUPABASE_URL),
    supabaseAnonKey: clean(process.env.SUPABASE_ANON_KEY),
    stripeCheckoutUrl: 'https://buy.stripe.com/3cI6oJcsF7ft7YI4m2cbC00',
    version: '1.3'
  });
};
