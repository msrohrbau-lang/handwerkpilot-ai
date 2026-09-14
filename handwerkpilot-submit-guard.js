(()=>{
  const states=new Map();
  const visible=b=>b&&b.offsetParent!==null;
  function findButton(pattern){
    const active=document.activeElement;
    if(active?.tagName==='BUTTON'&&visible(active))return active;
    return [...document.querySelectorAll('#modalBody button')].find(b=>visible(b)&&pattern.test(b.textContent||''))||null;
  }
  function wrap(name,{pattern,busyText,successText,statusId,successCheck}){
    const original=window[name];
    if(typeof original!=='function'||original.__hpGuarded)return;
    const guarded=async function(...args){
      if(states.get(name))return;
      states.set(name,true);
      const btn=findButton(pattern),oldText=btn?.textContent||'';
      if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent=busyText}
      try{
        const result=await original.apply(this,args);
        const status=statusId?document.getElementById(statusId):null;
        const ok=successCheck?successCheck(result,status):!(status&&status.textContent&&!/✓|erfolgreich/i.test(status.textContent));
        if(btn?.isConnected){
          btn.textContent=ok?successText:oldText;
          if(ok)await new Promise(resolve=>setTimeout(resolve,700));
        }
        return result;
      }catch(error){
        if(btn?.isConnected)btn.textContent=oldText;
        throw error;
      }finally{
        if(btn?.isConnected){btn.disabled=false;btn.removeAttribute('aria-busy');if(btn.textContent===successText)btn.textContent=oldText}
        states.set(name,false);
      }
    };
    guarded.__hpGuarded=true;
    window[name]=guarded;
  }
  wrap('saveCustomer',{pattern:/Speichern/i,busyText:'Wird gespeichert …',successText:'✓ Gespeichert',statusId:'cStatus'});
  wrap('saveDoc',{pattern:/Speichern/i,busyText:'Wird gespeichert …',successText:'✓ Gespeichert',statusId:'docStatus'});
  wrap('saveExistingDoc',{pattern:/Änderungen speichern/i,busyText:'Wird gespeichert …',successText:'✓ Gespeichert',statusId:'eStatus'});
  wrap('syncCustomerWiso',{pattern:/WISO übertragen/i,busyText:'Wird an WISO übertragen …',successText:'✓ Übertragen',statusId:'cStatus',successCheck:(_,s)=>/✓|übertragen/i.test(s?.textContent||'')});
  wrap('syncInvoiceAccounting',{pattern:/Buchhaltung|WISO/i,busyText:'Wird übertragen …',successText:'✓ Übertragen',successCheck:r=>!!r});
})();