export default async function handler(req, res) {
  const iid = String(req.query?.iid || '').trim();
  const target = new URL('https://handwerkpilot-ai.vercel.app/handwerkpilot-2-lexware.html');
  target.searchParams.set('v', '34');
  target.searchParams.set('accounting', 'wiso');
  target.searchParams.set('wiso_callback', '1');
  if (iid) target.searchParams.set('iid', iid);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.redirect(302, target.toString());
}
