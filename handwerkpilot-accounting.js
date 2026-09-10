(()=>{
  const PROVIDER_KEY='hp_accounting_provider';
  const WISO_KEY='hp_wiso_ownership';
  const LEX_KEY='hp_lexware_key';
  const WISO_CALLBACK_KEY='hp_wiso_callback_fresh';
  const getProvider=()=>localStorage.getItem(PROVIDER_KEY)||'lexware';
  const setProvider=p=>localStorage.setItem(PROVIDER_KEY,p);
  const qa=s=>[...document.querySelectorAll(s)];

  function importWisoCallback(){
    try{
      const u=new URL(location.href),iid=(u.searchParams.get('iid')||'').trim();
      const isCallback=u.searchParams.get('wiso_callback')==='1'||u.searchParams.get('accounting')==='wiso';
      if(!iid)return;
      localStorage.setItem(PROVIDER_KEY,'wiso');
      localStorage.setItem(WISO_KEY,iid);
      if(isCallback)sessionStorage.setItem(WISO_CALLBACK_KEY,iid);
      u.searchParams.delete('iid');u.searchParams.delete('accounting');u.searchParams.delete('wiso_callback');
      history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
      setTimeout(()=>{
        const input=document.getElementById('hpWisoOwnership');
        if(input)input.value=iid;
        const s=document.getElementById('hpAccountingStatus');
        if(s){s.textContent='✓ Neue WISO-Verbindung übernommen.';s.className='status ok';}
      },0);
    }catch(_){ }
  }

  function styleAccounting(){
    if(document.getElementById('hp-accounting-style'))return;
    const st=document.createElement('style');st.id='hp-accounting-style';st.textContent='.hp-provider-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hp-provider{border:2px solid #dbe2ea;background:#fff;border-radius:16px;padding:14px;text-align:left;font-weight:900}.hp-provider.active{border-color:#0f172a;background:#f8fafc}.hp-provider small{display:block;color:#667085;font-weight:500;margin-top:4px}.hp-setup{margin-top:14px}.hp-note{font-size:12px;color:#667085;line-height:1.45}.hp-badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#e8f7ef;color:#087f5b;font-size:11px;font-weight:850;margin-left:6px}@media(max-width:560px){.hp-provider-grid{grid-template-columns:1fr}}';document.head.appendChild(st);
  }

  function renameNavigation(){
    qa('.tile').forEach(b=>{if(/WISO|MeinBüro/i.test(b.textContent)){b.innerHTML='📚 Buchhaltung<small>Lexware Office oder WISO MeinBüro einmal einrichten.</small>';b.onclick=()=>showView('wiso')}});
    qa('.bottom button').forEach(b=>{if(/WISO|Buchhaltung/i.test(b.textContent)){b.innerHTML='<span>📚</span>Buchhaltung';b.onclick=()=>showView('wiso')}});
  }

  function renderAccounting(){
    const box=document.getElementById('wiso');if(!box)return;
    const p=getProvider();
    box.innerHTML='<div class="card"><h2 style="margin-top:0">Buchhaltung einrichten</h2><p class="tiny">Einmal auswählen, danach verwendet HandwerkPilot automatisch dieses System.</p><div class="hp-provider-grid"><button id="hpLexChoice" class="hp-provider '+(p==='lexware'?'active':'')+'" onclick="selectAccountingProvider(\'lexware\')">Lexware Office<small>Rechnungen direkt übertragen.</small></button><button id="hpWisoChoice" class="hp-provider '+(p==='wiso'?'active':'')+'" onclick="selectAccountingProvider(\'wiso\')">WISO MeinBüro <span class="hp-badge">Direktübertragung</span><small>Kunde, Auftrag und Rechnung automatisch anlegen.</small></button></div><div id="hpAccountingSetup" class="hp-setup"></div></div>';
    renderProviderSetup();
  }

  window.selectAccountingProvider=function(p){setProvider(p);renderAccounting();};

  function renderProviderSetup(){
    const p=getProvider(),host=document.getElementById('hpAccountingSetup');if(!host)return;
    if(p==='lexware'){
      host.innerHTML='<label>Lexware API-Key</label><input id="hpLexKey" type="password" autocomplete="off" placeholder="API-Key eingeben"><div class="actions"><button class="btn primary" onclick="saveAccountingSetup()">Auswahl speichern</button><button class="btn secondary" onclick="testAccountingConnection()">Verbindung testen</button></div><p class="hp-note">Lexware ist für die Rechnungsübertragung freigeschaltet.</p><div id="hpAccountingStatus" class="status"></div>';
      const saved=sessionStorage.getItem(LEX_KEY)||localStorage.getItem(LEX_KEY)||'';if(saved)document.getElementById('hpLexKey').value=saved;
    }else{
      host.innerHTML='<label>WISO Ownership-ID</label><input id="hpWisoOwnership" placeholder="Ownership-ID"><div class="actions"><button class="btn primary" onclick="saveAccountingSetup()">Auswahl speichern</button><button class="btn secondary" onclick="testAccountingConnection()">Verbindung testen</button></div><p class="hp-note">Nach erfolgreicher Verbindung kannst du jede Rechnung mit einem Klick an WISO MeinBüro übergeben.</p><div id="hpAccountingStatus" class="status"></div>';
      document.getElementById('hpWisoOwnership').value=localStorage.getItem(WISO_KEY)||'';
      const fresh=sessionStorage.getItem(WISO_CALLBACK_KEY)||'';
      if(fresh){const s=document.getElementById('hpAccountingStatus');if(s){s.textContent='✓ Neue WISO-Verbindung übernommen.';s.className='status ok';}}
    }
  }

  window.saveAccountingSetup=function(){
    const p=getProvider(),s=document.getElementById('hpAccountingStatus');
    if(p==='lexware'){
      const k=(document.getElementById('hpLexKey')?.value||'').trim();if(!k){s.textContent='Bitte API-Key eingeben.';return}
      sessionStorage.setItem(LEX_KEY,k);localStorage.setItem(LEX_KEY,k);s.textContent='✓ Lexware als Buchhaltung gespeichert.';s.className='status ok';
    }else{
      const id=(document.getElementById('hpWisoOwnership')?.value||'').trim();if(!id){s.textContent='Bitte Ownership-ID eingeben.';return}
      localStorage.setItem(WISO_KEY,id);sessionStorage.removeItem(WISO_CALLBACK_KEY);s.textContent='✓ WISO MeinBüro als Buchhaltung gespeichert.';s.className='status ok';
    }
  };

  async function getFreshAccessToken(){
    try{
      if(typeof sb==='undefined'||!sb?.auth)return '';
      const {data,error}=await sb.auth.getSession();
      if(error)return '';
      if(data?.session){try{session=data.session}catch(_){ } return data.session.access_token||'';}
      return '';
    }catch(_){return ''}
  }

  async function getCurrentWisoOwnership(){
    let id=(localStorage.getItem(WISO_KEY)||'').trim();
    try{
      if(typeof sb!=='undefined'&&sb?.auth){
        const {data,error}=await sb.auth.getUser();
        if(!error){
          const cloud=String(data?.user?.user_metadata?.hp_wiso_ownership||'').trim();
          if(cloud){id=cloud;localStorage.setItem(WISO_KEY,cloud);localStorage.setItem(PROVIDER_KEY,'wiso');}
        }
      }
    }catch(_){ }
    return id;
  }

  async function wisoCall(action,payload={}){
    const ownershipId=await getCurrentWisoOwnership();
    if(!ownershipId)throw new Error('Bitte zuerst WISO MeinBüro unter Buchhaltung verbinden.');
    const token=await getFreshAccessToken();
    if(!token)throw new Error('Bitte erneut bei HandwerkPilot anmelden.');
    const r=await fetch('/api/wiso',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action,ownershipId,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'WISO-Verbindung fehlgeschlagen.');
    return d;
  }

  window.testAccountingConnection=async function(){
    const p=getProvider(),s=document.getElementById('hpAccountingStatus');try{
      s.textContent='Verbindung wird geprüft …';
      if(p==='lexware'){
        const k=(document.getElementById('hpLexKey')?.value||localStorage.getItem(LEX_KEY)||'').trim();if(!k)throw new Error('Bitte API-Key eingeben.');sessionStorage.setItem(LEX_KEY,k);localStorage.setItem(LEX_KEY,k);
        if(typeof window.lexwareCall!=='function')throw new Error('Lexware-Schnittstelle ist nicht geladen.');const d=await window.lexwareCall('profile');s.textContent='✓ Verbunden mit '+(d.profile?.companyName||d.profile?.userEmail||'Lexware Office');s.className='status ok';
      }else{
        const id=(document.getElementById('hpWisoOwnership')?.value||'').trim();if(id)localStorage.setItem(WISO_KEY,id);
        await wisoCall('status');
        const current=await getCurrentWisoOwnership();
        if(typeof window.hpSaveWisoToCloud==='function')await window.hpSaveWisoToCloud(current);
        sessionStorage.removeItem(WISO_CALLBACK_KEY);
        s.textContent='✓ WISO MeinBüro verbunden. Rechnungsübertragung ist bereit.';s.className='status ok';
      }
    }catch(e){s.textContent=e.message;s.className='status';}
  };

  const oldLexCall=window.lexwareCall;
  if(oldLexCall){window.lexwareCall=async function(action,payload={}){let k=(document.getElementById('lexwareKey')?.value||document.getElementById('hpLexKey')?.value||sessionStorage.getItem(LEX_KEY)||localStorage.getItem(LEX_KEY)||'').trim();if(!k)throw new Error('Bitte zuerst Lexware unter Buchhaltung verbinden.');sessionStorage.setItem(LEX_KEY,k);return oldLexCall(action,payload);};}

  window.syncInvoiceAccounting=async function(id){
    const p=getProvider();
    if(p==='lexware')return window.syncInvoiceLexware(id);
    try{
      const doc=(typeof documents!=='undefined'&&Array.isArray(documents))?documents.find(x=>String(x.id)===String(id)):null;
      if(!doc)throw new Error('Rechnung wurde nicht gefunden.');
      if(doc.document_type!=='rechnung')throw new Error('Nur Rechnungen können übertragen werden.');
      const cid=doc.customer_id||doc.payload?.customer_id||'';
      const customer=(typeof customers!=='undefined'&&Array.isArray(customers))?customers.find(x=>String(x.id)===String(cid)):null;
      const fallbackName=doc.payload?.customer_name||'';
      if(!customer&&!fallbackName)throw new Error('Für diese Rechnung ist kein Kunde hinterlegt.');
      const btn=[...document.querySelectorAll('button')].find(b=>b.getAttribute('onclick')?.includes(`syncInvoiceAccounting('${id}')`));
      if(btn){btn.disabled=true;btn.textContent='Übertragung …';}
      const result=await wisoCall('syncInvoice',{document:doc,customer:customer||{name:fallbackName,street:'',city:doc.payload?.customer_address||''}});
      if(btn){btn.disabled=false;btn.textContent='✓ In WISO';}
      alert('✓ Rechnung wurde an WISO MeinBüro übertragen'+(result.invoiceId?` (ID ${result.invoiceId})`:'')+'.');
      return result;
    }catch(e){
      qa('button').forEach(b=>{if(b.disabled&&/Übertragung/.test(b.textContent)){b.disabled=false;b.textContent='→ Buchhaltung';}});
      alert('WISO: '+e.message);throw e;
    }
  };

  const oldCard=window.hpDocCard;
  if(oldCard)window.hpDocCard=function(d){let html=oldCard(d);if(d.document_type==='rechnung')html=html.replace(/onclick="syncInvoiceLexware\('([^']+)'\)">→ Lexware/g,'onclick="syncInvoiceAccounting(\'$1\')">→ Buchhaltung');return html;};
  const oldOpen=window.openExistingDoc;
  if(oldOpen)window.openExistingDoc=function(id){oldOpen(id);setTimeout(()=>{qa('#modalBody button').forEach(b=>{if(/Lexware/.test(b.textContent)){b.textContent='→ Buchhaltung';b.onclick=()=>syncInvoiceAccounting(id)}})},0);};

  const oldShow=window.showView;
  if(oldShow)window.showView=function(id){oldShow(id);if(id==='wiso')renderAccounting();};

  importWisoCallback();styleAccounting();renameNavigation();renderAccounting();
})();