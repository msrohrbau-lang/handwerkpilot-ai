module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const clean=v=>String(v||'').replace(/\s+/g,'');
    const url='https://dbaiwcqoigqgknmtctwl.supabase.co';
    const key=clean(process.env.SUPABASE_ANON_KEY);
    if(!key) return res.status(500).json({error:'Cloud-Konfiguration fehlt.'});
    const {action,email,password,company,name}=req.body||{};
    if(!email||!password) return res.status(400).json({error:'E-Mail und Passwort fehlen.'});
    let endpoint,body;
    if(action==='signup'){
      if(!company||!name) return res.status(400).json({error:'Firmenname und Name fehlen.'});
      endpoint=url+'/auth/v1/signup';
      body={email,password,data:{company_name:company,full_name:name}};
    }else{
      endpoint=url+'/auth/v1/token?grant_type=password';
      body={email,password};
    }
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key},body:JSON.stringify(body)});
    const text=await r.text();
    let data={}; try{data=JSON.parse(text)}catch{data={message:text}}
    if(!r.ok) return res.status(r.status).json({error:data.msg||data.message||data.error_description||data.error||'Anmeldung fehlgeschlagen.'});
    return res.status(200).json({ok:true,user:data.user||null,access_token:data.access_token||null,refresh_token:data.refresh_token||null,expires_in:data.expires_in||3600,expires_at:data.expires_at||null,token_type:data.token_type||'bearer'});
  }catch(e){return res.status(500).json({error:e.message||'Serverfehler'});}
};