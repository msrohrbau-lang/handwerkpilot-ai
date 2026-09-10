(()=>{
const PROVIDER='hp_accounting_provider',WISO='hp_wiso_ownership';
const provider=()=>localStorage.getItem(PROVIDER)||'lexware';
async function call(action,payload={}){
  if(provider()!=='wiso')throw new Error('WISO MeinBüro ist nicht als Buchhaltung ausgewählt.');
  let ownershipId=(localStorage.getItem(WISO)||'').trim();
  if(typeof sb==='undefined'||!sb?.auth)throw new Error('Bitte erneut anmelden.');
  try{const u=await sb.auth.getUser(),cloud=String(u?.data?.user?.user_metadata?.hp_wiso_ownership||'').trim();if(cloud){ownershipId=cloud;localStorage.setItem(WISO,cloud)}}catch(_){ }
  if(!ownershipId)throw new Error('WISO ist noch nicht verbunden.');
  const s=await sb.auth.getSession(),token=s?.data?.session?.access_token||'';
  if(!token)throw new Error('Bitte erneut anmelden.');
  const r=await fetch('/api/wiso',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action,ownershipId,...payload})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'WISO-Abgleich fehlgeschlagen.');return d;
}
async function remember(doc,result){
  if(!doc||!result?.invoiceId)return;
  const payload={...(doc.payload||{}),wiso_invoice_id:result.invoiceId,wiso_paid_synced:!!result.paidSynced,wiso_paid_synced_at:result.paidSynced?new Date().toISOString():doc.payload?.wiso_paid_synced_at};
  const r=await sb.from('documents').update({payload}).eq('id',doc.id).select().single();
  if(!r.error)documents=documents.map(x=>x.id===doc.id?r.data:x);
}
window.hpSyncWisoPayment=async function(id,{silent=false}={}){
  const doc=documents.find(x=>String(x.id)===String(id));if(!doc)throw new Error('Rechnung nicht gefunden.');
  if(doc.document_type!=='rechnung'||doc.status!=='paid')throw new Error('Rechnung ist nicht als bezahlt markiert.');
  if(doc.payload?.wiso_paid_synced){if(!silent)alert('✓ Zahlung ist bereits mit WISO abgeglichen.');return{ok:true,already:true}}
  const result=await call('syncPayment',{document:doc,invoiceId:doc.payload?.wiso_invoice_id||null});
  await remember(doc,result);renderDocs();
  if(!silent)alert('✓ Zahlung wurde in WISO MeinBüro als bezahlt verbucht.');return result;
};
const mark0=window.markPaid;
if(mark0)window.markPaid=async function(id){await mark0(id);if(provider()==='wiso'){try{await window.hpSyncWisoPayment(id,{silent:true});alert('✓ Rechnung ist bezahlt – auch in WISO MeinBüro.')}catch(e){alert('Rechnung ist in HandwerkPilot bezahlt. WISO-Abgleich: '+e.message)}}};
const card0=window.hpDocCard;
if(card0)window.hpDocCard=function(d){let h=card0(d);if(provider()==='wiso'&&d.document_type==='rechnung'&&d.status==='paid'&&!d.payload?.wiso_paid_synced){h=h.replace('<button class="btn danger"','<button class="btn green" onclick="hpSyncWisoPayment(\''+d.id+'\')">↻ WISO Zahlung</button><button class="btn danger"')}return h};
function addReconcile(){
  if(provider()!=='wiso')return;const host=document.getElementById('hpAccountingSetup');if(!host||document.getElementById('hpWisoReconcile'))return;
  const box=document.createElement('div');box.id='hpWisoReconcile';box.style.marginTop='14px';box.innerHTML='<button class="btn green" id="hpWisoReconcileBtn">✓ Bezahlte Rechnungen mit WISO abgleichen</button><div id="hpWisoReconcileStatus" class="status"></div>';
  host.appendChild(box);box.querySelector('button').onclick=window.hpReconcileWisoPayments;
}
window.hpReconcileWisoPayments=async function(){
  const btn=document.getElementById('hpWisoReconcileBtn'),st=document.getElementById('hpWisoReconcileStatus'),list=documents.filter(d=>d.document_type==='rechnung'&&d.status==='paid'&&!d.payload?.wiso_paid_synced);if(!list.length){if(st){st.textContent='✓ Alle bezahlten Rechnungen sind bereits abgeglichen.';st.className='status ok'}return}
  if(btn){btn.disabled=true;btn.textContent='Abgleich läuft …'}let ok=0,fail=[];
  for(const d of list){try{await window.hpSyncWisoPayment(d.id,{silent:true});ok++}catch(e){fail.push((d.document_number||'Rechnung')+': '+e.message)}}
  if(btn){btn.disabled=false;btn.textContent='✓ Bezahlte Rechnungen mit WISO abgleichen'}
  if(st){st.textContent=fail.length?`${ok} abgeglichen · ${fail.length} nicht eindeutig: ${fail.join(' | ')}`:`✓ ${ok} bezahlte Rechnung${ok===1?'':'en'} erfolgreich mit WISO abgeglichen.`;st.className=fail.length?'status':'status ok'}
};
const show0=window.showView;if(show0)window.showView=function(id){const r=show0.apply(this,arguments);if(id==='wiso')setTimeout(addReconcile,0);return r};
setTimeout(addReconcile,200);
})();
