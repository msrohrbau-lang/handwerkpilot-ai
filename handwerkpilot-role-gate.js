(()=>{
function reveal(){document.body.classList.remove('hp-role-loading')}
function isEmployee(){try{return String(profile?.role||'')==='employee'}catch{return false}}
function applyEmployee(){
  if(!isEmployee())return false;
  document.querySelectorAll('#crm,#docs,#wiso,#accounting').forEach(x=>{if(x)x.style.display='none'});
  document.querySelectorAll('#home .card').forEach(c=>{if(c.querySelector('.kpis')||c.querySelector('#aiInput'))c.style.display='none'});
  const hero=document.querySelector('#home .hero');
  if(hero)hero.innerHTML='<div class="pill">Mitarbeiter</div><h1>Meine Baustellen</h1><p>Hier siehst du nur deine zugewiesenen Baustellen und kannst Bautagesberichte erfassen.</p>';
  const grid=document.querySelector('#home .grid');
  if(grid){grid.style.gridTemplateColumns='1fr';grid.innerHTML='<button class="tile" onclick="showView(\'projects\')">🏗️ Meine Baustellen<small>Zugewiesene Baustellen öffnen und Bautagesbericht erstellen.</small></button>'}
  if(document.getElementById('projects')&&typeof showView==='function')showView('projects');
  return true;
}
let tries=0;
const timer=setInterval(()=>{
  tries++;
  let ready=false;
  try{ready=!!profile?.role}catch{}
  if(ready){
    if(isEmployee()){
      applyEmployee();
      setTimeout(()=>{applyEmployee();reveal()},120);
    }else reveal();
    clearInterval(timer);
  }else if(tries>80){reveal();clearInterval(timer)}
},50);
})();