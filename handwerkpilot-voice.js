(()=>{
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const css=document.createElement('style');css.textContent=`
.hp-voice-fab{position:fixed;right:14px;bottom:92px;z-index:45;width:58px;height:58px;border:0;border-radius:50%;background:#0f172a;color:#fff;font-size:25px;box-shadow:0 10px 28px rgba(15,23,42,.28)}
.hp-voice-fab.listening{animation:hpPulse 1s infinite;background:#b42318}.hp-voice-status{position:fixed;left:12px;right:82px;bottom:101px;z-index:44;background:#fff;border:1px solid #dbe2ea;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:750;box-shadow:0 8px 22px rgba(15,23,42,.12)}
.hp-voice-inline{border:0;border-radius:11px;padding:8px 10px;background:#eef2f6;font-weight:850;margin-top:6px}.hp-voice-row{display:flex;gap:7px;align-items:end}.hp-voice-row>div{flex:1}
@keyframes hpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
`;document.head.appendChild(css);
let recognition=null,target=null,lastActive=null;
document.addEventListener('focusin',ev=>{if(ev.target.matches('input:not([type=button]):not([type=submit]),textarea'))lastActive=ev.target});
function status(t,hide=true){let x=document.getElementById('hpVoiceStatus');if(!x){x=document.createElement('div');x.id='hpVoiceStatus';x.className='hp-voice-status hidden';document.body.appendChild(x)}x.textContent=t;x.classList.remove('hidden');if(hide)setTimeout(()=>x.classList.add('hidden'),2600)}
function fire(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus()}
function append(el,text){if(!el)return;const sep=el.value&&/textarea/i.test(el.tagName)?' ':'';el.value=(el.value||'')+sep+text;fire(el)}
function editTarget(el,text){const t=text.toLowerCase().trim();
 if(/^(alles |den |diesen )?(text )?(wieder )?(löschen|leeren)( bitte)?$/.test(t)||t==='alles weg'||t==='text weg'){el.value='';fire(el);status('Text gelöscht.');return true}
 if(t.includes('letztes wort löschen')||t.includes('letzte wort löschen')){el.value=(el.value||'').trim().replace(/\s*\S+\s*$/,'');fire(el);status('Letztes Wort gelöscht.');return true}
 if(t.includes('letzten satz löschen')||t.includes('letzte satz löschen')){el.value=(el.value||'').trim().replace(/(^|[.!?]\s+)[^.!?]*[.!?]?$/,'$1').trim();fire(el);status('Letzten Satz gelöscht.');return true}
 if(t==='neue zeile'||t==='zeilenumbruch'){el.value=(el.value||'')+'\n';fire(el);status('Neue Zeile.');return true}
 return false}
function command(text){const t=text.toLowerCase().trim();
 if(t.includes('neuer bautagesbericht')||t.includes('neuen bautagesbericht')||t.includes('bautagesbericht erstellen')||t.includes('neuer bericht')||t.includes('bericht erstellen')){showView('bautage');setTimeout(()=>openBautagesbericht(),100);status('Neuer Bautagesbericht.');return}
 if(t.includes('neue rechnung')||t.includes('rechnung erstellen')){openDoc('rechnung');status('Neue Rechnung geöffnet.');return}
 if(t.includes('bautagesbericht')||t.includes('bautage')){showView('bautage');status('Bautagesberichte geöffnet.');return}
 if(t.includes('rechnung')){showView('docs');docFilter='rechnung';renderDocs();status('Rechnungen geöffnet.');return}
 if(t.includes('kunde')){showView('crm');status('Kunden geöffnet.');return}
 if(t.includes('vorgang')||t.includes('vorgänge')||t.includes('aufträge')||t.includes('angebote')){showView('docs');status('Vorgänge geöffnet.');return}
 if(t.includes('buchhaltung')||t.includes('wiso')){showView('wiso');status('Buchhaltung geöffnet.');return}
 if(t.includes('start')||t.includes('hauptmenü')){showView('home');status('Start geöffnet.');return}
 if(lastActive){if(!editTarget(lastActive,text)){append(lastActive,text);status('Text eingefügt.')}return}
 status('Nicht verstanden: „'+text+'“');
}
function start(el=null){if(!SR){status('Spracherkennung wird von diesem Browser nicht unterstützt.',false);return}target=el||null;recognition=new SR();recognition.lang='de-DE';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;recognition.onstart=()=>{document.getElementById('hpVoiceFab')?.classList.add('listening');status(target?'Sprich jetzt …':'Sprachbefehl: z. B. „Neuer Bautagesbericht“',false)};recognition.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';if(target){if(!editTarget(target,text))append(target,text)}else command(text)};recognition.onerror=e=>{const map={not_allowed:'Mikrofonzugriff nicht erlaubt.',no_speech:'Ich habe nichts gehört.',audio_capture:'Kein Mikrofon verfügbar.'};status(map[e.error]||'Spracherkennung konnte nicht gestartet werden.');};recognition.onend=()=>{document.getElementById('hpVoiceFab')?.classList.remove('listening');setTimeout(()=>document.getElementById('hpVoiceStatus')?.classList.add('hidden'),1600)};try{recognition.start()}catch(e){status('Spracherkennung ist bereits aktiv.')}}
window.hpVoice=()=>start(lastActive&&document.activeElement===lastActive?lastActive:null);
window.hpVoiceTo=id=>{const el=document.getElementById(id);if(el)start(el)};
function addFab(){if(document.getElementById('hpVoiceFab'))return;const b=document.createElement('button');b.id='hpVoiceFab';b.className='hp-voice-fab';b.type='button';b.title='Sprachsteuerung';b.textContent='🎤';b.onclick=()=>window.hpVoice();document.body.appendChild(b)}
function addInline(){document.querySelectorAll('textarea').forEach(el=>{if(el.dataset.hpVoice)return;el.dataset.hpVoice='1';const b=document.createElement('button');b.type='button';b.className='hp-voice-inline';b.textContent='🎤 Diktieren';b.onclick=()=>start(el);el.insertAdjacentElement('afterend',b)})}
const mo=new MutationObserver(()=>addInline());
function install(){addFab();addInline();mo.observe(document.body,{childList:true,subtree:true});const grid=document.querySelector('#home .grid');if(grid&&!grid.querySelector('[data-hp-voice]')){const b=document.createElement('button');b.className='tile';b.dataset.hpVoice='1';b.onclick=()=>start();b.innerHTML='🎤 Sprachsteuerung<small>Navigation und Texte per Sprache steuern.</small>';grid.appendChild(b)}}
setTimeout(install,0);
})();