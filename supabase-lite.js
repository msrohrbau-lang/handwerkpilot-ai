(function(){
  function createClient(baseUrl, anonKey){
    baseUrl=String(baseUrl||'').replace(/\/$/,'');
    const ref=(baseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/)||[])[1]||'handwerkpilot';
    const storageKey='sb-'+ref+'-auth-token';
    const listeners=[];
    const load=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}};
    const save=s=>{if(s)localStorage.setItem(storageKey,JSON.stringify(s));else localStorage.removeItem(storageKey)};
    const notify=(event,s)=>listeners.forEach(cb=>{try{cb(event,s)}catch(e){console.error(e)}});
    async function authFetch(path,body,extra={}){
      const r=await fetch(baseUrl+path,{method:'POST',headers:{'Content-Type':'application/json','apikey':anonKey,'Authorization':'Bearer '+anonKey,...extra},body:JSON.stringify(body||{})});
      let d={};try{d=await r.json()}catch{}
      if(!r.ok){const err=new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status));err.status=r.status;throw err}
      return d;
    }
    async function normalizeSession(d){
      if(!d)return null;
      if(d.access_token){const expiresAt=d.expires_at||Math.floor(Date.now()/1000)+(d.expires_in||3600);return {access_token:d.access_token,refresh_token:d.refresh_token,expires_in:d.expires_in,expires_at:expiresAt,token_type:d.token_type||'bearer',user:d.user}}
      return d.session||null;
    }
    async function sessionFromRecoveryHash(){
      const raw=location.hash&&location.hash.length>1?location.hash.slice(1):'';
      if(!raw)return null;
      const p=new URLSearchParams(raw);
      if(p.get('type')!=='recovery'||!p.get('access_token'))return null;
      const access_token=p.get('access_token'),refresh_token=p.get('refresh_token')||'',expires_in=Number(p.get('expires_in')||3600),token_type=p.get('token_type')||'bearer';
      let user=null;
      try{
        const r=await fetch(baseUrl+'/auth/v1/user',{headers:{apikey:anonKey,Authorization:'Bearer '+access_token}});
        if(r.ok)user=await r.json();
      }catch{}
      const s={access_token,refresh_token,expires_in,expires_at:Math.floor(Date.now()/1000)+expires_in,token_type,user};
      save(s);notify('PASSWORD_RECOVERY',s);return s;
    }
    const auth={
      async getSession(){
        let recovery=await sessionFromRecoveryHash();if(recovery)return {data:{session:recovery},error:null};
        let s=load();
        if(s&&s.expires_at&&s.refresh_token&&s.expires_at<Math.floor(Date.now()/1000)+60){
          try{const d=await authFetch('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});s=await normalizeSession(d);save(s)}catch(e){save(null);s=null}
        }
        return {data:{session:s},error:null};
      },
      async signUp({email,password,options}){
        try{const d=await authFetch('/auth/v1/signup',{email,password,data:(options&&options.data)||{}});const s=await normalizeSession(d);if(s){save(s);notify('SIGNED_IN',s)}return {data:{user:d.user||null,session:s},error:null}}catch(error){return {data:{user:null,session:null},error}}
      },
      async signInWithPassword({email,password}){
        try{const d=await authFetch('/auth/v1/token?grant_type=password',{email,password});const s=await normalizeSession(d);save(s);notify('SIGNED_IN',s);return {data:{user:s&&s.user,session:s},error:null}}catch(error){return {data:{user:null,session:null},error}}
      },
      async resetPasswordForEmail(email,options){
        try{
          const redirect=((options&&options.redirectTo)||location.origin+location.pathname||location.origin+'/login');
          await authFetch('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{email});
          return {data:{},error:null};
        }catch(error){return {data:null,error}}
      },
      async updateUser(attrs){
        try{
          let s=load();if(!s||!s.access_token)throw new Error('Der Passwort-Link ist abgelaufen oder ungültig. Bitte fordere eine neue Reset-Mail an.');
          const r=await fetch(baseUrl+'/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',apikey:anonKey,Authorization:'Bearer '+s.access_token},body:JSON.stringify(attrs||{})});
          let d={};try{d=await r.json()}catch{}
          if(!r.ok)throw new Error(d.msg||d.message||d.error_description||d.error||('HTTP '+r.status));
          if(s){s.user=d.user||d;save(s)}
          return {data:{user:d.user||d},error:null};
        }catch(error){return {data:null,error}}
      },
      async signOut(){const s=load();try{if(s&&s.access_token)await fetch(baseUrl+'/auth/v1/logout',{method:'POST',headers:{apikey:anonKey,Authorization:'Bearer '+s.access_token}})}catch{}save(null);notify('SIGNED_OUT',null);return {error:null}},
      onAuthStateChange(cb){listeners.push(cb);return {data:{subscription:{unsubscribe(){const i=listeners.indexOf(cb);if(i>=0)listeners.splice(i,1)}}}}}
    };
    function Query(table){
      this.table=table;this.method='GET';this.body=null;this.filters=[];this.orderBy=null;this.wantSingle=false;this.wantMaybe=false;this.returning=false;
    }
    Query.prototype.select=function(cols){this.cols=cols||'*';if(this.method!=='GET')this.returning=true;return this};
    Query.prototype.insert=function(body){this.method='POST';this.body=body;return this};
    Query.prototype.update=function(body){this.method='PATCH';this.body=body;return this};
    Query.prototype.delete=function(){this.method='DELETE';return this};
    Query.prototype.eq=function(k,val){this.filters.push([k,'eq.'+encodeURIComponent(val)]);return this};
    Query.prototype.order=function(k,opt){this.orderBy=k+'.'+((opt&&opt.ascending===false)?'desc':'asc');return this};
    Query.prototype.single=function(){this.wantSingle=true;return this};
    Query.prototype.maybeSingle=function(){this.wantMaybe=true;return this};
    Query.prototype.exec=async function(){
      const s=load();const token=s&&s.access_token?s.access_token:anonKey;
      const qs=new URLSearchParams();
      if(this.method==='GET')qs.set('select',this.cols||'*');
      this.filters.forEach(([k,val])=>qs.append(k,val));
      if(this.orderBy)qs.set('order',this.orderBy);
      let url=baseUrl+'/rest/v1/'+encodeURIComponent(this.table)+(qs.toString()?'?'+qs.toString():'');
      const headers={apikey:anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'};
      if(this.returning)headers.Prefer='return=representation';
      if(this.wantSingle||this.wantMaybe)headers.Accept='application/vnd.pgrst.object+json';
      const r=await fetch(url,{method:this.method,headers,body:this.body==null?undefined:JSON.stringify(this.body)});
      let text=await r.text(),data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
      if(!r.ok){if(this.wantMaybe&&r.status===406)return {data:null,error:null};const msg=(data&&data.message)||('HTTP '+r.status);return {data:null,error:new Error(msg)}}
      return {data,error:null};
    };
    Query.prototype.then=function(resolve,reject){return this.exec().then(resolve,reject)};
    return {auth,from(table){return new Query(table)}};
  }
  window.supabase=window.supabase||{createClient};
})();
