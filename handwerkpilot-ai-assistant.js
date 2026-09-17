(()=> {
  const KEY='hp_ai_assistant_draft';
  const getKey=()=>session?.user?.id?KEY+':'+session.user.id:'';
  const read=()=>{try{const key=getKey();return key?String(localStorage.getItem(key)||''):''}catch(_){return ''}};
  const save=text=>{try{const key=getKey();if(key)localStorage.setItem(key,String(text||''))}catch(_){}};
  const clear=()=>{try{const key=getKey();if(key)localStorage.removeItem(key)}catch(_){}};

  function install(){
    const out=document.getElementById('aiOut');
    if(!out||out.dataset.hpAssistantReady)return;
    out.dataset.hpAssistantReady='1';
    out.style.whiteSpace='normal';

    function show(text){
      const value=String(text||'').trim();
      if(!value){out.classList.add('hidden');out.replaceChildren();return}
      out.replaceChildren();
      const editor=document.createElement('textarea');
      editor.className='hp-ai-editor';
      editor.value=value;
      editor.setAttribute('aria-label','KI-Text bearbeiten');
      editor.addEventListener('input',()=>save(editor.value));

      const actions=document.createElement('div');
      actions.className='actions hp-ai-actions';
      const copy=document.createElement('button');
      copy.type='button'; copy.className='btn secondary'; copy.textContent='⧉ Kopieren';
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(editor.value);copy.textContent='✓ Kopiert';setTimeout(()=>copy.textContent='⧉ Kopieren',1300)}catch(_){editor.select();document.execCommand('copy');copy.textContent='✓ Kopiert';setTimeout(()=>copy.textContent='⧉ Kopieren',1300)}};
      const remove=document.createElement('button');
      remove.type='button'; remove.className='btn danger'; remove.textContent='🗑 Löschen';
      remove.onclick=()=>{clear();out.replaceChildren();out.classList.add('hidden')};
      actions.append(copy,remove);
      out.append(editor,actions);
      out.classList.remove('hidden');
      save(value);
    }

    window.hpAiAssistantShow=show;
    const originalAsk=window.askAI;
    if(typeof originalAsk==='function'&&!originalAsk._hpDrafts){
      async function askWithDraft(){await originalAsk.apply(this,arguments);const text=(out.textContent||'').trim();if(text&&text!=='KI arbeitet …')show(text)}
      askWithDraft._hpDrafts=true;
      window.askAI=askWithDraft;
    }
    const draft=read();
    if(draft)show(draft);
  }

  function addStyle(){
    if(document.getElementById('hp-ai-assistant-style'))return;
    const style=document.createElement('style');
    style.id='hp-ai-assistant-style';
    style.textContent='.hp-ai-editor{display:block;width:100%;min-height:180px;border:0;border-radius:0;background:#fafbfd;padding:14px;resize:vertical;line-height:1.5}.hp-ai-editor:focus{outline:2px solid #93b4ff;outline-offset:-2px}.hp-ai-actions{padding:10px;border-top:1px solid #dbe2ea;margin:0;background:#fff}';
    document.head.appendChild(style);
  }

  addStyle();
  setTimeout(install,100);
  setTimeout(install,700);
  setTimeout(install,1500);
})();