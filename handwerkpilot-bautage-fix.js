(()=>{
const isEmployee=()=>{try{return String(profile?.role||'')==='employee'}catch{return false}};
let reloading=false;
let originalRender=null;
async function reloadOwnReports(){
  if(!isEmployee()||!session?.user?.id||!sb||reloading)return;
  reloading=true;
  try{
    const {data,error}=await sb.from('documents').select('*').eq('document_type','bautagesbericht').order('created_at',{ascending:false});
    if(error){console.warn('Bautagesberichte konnten nicht neu geladen werden',error);return}
    const other=(documents||[]).filter(d=>d.document_type!=='bautagesbericht');
    documents=[...other,...(data||[])];
    try{localStorage.setItem('hp_employee_bautage_cache',JSON.stringify(data||[]))}catch{}
    if(originalRender)originalRender();
  }finally{reloading=false}
}
window.hpReloadOwnReports=reloadOwnReports;
function restoreCache(){
  if(!isEmployee())return;
  try{
    const cached=JSON.parse(localStorage.getItem('hp_employee_bautage_cache')||'[]');
    if(!Array.isArray(cached)||!cached.length)return;
    const other=(documents||[]).filter(d=>d.document_type!=='bautagesbericht');
    const live=(documents||[]).filter(d=>d.document_type==='bautagesbericht');
    const map=new Map([...cached,...live].map(x=>[String(x.id),x]));
    documents=[...other,...map.values()];
    if(originalRender)originalRender();
  }catch{}
}
function patchReportForm(){
  const t=document.getElementById('btTemp');
  if(t){t.type='text';t.inputMode='text';t.placeholder='z. B. -5';t.setAttribute('autocomplete','off')}
  const f=document.querySelector('#modalBody input[type="file"]');
  if(f){f.removeAttribute('capture');f.setAttribute('accept','image/*,application/pdf,.pdf');f.multiple=true}
}
function refreshEmployeeReports(){if(!isEmployee())return;restoreCache();setTimeout(reloadOwnReports,10)}
function install(){
  originalRender=window.renderBautagesberichte||null;
  const oldOpen=window.openBautagesbericht;
  if(oldOpen&&!oldOpen._hpBautageFix){const op=function(id=''){oldOpen(id);setTimeout(patchReportForm,40);setTimeout(patchReportForm,180)};op._hpBautageFix=1;window.openBautagesbericht=op}
  const oldShow=window.showView;
  if(oldShow&&!oldShow._hpBautagePersistence){const sh=function(id){const r=oldShow(id);if((id==='bautage'||id==='projects')&&isEmployee())refreshEmployeeReports();return r};sh._hpBautagePersistence=1;window.showView=sh}
  refreshEmployeeReports();
  window.addEventListener('pageshow',refreshEmployeeReports);
  window.addEventListener('focus',refreshEmployeeReports);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEmployeeReports()});
}
setTimeout(install,900);
})();