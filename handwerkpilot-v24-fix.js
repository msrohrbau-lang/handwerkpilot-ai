(()=>{
  const style=document.createElement('style');
  style.textContent='.hp-edit-pos-v24{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin:10px 0 14px;padding-bottom:12px;border-bottom:1px solid #eef2f6}.hp-edit-pos-v24 .hp-desc-wrap{grid-column:1/-1}.hp-edit-pos-v24 label{display:block;font-size:12px;font-weight:800;color:#667085;margin:0 0 5px}.hp-edit-pos-v24 input{width:100%}.hp-edit-pos-v24 .hp-remove{align-self:end;height:48px}.hp-edit-pos-v24 .hp-num-wrap{min-width:0}';
  document.head.appendChild(style);

  window.hpRenderEditPositions=function(){
    const box=document.getElementById('hpEditPositions');
    if(!box)return;
    box.innerHTML=positions.map((p,i)=>
      '<div class="hp-edit-pos-v24">'+
        '<div class="hp-desc-wrap"><label>Leistung / Beschreibung</label><input type="text" inputmode="text" autocomplete="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="next" placeholder="z. B. Zusatzarbeiten" value="'+esc(p.desc||'')+'" onfocus="this.setAttribute(\'inputmode\',\'text\')" oninput="positions['+i+'].desc=this.value"></div>'+
        '<div class="hp-num-wrap"><label>Menge / Std.</label><input type="number" inputmode="decimal" step="0.01" min="0" placeholder="z. B. 12" value="'+Number(p.qty||0)+'" oninput="positions['+i+'].qty=Number(this.value);hpCalcEdit()"></div>'+
        '<div class="hp-num-wrap"><label>Preis / Einheit €</label><input type="number" inputmode="decimal" step="0.01" min="0" placeholder="z. B. 65" value="'+Number(p.price||0)+'" oninput="positions['+i+'].price=Number(this.value);hpCalcEdit()"></div>'+
        '<button class="hp-remove" type="button" aria-label="Position löschen" onclick="positions.splice('+i+',1);hpRenderEditPositions()">✕</button>'+
      '</div>'
    ).join('');
    window.hpCalcEdit();
  };
})();