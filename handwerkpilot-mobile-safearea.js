(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .sheet-head{top:0!important;padding-top:12px!important;}
    @media(max-width:620px){
      /* The browser chrome cannot be controlled by the web app. Save the same
         vertical space inside HandwerkPilot by removing the large app header. */
      .app>.top{display:none!important;}
      .app{padding-top:6px!important;}
      .sheet{max-height:calc(100dvh - 145px)!important;}
      .sheet-head{top:0!important;padding-top:12px!important;}
    }
  `;
  document.head.appendChild(style);
})();
