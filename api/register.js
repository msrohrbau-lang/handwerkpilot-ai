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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const url='https://dbaiwcqoigqgknmtctwl.supabase.co';
    const key='sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';
    const stripeSecret=String(process.env.STRIPE_SECRET_KEY||'').trim();
    const stripePrice='price_1UFYJjRu87phJbODNTJk5hPw';
    let body=req.body||{}; if(typeof body==='string') body=Object.fromEntries(new URLSearchParams(body));
    const password=String(body.password||'');
    const company=String(body.company||'').trim();
    const name=String(body.name||'').trim();
    const invite=String(body.invite||'').trim();
    const phone=String(body.phone||'').trim();
    let email=String(body.email||'').trim();
    const digits=phone.replace(/\D/g,'');
    if(invite && !email && digits) email=`${digits}@phone.handwerkpilot.local`;
    if(!name || password.length<6 || (!invite && (!company || !email)) || (invite && (!digits || !email))){
      const back=invite?'/register-v2.html?invite='+encodeURIComponent(invite):'/register-v2.html';
      return res.redirect(303,back+(back.includes('?')?'&':'?')+'register_error='+encodeURIComponent('Bitte alle Felder ausfüllen'));
    }
    const metadata={full_name:name};
    if(invite){metadata.invite_token=invite;metadata.phone=phone;metadata.login_phone=digits}else metadata.company_name=company;
    const r=await fetch(url+'/auth/v1/signup',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},body:JSON.stringify({email,password,data:metadata})});
    const text=await r.text();let data={};try{data=JSON.parse(text)}catch{data={message:text}}
    if(!r.ok){const msg=data.msg||data.message||data.error_description||data.error||'Registrierung fehlgeschlagen';const back=invite?'/register-v2.html?invite='+encodeURIComponent(invite):'/register-v2.html';return res.redirect(303,back+(back.includes('?')?'&':'?')+'register_error='+encodeURIComponent(msg));}

    if(!invite){
      // Welcome mail is deliberately best-effort: signup must never fail because mail delivery is temporarily unavailable.
      const resendKey=String(process.env.RESEND_API_KEY||'').trim();
      if(resendKey){
        try{
          const safeName=name.replace(/[<>&]/g,'');
          const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},body:JSON.stringify({
            from:'HandwerkPilot <hallo@handwerkpilot.app>',to:[email],subject:'Willkommen bei HandwerkPilot – Ihre 30 Tage starten jetzt',
            text:`Hallo ${name},\n\nwillkommen bei HandwerkPilot. Ihre 30 Tage kostenlose Testphase startet jetzt.\n\nLegen Sie als Erstes Ihre Firma, einen Kunden und eine Baustelle an. Danach können Sie Stundenzettel, Bautagesberichte und Rechnungen direkt vom Handy testen.\n\nNach 30 Tagen kostet der Solo-Tarif 59 € netto pro Monat zzgl. 19 % USt.. Wenn Sie nicht weitermachen möchten, können Sie vorher kündigen.\n\nViele Grüße\nMichael Schmidt\nHandwerkPilot`,
            html:`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f5f7;padding:24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td style="background:#0f172a;color:#fff;padding:26px;font-size:26px;font-weight:700">HandwerkPilot</td></tr><tr><td style="padding:28px;color:#142033;font-size:16px;line-height:1.55"><strong style="font-size:22px">Willkommen, ${safeName}!</strong><p>Ihre 30 Tage kostenlose Testphase startet jetzt.</p><p>Legen Sie als Erstes Ihre Firma, einen Kunden und eine Baustelle an. Danach können Sie Stundenzettel, Bautagesberichte und Rechnungen direkt vom Handy testen.</p><p>Nach 30 Tagen kostet der Solo-Tarif 59 € netto pro Monat zzgl. 19 % USt.. Wenn Sie nicht weitermachen möchten, können Sie vorher kündigen.</p><p>Viele Grüße<br>Michael Schmidt<br>HandwerkPilot</p></td></tr></table></td></tr></table></body></html>`
          })});
          if(!mail.ok) console.error('welcome email',mail.status,await mail.text());
        }catch(e){console.error('welcome email',e)}
      } else console.warn('RESEND_API_KEY missing; welcome email skipped');

      // Collect payment details using the current HandwerkPilot Solo price. Nothing is charged during the 30-day trial.
      if (!stripeSecret.startsWith('sk_')) return res.redirect(303,'/login?registered=1');
      const taxRateId=await ensureGermanVatTaxRate(stripeSecret);
      const params = new URLSearchParams();
      params.set('mode','subscription');
      params.set('line_items[0][price]',stripePrice);
      params.set('line_items[0][quantity]','1');
      params.set('success_url','https://handwerkpilot-ai.vercel.app/?checkout=success&session_id={CHECKOUT_SESSION_ID}');
      params.set('cancel_url','https://handwerkpilot-ai.vercel.app/register-v2.html?checkout=cancel');
      params.set('customer_email',email);
      params.set('billing_address_collection','required');
      params.set('tax_id_collection[enabled]','true');
      params.set('payment_method_collection','always');
      params.set('subscription_data[trial_period_days]','30');
      params.set('subscription_data[default_tax_rates][0]',taxRateId);
      params.set('subscription_data[trial_settings][end_behavior][missing_payment_method]','cancel');
      const checkout = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+stripeSecret,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});
      const checkoutData = await checkout.json().catch(()=>({}));
      if (!checkout.ok || !checkoutData?.url) {
        console.error('Stripe checkout',checkoutData?.error||checkoutData);
        return res.redirect(303,'/login?registered=1');
      }
      return res.redirect(303,checkoutData.url);
    }
    return res.redirect(303,'/login?joined=1&phone='+encodeURIComponent(phone));
  }catch(e){return res.redirect(303,'/register-v2.html?register_error='+encodeURIComponent(e.message||'Serverfehler'));}
};