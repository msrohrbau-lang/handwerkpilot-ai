(()=>{
  const PROVIDER_KEY='hp_accounting_provider';
  const WISO_KEY='hp_wiso_ownership';
  const LEX_KEY='hp_lexware_key';
  const getProvider=()=>localStorage.getItem(PROVIDER_KEY)||'lexware';
  const setProvider=p=>localStorage.setItem(PROVIDER_KEY,p);
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function importWisoCallback(){
    try{
      const u=new URL(location.href),iid=(u.searchParams.get('iid')||'').trim();
      if(!iid)return;
      localStorage.setItem(PROVIDER_KEY,'wiso');
      localStorage.setItem(WISO_KEY,iid);
      u.searchParams.delete('iid');u.searchParams.delete('accounting');
      history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
    }catch(_){ }
  }

  function styleAccounting(){
    if(document.getElementById('hp-accounting-style'))return;
    const st=document.createElement('style');st.id='hp-accounting-style';st.textContent='.hp-provider-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hp-provider{border:2px solid #dbe2ea;background:#fff;border-radius:16px;padding:14px;text-align:left;font-weight:900}.hp-provider.active{border-color:#0f172a;background:#f8fafc}.hp-provider small{display:block;color:#667085;font-weight:500;margin-top:4px}.hp-setup{margin-top:14px}.hp-note{font-size:12px;color:#667085;line-height:1.45}.hp-badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#eef2f6;font-size:11px;font-weight:850;margin-left:6px}@media(max-width:560px){.hp-provider-grid{grid-template-columns:1fr}}';document.head.appendChild(st);
  }

  function renameNavigation(){
    qa('.tile').forEach(b=>{if(/WISO|MeinBüro/i.test(b.textContent)){b.innerHTML='📚 Buchhaltung<small>Lexware Office oder WISO MeinBüro einmal einrichten.</small>';b.onclick=()=>showView('wiso')}});
    qa('.bottom button').forEach(b=>{if(/WISO|Buchhaltung/i.test(b.textContent)){b.innerHTML='<span>📚</span>Buchhaltung';b.onclick=()=>showView('wiso')}});
  }

  function renderAccounting(){
    const box=document.getElementById('wiso');if(!box)return;
    const p=getProvider();
    box.innerHTML='<div class="card"><h2 style="margin-top:0">Buchhaltung einrichten</h2><p class="tiny">Einmal auswählen, danach verwendet HandwerkPilot automatisch dieses System.</p><div class="hp-provider-grid"><button id="hpLexChoice" class="hp-provider '+(p==='lexware'?'active':'')+'" onclick="selectAccountingProvider(\'lexware\')">Lexware Office<small>Rechnungen direkt als Entwurf übertragen.</small></button><button id="hpWisoChoice" class="hp-provider '+(p==='wiso'?'active':'')+'" onclick="selectAccountingProvider(\'wiso\')">WISO MeinBüro <span class="hp-badge">Beta</span><small>Verbindung speichern und testen.</small></button></div><div id="hpAccountingSetup" class="hp-setup"></div></div>';
    renderProviderSetup();
  }

  window.selectAccountingProvider=function(p){setProvider(p);renderAccounting();};

  function renderProviderSetup(){
    const p=getProvider(),host=document.getElementById('hpAccountingSetup');if(!host)return;
    if(p==='lexware'){
      host.innerHTML='<label>Lexware API-Key</label><input id="hpLexKey" type="password" autocomplete="off" placeholder="API-Key eingeben"><div class="actions"><button class="btn primary" onclick="saveAccountingSetup()">Auswahl speichern</button><button class="btn secondary" onclick="testAccountingConnection()">Verbindung testen</button></div><p class="hp-note">Lexware ist für die Rechnungsübertragung bereits freigeschaltet.</p><div id="hpAccountingStatus" class="status"></div>';
      const saved=sessionStorage.getItem(LEX_KEY)||localStorage.getItem(LEX_KEY)||'';if(saved)document.getElementById('hpLexKey').value=saved;
    }else{
      host.innerHTML='<label>WISO Ownership-ID</label><input id="hpWisoOwnership" placeholder="Ownership-ID"><div class="actions"><button class="btn primary" onclick="saveAccountingSetup()">Auswahl speichern</button><button class="btn secondary" onclick="testAccountingConnection()">Verbindung testen</button></div><p class="hp-note">Die WISO-Auswahl und Ownership-ID werden dauerhaft auf diesem Gerät gespeichert.</p><div id="hpAccountingStatus" class="status"></div>';
      document.getElementById('hpWisoOwnership').value=localStorage.getItem(WISO_KEY)||'';
    }
  }

  window.saveAccountingSetup=function(){
    const p=getProvider(),s=document.getElementById('hpAccountingStatus');
    if(p==='lexware'){
      const k=(document.getElementById('hpLexKey')?.value||'').trim();if(!k){s.textContent='Bitte API-Key eingeben.';return}
      sessionStorage.setItem(LEX_KEY,k);localStorage.setItem(LEX_KEY,k);s.textContent='✓ Lexware als Buchhaltung gespeichert.';s.className='status ok';
    }else{
      const id=(document.getElementById('hpWisoOwnership')?.value||'').trim();if(!id){s.textContent='Bitte Ownership-ID eingeben.';return}
      localStorage.setItem(WISO_KEY,id);s.textContent='✓ WISO MeinBüro als Buchhaltung gespeichert.';s.className='status ok';
    }
  };

  window.testAccountingConnection=async function(){
    const p=getProvider(),s=document.getElementById('hpAccountingStatus');try{
      s.textContent='Verbindung wird geprüft …';
      if(p==='lexware'){
        const k=(document.getElementById('hpLexKey')?.value||localStorage.getItem(LEX_KEY)||'').trim();if(!k)throw new Error('Bitte API-Key eingeben.');sessionStorage.setItem(LEX_KEY,k);localStorage.setItem(LEX_KEY,k);
        if(typeof window.lexwareCall!=='function')throw new Error('Lexware-Schnittstelle ist nicht geladen.');const d=await window.lexwareCall('profile');s.textContent='✓ Verbunden mit '+(d.profile?.companyName||d.profile?.userEmail||'Lexware Office');s.className='status ok';
      }else{
        const ownershipId=(document.getElementById('hpWisoOwnership')?.value||localStorage.getItem(WISO_KEY)||'').trim();if(!ownershipId)throw new Error('Bitte Ownership-ID eingeben.');localStorage.setItem(WISO_KEY,ownershipId);
        const token=session?.access_token;if(!token)throw new Error('Bitte erneut bei HandwerkPilot anmelden.');const r=await fetch('/api/wiso',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action:'status',ownershipId})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'WISO-Verbindung fehlgeschlagen.');s.textContent='✓ WISO MeinBüro verbunden.';s.className='status ok';
      }
    }catch(e){s.textContent=e.message;s.className='status';}
  };

  const oldLexCall=window.lexwareCall;
  if(oldLexCall){window.lexwareCall=async function(action,payload={}){let k=(document.getElementById('lexwareKey')?.value||document.getElementById('hpLexKey')?.value||sessionStorage.getItem(LEX_KEY)||localStorage.getItem(LEX_KEY)||'').trim();if(!k)throw new Error('Bitte zuerst Lexware unter Buchhaltung verbinden.');sessionStorage.setItem(LEX_KEY,k);return oldLexCall(action,payload);};}

  window.syncInvoiceAccounting=async function(id){
    const p=getProvider();
    if(p==='lexware')return window.syncInvoiceLexware(id);
    alert('WISO MeinBüro ist verbunden. Die direkte Rechnungsübertragung wird als nächster Schritt freigeschaltet.');
  };

  const oldCard=window.hpDocCard;
  if(oldCard)window.hpDocCard=function(d){let html=oldCard(d);if(d.document_type==='rechnung')html=html.replace(/onclick="syncInvoiceLexware\('([^']+)'\)">→ Lexware/g,'onclick="syncInvoiceAccounting(\'$1\')">→ Buchhaltung');return html;};
  const oldOpen=window.openExistingDoc;
  if(oldOpen)window.openExistingDoc=function(id){oldOpen(id);setTimeout(()=>{qa('#modalBody button').forEach(b=>{if(/Lexware/.test(b.textContent)){b.textContent='→ Buchhaltung';b.onclick=()=>syncInvoiceAccounting(id)}})},0);};

  const oldShow=window.showView;
  if(oldShow)window.showView=function(id){oldShow(id);if(id==='wiso')renderAccounting();};

  importWisoCallback();styleAccounting();renameNavigation();renderAccounting();
})();