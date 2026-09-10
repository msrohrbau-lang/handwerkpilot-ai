(()=>{
  const PROVIDER_KEY='hp_accounting_provider';
  const WISO_KEY='hp_wiso_ownership';
  const FRESH_KEY='hp_wiso_callback_fresh';
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
      const fresh=(sessionStorage.getItem(FRESH_KEY)||'').trim();

      // Only a WISO callback created in THIS browser session may overwrite
      // an existing account-wide ownership ID. This prevents an old phone/
      // tablet value from replacing a newer working WISO connection.
      if(fresh && localProvider==='wiso' && localWiso===fresh){
        if(cloudWiso!==fresh || cloudProvider!=='wiso') await saveCloud('wiso',fresh);
        return;
      }

      // The account-wide value is authoritative on normal page loads.
      if(cloudWiso){
        localStorage.setItem(WISO_KEY,cloudWiso);
        localStorage.setItem(PROVIDER_KEY,cloudProvider||'wiso');
        const input=document.getElementById('hpWisoOwnership');
        if(input)input.value=cloudWiso;
        if((cloudProvider||'wiso')==='wiso'&&localProvider!=='wiso'&&typeof window.selectAccountingProvider==='function'){
          window.selectAccountingProvider('wiso');
        }
      }else if(localProvider==='wiso'&&localWiso){
        // One-time migration for older accounts that only had local storage.
        await saveCloud('wiso',localWiso);
      }else if(cloudProvider){
        localStorage.setItem(PROVIDER_KEY,cloudProvider);
      }
    }finally{syncing=false}
  }

  // Expose an explicit save helper for a successful WISO connection test.
  window.hpSaveWisoToCloud=async function(ownershipId){
    const id=String(ownershipId||localStorage.getItem(WISO_KEY)||'').trim();
    if(!id)return false;
    localStorage.setItem(PROVIDER_KEY,'wiso');
    localStorage.setItem(WISO_KEY,id);
    return saveCloud('wiso',id);
  };

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
      // Changing provider alone must never upload an old local WISO ID.
      saveCloud(p,'');
      return result;
    };
  }

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