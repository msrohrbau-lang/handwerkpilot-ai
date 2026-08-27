module.exports = async function handler(req,res){
  try{
    const url='https://dbaiwcqoigqgknmtctwl.supabase.co';
    const key='sb_publishable_8irMEHCYLPzCmMljWAUCaA_L7xJSZlr';
    const out={urlHost:new URL(url).host,keyPrefix:key.slice(0,14),authStatus:null,authBody:null,error:null};
    try{
      const r=await fetch(url+'/auth/v1/settings',{headers:{apikey:key,Authorization:'Bearer '+key}});
      out.authStatus=r.status;
      out.authBody=(await r.text()).slice(0,500);
    }catch(e){out.error=e.message||String(e)}
    return res.status(200).json(out);
  }catch(e){return res.status(200).json({error:e.message||String(e)})}
};