(function(){
  'use strict';
  const PIXEL_ID='1396204625977859';
  const CONSENT_KEY='hp_meta_consent';
  let initialized=false;
  const pending=[];

  function hasConsent(){
    try{return localStorage.getItem(CONSENT_KEY)==='yes';}catch(e){return false;}
  }

  function setConsent(value){
    try{localStorage.setItem(CONSENT_KEY,value);}catch(e){}
  }

  function ensureFbq(){
    if(window.fbq) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }

  function send(event,params){
    if(!hasConsent()) return;
    startPixel();
    try{window.fbq('track',event,params||{});}catch(e){}
  }

  function flush(){
    while(pending.length){
      const item=pending.shift();
      try{window.fbq('track',item.event,item.params||{});}catch(e){}
    }
  }

  function startPixel(){
    if(initialized || !hasConsent()) return;
    initialized=true;
    ensureFbq();
    try{
      window.fbq('init',PIXEL_ID);
      window.fbq('track','PageView');
      flush();
      window.hpMetaStatus={pixelId:PIXEL_ID,consent:true,initialized:true,pageViewSent:true};
      document.dispatchEvent(new CustomEvent('hp-meta-ready'));
    }catch(e){
      initialized=false;
      window.hpMetaStatus={pixelId:PIXEL_ID,consent:true,initialized:false,error:String(e)};
    }
  }

  function removeBanner(){
    const old=document.getElementById('hpCookieBanner');
    if(old) old.remove();
  }

  function showConsent(){
    if(document.getElementById('hpCookieBanner')) return;
    const box=document.createElement('div');
    box.id='hpCookieBanner';
    box.style.cssText='position:fixed;left:14px;right:14px;bottom:14px;z-index:99999;max-width:760px;margin:auto;background:#fff;border:1px solid #dbe2ea;border-radius:18px;padding:16px;box-shadow:0 12px 40px rgba(15,23,42,.18);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#142033';
    box.innerHTML='<div style="font-weight:900;margin-bottom:6px">Cookies für Werbung & Statistik</div><div style="font-size:14px;line-height:1.45;color:#667085">Wir verwenden das Meta-Pixel nur mit deiner Zustimmung, um Werbung und Website-Ergebnisse zu messen.</div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button id="hpConsentAccept" type="button" style="border:0;border-radius:12px;background:#0f172a;color:#fff;padding:11px 14px;font-weight:850">Akzeptieren</button><button id="hpConsentReject" type="button" style="border:1px solid #dbe2ea;border-radius:12px;background:#fff;color:#142033;padding:11px 14px;font-weight:850">Ablehnen</button></div>';
    document.body.appendChild(box);
    document.getElementById('hpConsentAccept').addEventListener('click',function(){
      setConsent('yes');
      removeBanner();
      startPixel();
    });
    document.getElementById('hpConsentReject').addEventListener('click',function(){
      setConsent('no');
      pending.length=0;
      removeBanner();
      window.hpMetaStatus={pixelId:PIXEL_ID,consent:false,initialized:false};
    });
  }

  window.hpTrack=function(event,params){
    let consent=null;
    try{consent=localStorage.getItem(CONSENT_KEY);}catch(e){}
    if(consent==='no') return;
    if(consent==='yes') send(event,params);
    else pending.push({event:event,params:params||{}});
  };

  window.hpResetMetaConsent=function(){
    try{localStorage.removeItem(CONSENT_KEY);}catch(e){}
    location.reload();
  };

  function init(){
    let consent=null;
    try{consent=localStorage.getItem(CONSENT_KEY);}catch(e){}
    if(consent==='yes') startPixel();
    else if(consent!=='no') showConsent();
    else window.hpMetaStatus={pixelId:PIXEL_ID,consent:false,initialized:false};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();