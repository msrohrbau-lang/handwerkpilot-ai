(()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function isEmployee(){try{return String(profile?.role||'')==='employee'}catch{return false}}
function reveal(){document.body.classList.remove('hp-role-loading');document.getElementById('hpRoleSplash')?.remove()}
function applyEmployee(){
  if(!isEmployee())return false;
  document.body.classList.add('hp-employee');
  document.querySelectorAll('#crm,#docs,#wiso,#accounting').forEach(x=>{if(x)x.style.display='none'});
  document.querySelectorAll('#home .card').forEach(c=>{if(c.querySelector('.kpis')||c.querySelector('#aiInput'))c.style.display='none'});
  const hero=document.querySelector('#home .hero');
  if(hero)hero.innerHTML='<div class="pill">Mitarbeiter</div><h1>Meine Baustellen</h1><p>Hier siehst du nur deine zugewiesenen Baustellen und kannst Bautagesberichte erfassen.</p>';
  const grid=document.querySelector('#home .grid');
  if(grid){grid.style.gridTemplateColumns='1fr';grid.innerHTML='<button class="tile" onclick="showView(\'projects\')">🏗️ Meine Baustellen<small>Zugewiesene Baustellen öffnen und Bautagesbericht erstellen.</small></button>'}
  return true;
}
(async()=>{
  let ready=false;
  for(let i=0;i<120;i++){try{ready=!!profile?.role}catch{} if(ready)break; await sleep(50)}
  if(!ready){reveal();return}
  if(!isEmployee()){reveal();return}
  applyEmployee();
  for(let i=0;i<60;i++){
    if(document.getElementById('projects')&&typeof showView==='function'){
      try{if(typeof hpLoadTeam==='function')await hpLoadTeam();if(typeof hpRenderProjects==='function')hpRenderProjects()}catch{}
      showView('projects');
      await sleep(80);
      applyEmployee();
      showView('projects');
      reveal();
      return;
    }
    await sleep(50);
  }
  reveal();
})();
})();