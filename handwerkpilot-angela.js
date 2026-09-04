(()=>{
  const style=document.createElement('style');
  style.textContent='.hp-home-mini{border:0;border-radius:12px;padding:10px 12px;font-weight:900;background:#eef2f6;color:#142033}.hp-edit-pos{display:grid;grid-template-columns:1.7fr .55fr .7fr auto;gap:6px;margin-bottom:8px}.hp-remove{border:0;border-radius:10px;padding:9px 10px;background:#fff0ef;color:#b42318;font-weight:900}@media(max-width:620px){.hp-edit-pos{grid-template-columns:1fr 1fr auto}.hp-edit-pos .wide{grid-column:1/-1}}';
  document.head.appendChild(style);
  let hpCustomerId=null;
  const baseShowView=window.showView;
  const baseOpenCustomerForm=window.openCustomerForm;
  const baseOpenDoc=window.openDoc;
  const clean=arr=>(arr||[]).map(p=>({desc:String(p.desc||'').trim(),qty:Number(p.qty||0),price:Number(p.price||0),...(p.unit?{unit:p.unit}:{})})).filter(p=>p.desc||p.price!==0);
  window.cleanHpPositions=clean;
  function fixHeader(backFn){
    const h=document.querySelector('#modal .sheet-head'); if(!h)return;
    const back=h.querySelector('.homebtn');
    if(back){back.textContent='← Zurück';back.onclick=backFn||(()=>{closeModal();baseShowView('docs')});}
    if(!h.querySelector('.hp-home-mini')){
      const x=[...h.querySelectorAll('button')].find(b=>b.textContent.includes('✕'));
      const home=document.createElement('button');home.className='hp-home-mini';home.textContent='🏠';
      home.onclick=()=>{closeModal();hpCustomerId=null;baseShowView('home');window.scrollTo({top:0,behavior:'smooth'})};
      h.insertBefore(home,x||null);
    }
  }
  function backToCustomer(){const id=hpCustomerId;closeModal();if(id){baseShowView('crm');setTimeout(()=>window.openCustomer(id),0)}else baseShowView('docs');}
  window.hpDocCard=function(d){
    const st=d.document_type==='rechnung'?(d.status==='paid'?'<span class="pill paid">bezahlt</span>':'<span class="pill open">offen</span>'):'<span class="pill">'+esc(d.document_type)+'</span>';
    const child=documents.find(x=>x.payload?.source_document_id===d.id);
    let b='<button class="btn secondary" onclick="openExistingDoc(\''+d.id+'\')">✏️ Bearbeiten</button>';
    if(d.document_type==='angebot') b+=child?'<button class="btn green" onclick="openExistingDoc(\''+child.id+'\')">✓ Auftrag erstellt</button>':'<button class="btn secondary" onclick="convertDoc(\''+d.id+'\',\'auftrag\')">→ Auftrag</button>';
    if(d.document_type==='auftrag') b+=child?'<button class="btn green" onclick="openExistingDoc(\''+child.id+'\')">✓ Rechnung erstellt</button>':'<button class="btn blue" onclick="convertDoc(\''+d.id+'\',\'rechnung\')">→ Rechnung</button>';
    if(d.document_type==='rechnung') b+='<button class="btn primary" onclick="syncInvoiceLexware(\''+d.id+'\')">→ Lexware</button>';
    if(d.document_type==='rechnung'&&d.status!=='paid') b+='<button class="btn green" onclick="markPaid(\''+d.id+'\')">✓ Bezahlt</button>';
    b+='<button class="btn danger" onclick="deleteDoc(\''+d.id+'\')">🗑 Löschen</button>';
    return '<div class="item"><div class="row"><div><strong>'+esc(d.title||d.document_type)+' '+esc(d.document_number||'')+'</strong><div class="tiny">'+esc(d.payload?.customer_name||'')+' · '+new Date(d.created_at).toLocaleDateString('de-DE')+'</div><div>'+money(d.total_gross||0)+'</div></div>'+st+'</div><div class="actions">'+b+'</div></div>';
  };
  window.renderDocs=function(){const arr=docFilter==='all'?documents:documents.filter(d=>d.document_type===docFilter);$('docList').innerHTML=arr.length?arr.map(window.hpDocCard).join(''):'<div class="status">Keine Vorgänge.</div>';};
  window.openCustomer=function(id){
    const c=customers.find(x=>x.id===id);if(!c)return;hpCustomerId=id;currentCustomer=c;const rel=relatedDocs(c);
    $('modalTitle').textContent=c.name;
    $('modalBody').innerHTML='<div class="item"><strong>'+esc(c.contact_person||c.name)+'</strong><div class="tiny">'+esc([c.street,c.city].filter(Boolean).join(', '))+'</div><div class="tiny">'+esc(c.phone||'')+' · '+esc(c.email||'')+'</div>'+(c.note?'<p>'+esc(c.note)+'</p>':'')+'</div><div class="actions"><button class="btn secondary" onclick="openCustomerForm(currentCustomer)">Bearbeiten</button><button class="btn primary" onclick="closeModal();openDoc(\'angebot\',\''+c.id+'\')">+ Angebot</button><button class="btn blue" onclick="closeModal();openDoc(\'rechnung\',\''+c.id+'\')">+ Rechnung</button></div><h3>Historie</h3><div class="list">'+(rel.length?rel.map(window.hpDocCard).join(''):'<div class="status">Noch keine Vorgänge.</div>')+'</div>';
    $('modal').classList.remove('hidden');setTimeout(()=>fixHeader(()=>{closeModal();baseShowView('crm')}),0);
  };
  window.openCustomerForm=function(c=null){baseOpenCustomerForm(c);setTimeout(()=>fixHeader(c?backToCustomer:()=>{closeModal();baseShowView('crm')}),0)};
  window.openDoc=function(type,customerId=''){baseOpenDoc(type,customerId);setTimeout(()=>fixHeader(hpCustomerId?backToCustomer:()=>{closeModal();baseShowView('docs')}),0)};
  window.hpRenderEditPositions=function(){const box=$('hpEditPositions');if(!box)return;box.innerHTML=positions.map((p,i)=>'<div class="hp-edit-pos"><input class="wide" placeholder="Leistung" value="'+esc(p.desc||'')+'" oninput="positions['+i+'].desc=this.value"><input type="number" step=".01" value="'+Number(p.qty||0)+'" oninput="positions['+i+'].qty=Number(this.value);hpCalcEdit()"><input type="number" step=".01" value="'+Number(p.price||0)+'" oninput="positions['+i+'].price=Number(this.value);hpCalcEdit()"><button class="hp-remove" onclick="positions.splice('+i+',1);hpRenderEditPositions()">✕</button></div>').join('');window.hpCalcEdit();};
  window.hpCalcEdit=function(){const p=clean(positions),net=p.reduce((s,x)=>s+x.qty*x.price,0),vat=Number(company.vat??19);if($('hpEditSum'))$('hpEditSum').textContent=money(net*(1+vat/100));};
  window.hpAddEditPos=function(){positions.push({desc:'',qty:1,price:0});window.hpRenderEditPositions();};
  window.openExistingDoc=function(id){
    const d=documents.find(x=>x.id===id);if(!d)return;currentDocType=d.document_type;const p=d.payload||{};positions=clean(Array.isArray(p.positions)?JSON.parse(JSON.stringify(p.positions)):[]);if(!positions.length)positions=[{desc:'',qty:1,price:0}];
    $('modalTitle').textContent=(d.title||d.document_type)+' '+(d.document_number||'');
    $('modalBody').innerHTML='<label>Kunde</label><select id="eCustomer">'+customerOpts(p.customer_id||'')+'</select><div class="form"><div><label>Nummer</label><input value="'+esc(d.document_number||'')+'" readonly></div><div><label>Datum</label><input id="eDate" type="date" value="'+esc(p.date||'')+'"></div><div class="full"><label>Baustelle / Betreff</label><input id="eSubject" value="'+esc(p.subject||'')+'"></div></div><h3>Positionen</h3><div id="hpEditPositions"></div><button class="btn secondary" onclick="hpAddEditPos()">+ Position</button><div class="sum" id="hpEditSum">'+money(d.total_gross||0)+'</div><label>Notizen</label><textarea id="eNote">'+esc(p.note||'')+'</textarea><div class="actions"><button class="btn primary" onclick="saveExistingDoc(\''+d.id+'\')">💾 Änderungen speichern</button>'+(d.document_type==='rechnung'?'<button class="btn blue" onclick="syncInvoiceLexware(\''+d.id+'\')">→ Lexware</button>':'')+'<button class="btn danger" onclick="deleteDoc(\''+d.id+'\')">🗑 Löschen</button></div><div id="eStatus" class="status"></div>';
    $('modal').classList.remove('hidden');window.hpRenderEditPositions();setTimeout(()=>fixHeader(hpCustomerId?backToCustomer:()=>{closeModal();baseShowView('docs')}),0);
  };
  window.saveExistingDoc=async function(id){
    const d=documents.find(x=>x.id===id);if(!d)return;const c=customers.find(x=>x.id===$('eCustomer').value),s=$('eStatus');if(!c){s.textContent='Bitte Kunde wählen.';return}
    const pos=clean(positions),net=pos.reduce((a,p)=>a+p.qty*p.price,0),vat=Number(company.vat??19);
    const payload={...(d.payload||{}),customer_id:c.id,customer_name:c.name,customer_address:[c.street,c.city].filter(Boolean).join(', '),date:$('eDate').value,subject:$('eSubject').value.trim(),note:$('eNote').value.trim(),positions:pos};
    const r=await sb.from('documents').update({payload,total_net:net,total_vat:net*vat/100,total_gross:net*(1+vat/100)}).eq('id',id).select().single();
    if(r.error){s.textContent=r.error.message;return}documents=documents.map(x=>x.id===id?r.data:x);positions=pos.length?JSON.parse(JSON.stringify(pos)):[{desc:'',qty:1,price:0}];renderDocs();refresh();window.hpRenderEditPositions();s.textContent='✓ Änderungen gespeichert';s.className='status ok';
  };
  window.convertDoc=async function(id,to){
    const d=documents.find(x=>x.id===id);if(!d)return;const old=documents.find(x=>x.document_type===to&&x.payload?.source_document_id===d.id);if(old){window.openExistingDoc(old.id);return}
    const payload=JSON.parse(JSON.stringify(d.payload||{}));payload.positions=clean(payload.positions);payload.source_document_id=d.id;payload.source_document_number=d.document_number||'';payload.date=new Date().toISOString().slice(0,10);
    const net=payload.positions.reduce((s,p)=>s+p.qty*p.price,0),vat=Number(company.vat??19);
    const row={organization_id:profile.organization_id,user_id:session.user.id,document_type:to,document_number:nextNumber(to),title:to==='auftrag'?'Auftrag':'Rechnung',status:'draft',payload,total_net:net,total_vat:net*vat/100,total_gross:net*(1+vat/100)};
    const r=await sb.from('documents').insert(row).select().single();if(r.error)return alert(r.error.message);documents.unshift(r.data);renderDocs();refresh();window.openExistingDoc(r.data.id);
  };
  const baseSaveDoc=window.saveDoc;
  window.saveDoc=async function(){positions=clean(positions);if(!positions.length)positions=[{desc:'',qty:1,price:0}];return baseSaveDoc();};
  const book=$('wiso');if(book){book.innerHTML='<div class="card"><h2 style="margin-top:0">Buchhaltung</h2><p class="tiny">HandwerkPilot bleibt die Handy-Oberfläche. Rechnungen können direkt an Lexware Office übergeben werden.</p><label>Lexware API-Key</label><input id="lexwareKey" type="password" autocomplete="off" placeholder="API-Key eingeben"><div class="actions"><button class="btn primary" onclick="saveLexwareKey()">Lexware verbinden</button><button class="btn secondary" onclick="testLexware()">Verbindung testen</button></div><div id="lexwareStatus" class="status"></div></div>';}
  window.saveLexwareKey=function(){const k=$('lexwareKey').value.trim(),s=$('lexwareStatus');if(!k){s.textContent='Bitte API-Key eingeben.';return}sessionStorage.setItem('hp_lexware_key',k);s.textContent='API-Key gespeichert.';};
  window.lexwareCall=async function(action,payload={}){const key=($('lexwareKey')?.value||sessionStorage.getItem('hp_lexware_key')||'').trim();if(!key)throw new Error('Bitte zuerst Lexware verbinden.');const r=await fetch('/api/lexware',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,lexwareKey:key,...payload})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Lexware-Fehler');return data;};
  window.testLexware=async function(){const s=$('lexwareStatus');try{s.textContent='Verbindung wird geprüft …';const d=await window.lexwareCall('profile');s.textContent='✓ Verbunden mit '+(d.profile?.companyName||d.profile?.userEmail||'Lexware Office');s.className='status ok';}catch(e){s.textContent=e.message;}};
  window.syncInvoiceLexware=async function(id){try{const d=documents.find(x=>x.id===id),c=customers.find(x=>x.id===d?.payload?.customer_id);if(!d||!c)throw new Error('Kunde oder Rechnung fehlt.');await window.lexwareCall('createInvoice',{customer:{name:c.name,street:c.street,city:c.city,email:c.email},document:{date:d.payload?.date,subject:d.payload?.subject,note:d.payload?.note,positions:clean(d.payload?.positions).map(p=>({...p,unit:p.unit||'Stück'})),vat:Number(company.vat??19)},finalize:false});alert('Rechnung wurde als Entwurf an Lexware übertragen.');}catch(e){alert(e.message);}};
  document.querySelectorAll('.bottom button').forEach(b=>{if(b.textContent.includes('WISO'))b.innerHTML='<span>📚</span>Buchhaltung'});
})();