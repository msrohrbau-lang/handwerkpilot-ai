module.exports = async function handler(req,res){
  try{
    const clean=v=>String(v||'').replace(/\s+/g,'');
    const url='https://dbaiwcqoigqgknmtctwl.supabase.co';
    const key=clean(process.env.SUPABASE_ANON_KEY);
    const out={urlPresent:!!url,keyPresent:!!key,urlHost:null,keyPrefix:key?key.slice(0,14):null,authStatus:null,authBody:null,error:null};
    try{out.urlHost=new URL(url).host}catch{}
    if(!key) return res.status(200).json(out);
    try{
      const r=await fetch(url+'/auth/v1/settings',{headers:{apikey:key,Authorization:'Bearer '+key}});
      out.authStatus=r.status;
      out.authBody=(await r.text()).slice(0,500);
    }catch(e){out.error=e.message||String(e)}
    return res.status(200).json(out);
  }catch(e){return res.status(200).json({error:e.message||String(e)})}
};