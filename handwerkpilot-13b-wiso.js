(()=>{
const TEXT='Steuerschuldnerschaft des Leistungsempfängers';
const sync0=window.syncInvoiceAccounting;
if(!sync0)return;
window.syncInvoiceAccounting=async function(id){
  const idx=Array.isArray(documents)?documents.findIndex(x=>String(x.id)===String(id)):-1;
  const original=idx>=0?documents[idx]:null;
  if(!original?.payload?.reverse_charge_13b)return sync0.call(this,id);
  const clone={...original,payload:{...(original.payload||{})}};
  clone.payload.positions=(clone.payload.positions||[]).map(p=>({...p,vatRate:0}));
  const oldNote=String(clone.payload.note||'').trim();
  clone.payload.note=oldNote?`${oldNote}\n\n${TEXT}. Die Umsatzsteuer wird gemäß § 13b UStG vom Leistungsempfänger geschuldet.`:`${TEXT}. Die Umsatzsteuer wird gemäß § 13b UStG vom Leistungsempfänger geschuldet.`;
  clone.total_vat=0;
  clone.total_gross=Number(clone.total_net||0);
  documents[idx]=clone;
  try{return await sync0.call(this,id)}finally{documents[idx]=original}
};
})();