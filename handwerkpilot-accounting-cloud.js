(()=>{
  const PROVIDER_KEY='hp_accounting_provider';
  const WISO_KEY='hp_wiso_ownership';
  const META_PROVIDER='hp_accounting_provider';
  const META_WISO='hp_wiso_ownership';
  let syncing=false;

  async function getUser(){
    try{
      if(typeof sb==='undefined'||!sb?.auth)return null;
      const {data,error}=await sb.auth.getUser();
      if(error)return null;
      return data?.user||null;
    }catch(_){return null}
  }

  async function saveCloud(provider,ownershipId){
    try{
      if(typeof sb==='undefined'||!sb?.auth)return false;
      const user=await getUser();
      if(!user)return false;
      const current=user.user_metadata||{};
      const next={...current};
      if(provider)next[META_PROVIDER]=provider;
      if(ownershipId)next[META_WISO]=ownershipId;
      const {error}=await sb.auth.updateUser({data:next});
      return !error;
    }catch(_){return false}
  }

  async function loadCloud(){
    if(syncing)return;
    syncing=true;
    try{
      const user=await getUser();
      if(!user)return;
      const meta=user.user_metadata||{};
      const cloudProvider=String(meta[META_PROVIDER]||'').trim();
      const cloudWiso=String(meta[META_WISO]||'').trim();
      const localProvider=localStorage.getItem(PROVIDER_KEY)||'';
      const localWiso=(localStorage.getItem(WISO_KEY)||'').trim();

      // A fresh WISO callback on this device wins and is copied to the account.
      if(localProvider==='wiso'&&localWiso&&(cloudWiso!==localWiso||cloudProvider!=='wiso')){
        await saveCloud('wiso',localWiso);
        return;
      }

      // Otherwise restore the account setting on this device.
      if(cloudWiso){
        localStorage.setItem(WISO_KEY,cloudWiso);
        localStorage.setItem(PROVIDER_KEY,cloudProvider||'wiso');
        const input=document.getElementById('hpWisoOwnership');
        if(input)input.value=cloudWiso;
        if((cloudProvider||'wiso')==='wiso'&&localProvider!=='wiso'&&typeof window.selectAccountingProvider==='function'){
          window.selectAccountingProvider('wiso');
        }
      }else if(cloudProvider){
        localStorage.setItem(PROVIDER_KEY,cloudProvider);
      }
    }finally{syncing=false}
  }

  const oldSave=window.saveAccountingSetup;
  if(typeof oldSave==='function'){
    window.saveAccountingSetup=async function(){
      const result=oldSave.apply(this,arguments);
      const provider=localStorage.getItem(PROVIDER_KEY)||'';
      const ownership=(localStorage.getItem(WISO_KEY)||'').trim();
      if(provider==='wiso'&&ownership){
        const ok=await saveCloud('wiso',ownership);
        const s=document.getElementById('hpAccountingStatus');
        if(s&&ok){s.textContent='✓ WISO MeinBüro im HandwerkPilot-Konto gespeichert.';s.className='status ok';}
      }else if(provider){
        await saveCloud(provider,'');
      }
      return result;
    };
  }

  const oldSelect=window.selectAccountingProvider;
  if(typeof oldSelect==='function'){
    window.selectAccountingProvider=function(p){
      const result=oldSelect.apply(this,arguments);
      const ownership=(localStorage.getItem(WISO_KEY)||'').trim();
      saveCloud(p,p==='wiso'?ownership:'');
      return result;
    };
  }

  // Sync after the page/auth state settles and again whenever Supabase signs in.
  setTimeout(loadCloud,300);
  setTimeout(loadCloud,1500);
  try{
    if(typeof sb!=='undefined'&&sb?.auth?.onAuthStateChange){
      sb.auth.onAuthStateChange((event)=>{
        if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')setTimeout(loadCloud,50);
      });
    }
  }catch(_){ }
})();