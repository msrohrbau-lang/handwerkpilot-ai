(()=>{
const isEmployee=()=>{try{return String(profile?.role||'')==='employee'}catch{return false}};
let reloading=false;
let originalRender=null;
const cacheKey=()=>`hp_employee_bautage_cache_${session?.user?.id||'user'}`;
function getCache(){try{const x=JSON.parse(localStorage.getItem(cacheKey())||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function saveCache(rows){try{localStorage.setItem(cacheKey(),JSON.stringify(rows||[]))}catch{}}
function mergeReports(a,b){const m=new Map();[...(a||[]),...(b||[])].forEach(x=>{if(x?.id)m.set(String(x.id),x)});return [...m.values()].sort((x,y)=>String(y.payload?.date||y.created_at||'').localeCompare(String(x.payload?.date||x.created_at||'')))}
function mergeIntoDocuments(rows){const other=(documents||[]).filter(d=>d.document_type!=='bautagesbericht');const live=(documents||[]).filter(d=>d.document_type==='bautagesbericht');documents=[...other,...mergeReports(rows,live)]}
async function reloadOwnReports(){
  if(!isEmployee()||!session?.user?.id||!sb||reloading)return;
  reloading=true;
  try{
    const cached=getCache();
    if(cached.length){mergeIntoDocuments(cached);if(originalRender)originalRender()}
    const {data,error}=await sb.from('documents').select('*').eq('document_type','bautagesbericht').order('created_at',{ascending:false});
    if(error){console.warn('Bautagesberichte konnten nicht neu geladen werden',error);return}
    const merged=mergeReports(cached,data||[]);
    if(merged.length)saveCache(merged);
    mergeIntoDocuments(merged);
    if(originalRender)originalRender();
  }finally{reloading=false}
}
window.hpReloadOwnReports=reloadOwnReports;
function rememberCurrentReports(){if(!isEmployee())return;const now=(documents||[]).filter(d=>d.document_type==='bautagesbericht');const merged=mergeReports(getCache(),now);if(merged.length)saveCache(merged)}
function restoreCache(){if(!isEmployee())return;const cached=getCache();if(!cached.length)return;mergeIntoDocuments(cached);if(originalRender)originalRender()}
function patchReportForm(){const t=document.getElementById('btTemp');if(t){t.type='text';t.inputMode='text';t.placeholder='z. B. -5';t.setAttribute('autocomplete','off')}const f=document.querySelector('#modalBody input[type="file"]');if(f){f.removeAttribute('capture');f.setAttribute('accept','image/*,application/pdf,.pdf');f.multiple=true}}
function refreshEmployeeReports(){if(!isEmployee())return;restoreCache();setTimeout(reloadOwnReports,20)}
function install(){
  originalRender=window.renderBautagesberichte||null;
  const oldOpen=window.openBautagesbericht;if(oldOpen&&!oldOpen._hpBautageFix){const op=function(id=''){oldOpen(id);setTimeout(patchReportForm,40);setTimeout(patchReportForm,180)};op._hpBautageFix=1;window.openBautagesbericht=op}
  const oldSave=window.saveBautagesbericht;if(oldSave&&!oldSave._hpKeepEmployee){const sv=async function(id=''){const r=await oldSave(id);setTimeout(()=>{rememberCurrentReports();restoreCache()},80);setTimeout(refreshEmployeeReports,600);return r};sv._hpKeepEmployee=1;window.saveBautagesbericht=sv}
  const oldShow=window.showView;if(oldShow&&!oldShow._hpBautagePersistence){const sh=function(id){const r=oldShow(id);if((id==='bautage'||id==='projects')&&isEmployee())refreshEmployeeReports();return r};sh._hpBautagePersistence=1;window.showView=sh}
  refreshEmployeeReports();
  window.addEventListener('pageshow',refreshEmployeeReports);
  window.addEventListener('focus',refreshEmployeeReports);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEmployeeReports()});
}
setTimeout(install,950);
})();