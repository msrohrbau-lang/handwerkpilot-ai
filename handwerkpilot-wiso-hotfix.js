(()=>{
  const PROVIDER_KEY='hp_accounting_provider';
  const WISO_KEY='hp_wiso_ownership';
  const oldTest=window.testAccountingConnection;

  async function sessionToken(){
    try{
      if(typeof sb==='undefined'||!sb?.auth)return '';
      const {data,error}=await sb.auth.getSession();
      if(error)return '';
      return data?.session?.access_token||'';
    }catch(_){return ''}
  }

  async function saveVerifiedId(id){
    localStorage.setItem(PROVIDER_KEY,'wiso');
    localStorage.setItem(WISO_KEY,id);
    try{
      if(typeof sb!=='undefined'&&sb?.auth){
        const {data}=await sb.auth.getUser();
        const current=data?.user?.user_metadata||{};
        await sb.auth.updateUser({data:{...current,hp_accounting_provider:'wiso',hp_wiso_ownership:id}});
      }
    }catch(_){ }
  }

  window.testAccountingConnection=async function(){
    const provider=localStorage.getItem(PROVIDER_KEY)||'lexware';
    if(provider!=='wiso')return typeof oldTest==='function'?oldTest.apply(this,arguments):undefined;
    const s=document.getElementById('hpAccountingStatus');
    try{
      const input=document.getElementById('hpWisoOwnership');
      const id=String(input?.value||localStorage.getItem(WISO_KEY)||'').trim();
      if(!id)throw new Error('Bitte Ownership-ID eingeben.');
      if(s){s.textContent='Verbindung wird geprüft …';s.className='status';}
      const token=await sessionToken();
      if(!token)throw new Error('Bitte erneut bei HandwerkPilot anmelden.');
      const r=await fetch('/api/wiso',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action:'status',ownershipId:id})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'WISO-Verbindung fehlgeschlagen.');
      await saveVerifiedId(id);
      sessionStorage.removeItem('hp_wiso_callback_fresh');
      if(s){s.textContent='✓ WISO MeinBüro verbunden. Diese geprüfte Verbindung ist jetzt auf allen Geräten gespeichert.';s.className='status ok';}
      return d;
    }catch(e){
      if(s){s.textContent=e.message;s.className='status';}
      throw e;
    }
  };
})();