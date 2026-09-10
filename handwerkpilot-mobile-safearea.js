(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .sheet-head{top:0!important;padding-top:12px!important;}
    @media(max-width:620px){
      .sheet{max-height:calc(100dvh - 145px)!important;}
      .sheet-head{top:0!important;padding-top:12px!important;}
    }
  `;
  document.head.appendChild(style);
})();
