(function(){
  const PIXEL_ID='1396204625977859';
  const CONSENT_KEY='hp_meta_consent';
  let loaded=false;

  function loadPixel(){
    if(loaded) return;
    loaded=true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',PIXEL_ID);
    fbq('track','PageView');
    window.hpTrack=function(event,params){try{fbq('track',event,params||{});}catch(e){}};
    document.dispatchEvent(new CustomEvent('hp-meta-ready'));
  }

  function showConsent(){
    if(document.getElementById('hpCookieBanner')) return;
    const box=document.createElement('div');
    box.id='hpCookieBanner';
    box.style.cssText='position:fixed;left:14px;right:14px;bottom:14px;z-index:9999;max-width:760px;margin:auto;background:#fff;border:1px solid #dbe2ea;border-radius:18px;padding:16px;box-shadow:0 12px 40px rgba(15,23,42,.18);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#142033';
    box.innerHTML='<div style="font-weight:900;margin-bottom:6px">Cookies für Werbung & Statistik</div><div style="font-size:14px;line-height:1.45;color:#667085">Wir verwenden das Meta-Pixel nur mit deiner Zustimmung, um Werbung und Website-Ergebnisse zu messen.</div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button id="hpConsentAccept" style="border:0;border-radius:12px;background:#0f172a;color:#fff;padding:11px 14px;font-weight:850">Akzeptieren</button><button id="hpConsentReject" style="border:1px solid #dbe2ea;border-radius:12px;background:#fff;color:#142033;padding:11px 14px;font-weight:850">Ablehnen</button></div>';
    document.body.appendChild(box);
    document.getElementById('hpConsentAccept').onclick=function(){localStorage.setItem(CONSENT_KEY,'yes');box.remove();loadPixel();};
    document.getElementById('hpConsentReject').onclick=function(){localStorage.setItem(CONSENT_KEY,'no');box.remove();};
  }

  window.hpTrack=function(event,params){
    if(localStorage.getItem(CONSENT_KEY)==='yes'){
      if(!loaded) loadPixel();
      setTimeout(function(){try{fbq('track',event,params||{});}catch(e){}},0);
    }
  };

  function init(){
    const consent=localStorage.getItem(CONSENT_KEY);
    if(consent==='yes') loadPixel();
    else if(consent!=='no') showConsent();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();