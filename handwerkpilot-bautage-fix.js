(()=>{
const isEmployee=()=>{try{return String(profile?.role||'')==='employee'}catch{return false}};
async function reloadOwnReports(){
  if(!isEmployee()||!session?.user?.id||!sb)return;
  const {data,error}=await sb.from('documents').select('*').eq('document_type','bautagesbericht').eq('user_id',session.user.id).order('created_at',{ascending:false});
  if(error){console.warn('Bautagesberichte konnten nicht neu geladen werden',error);return}
  const other=(documents||[]).filter(d=>d.document_type!=='bautagesbericht');
  documents=[...other,...(data||[])];
  if(typeof renderBautagesberichte==='function')renderBautagesberichte();
}
window.hpReloadOwnReports=reloadOwnReports;
function patchReportForm(){const t=document.getElementById('btTemp');if(t){t.type='text';t.inputMode='text';t.placeholder='z. B. -5';t.setAttribute('autocomplete','off')}const f=document.querySelector('#modalBody input[type="file"]');if(f){f.removeAttribute('capture');f.setAttribute('accept','image/*,application/pdf,.pdf');f.multiple=true}}
function install(){
  const oldOpen=window.openBautagesbericht;if(oldOpen&&!oldOpen._hpBautageFix){const op=function(id=''){oldOpen(id);setTimeout(patchReportForm,40);setTimeout(patchReportForm,180)};op._hpBautageFix=1;window.openBautagesbericht=op}
  const oldShow=window.showView;if(oldShow&&!oldShow._hpBautagePersistence){const sh=function(id){const r=oldShow(id);if((id==='bautage'||id==='projects')&&isEmployee())setTimeout(reloadOwnReports,20);return r};sh._hpBautagePersistence=1;window.showView=sh}
  const oldRender=window.renderBautagesberichte;if(oldRender&&!oldRender._hpOwnReports){const rr=function(){if(isEmployee()){reloadOwnReports();return}return oldRender()};rr._hpOwnReports=1;window.renderBautagesberichte=rr}
  if(isEmployee()){reloadOwnReports();setTimeout(reloadOwnReports,800)}
}
setTimeout(install,900);
})();