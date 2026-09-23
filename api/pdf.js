const PDFDocument = require('pdfkit');

const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const clean=s=>String(s??'');
const line=(doc,y)=>doc.moveTo(48,y).lineTo(547,y).strokeColor('#cbd5e1').lineWidth(1).stroke();

module.exports = async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Nur POST erlaubt.'});
  try{
    const d=req.body||{};
    const doc=new PDFDocument({size:'A4',margin:48,info:{Title:clean(d.title)||'Dokument',Author:clean(d.company?.name)||'HandwerkPilot'}});
    const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>{
      const pdf=Buffer.concat(chunks),safe=clean(d.filename||'Dokument.pdf').replace(/[^a-zA-Z0-9._-]/g,'-');
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`inline; filename="${safe}"`);
      res.setHeader('Content-Length',pdf.length);res.status(200).send(pdf);
    });
    const co=d.company||{},customer=d.customer||{},positions=Array.isArray(d.positions)?d.positions:[];
    const navy='#172033',muted='#667085',bottom=760;
    let logoOk=false;
    try{if(/^data:image\//.test(co.logo_data||'')){const raw=co.logo_data.split(',')[1];if(raw){doc.image(Buffer.from(raw,'base64'),420,50,{fit:[127,55],align:'right'});logoOk=true}}}catch{}
    if(logoOk){/* Firmenlogo steht bewusst allein rechts in der Kopfzeile. */}
    const addr=[co.street,[co.zip,co.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const contact=[co.phone,co.email,co.website].filter(Boolean).join(' · ');
    doc.font('Helvetica').fontSize(8).fillColor(muted).text([addr,contact].filter(Boolean).join(' · '),48,110,{width:330});
    if(logoOk){/* Logo wird oben rechts ausgegeben. */}
    line(doc,132);
    doc.font('Helvetica-Bold').fontSize(27).fillColor(navy).text(clean(d.title||'Dokument'),48,155);
    doc.font('Helvetica').fontSize(8).fillColor(muted).text(clean(co.name||''),48,203,{width:250});
    doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(clean(customer.name),48,217,{width:260});
    doc.font('Helvetica').fontSize(10).fillColor(navy).text(clean(customer.address),48,234,{width:260});
    doc.font('Helvetica-Bold').fontSize(10).fillColor(navy).text(clean(d.number_label||'Nummer')+': '+clean(d.number),340,215,{width:207,align:'right'});
    doc.font('Helvetica').fontSize(10).text('Datum: '+clean(d.date),340,231,{width:207,align:'right'});
    if(d.subject)doc.text('Projekt: '+clean(d.subject),340,247,{width:207,align:'right'});
    let y=282;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(navy);
    doc.text('Pos.',48,y,{width:36});doc.text('Leistung',88,y,{width:250});doc.text('Menge',344,y,{width:70,align:'right'});doc.text('Einzelpreis',422,y,{width:72,align:'right'});doc.text('Gesamt',500,y,{width:47,align:'right'});
    line(doc,y+16);y+=26;
    positions.forEach((p,i)=>{
      if(y>650){doc.addPage();y=60}
      const total=Number(p.qty||0)*Number(p.price||0);
      doc.font('Helvetica').fontSize(9).fillColor(navy);
      doc.text(String(i+1),48,y,{width:36});doc.text(clean(p.desc),88,y,{width:245});
      doc.text((clean(p.qty)||'0')+(p.unit?' '+clean(p.unit):''),344,y,{width:70,align:'right'});
      doc.text(eur(p.price),422,y,{width:72,align:'right'});doc.text(eur(total),500,y,{width:47,align:'right'});
      y+=25;line(doc,y-8);
    });
    y=Math.max(y+8,350);
    const tx=350,netAmount=Number(d.net)||positions.reduce((sum,p)=>sum+Number(p.qty||0)*Number(p.price||0),0),vatRate=Number(d.vat_rate)||19,vatAmount=d.reverse_charge?0:(Number(d.vat)||netAmount*vatRate/100),grossAmount=Number(d.gross)||netAmount+vatAmount;
    doc.font('Helvetica').fontSize(10).fillColor(navy).text('Netto',tx,y,{width:120}).text(eur(netAmount),470,y,{width:77,align:'right'});y+=18;
    if(d.reverse_charge){doc.text('Umsatzsteuer (§ 13b)',tx,y,{width:120}).text('0,00 €',470,y,{width:77,align:'right'});}else{doc.text('MwSt. '+vatRate+' %',tx,y,{width:120}).text(eur(vatAmount),470,y,{width:77,align:'right'});}y+=19;
    doc.moveTo(tx,y).lineTo(547,y).strokeColor(navy).lineWidth(1.5).stroke();y+=5;
    doc.font('Helvetica-Bold').fontSize(14).text('Gesamt',tx,y,{width:120}).text(eur(grossAmount),470,y,{width:77,align:'right'});y+=30;
    if(d.payment_text){doc.font('Helvetica').fontSize(10).fillColor(navy).text(clean(d.payment_text),48,y,{width:499});}
    if(d.note){y+=28;doc.font('Helvetica').fontSize(9).fillColor(navy).text(clean(d.note),48,y,{width:499});}
    const legal=[co.owner&&'Inhaber/GF: '+co.owner,co.tax_number&&'St.-Nr.: '+co.tax_number,co.vat_id&&'USt-IdNr.: '+co.vat_id,co.register_court&&'Amtsgericht: '+co.register_court,co.register_number&&'Handelsregister: '+co.register_number].filter(Boolean).join(' · ');
    const bank=[co.bank,co.iban&&'IBAN '+co.iban,co.bic&&'BIC '+co.bic].filter(Boolean).join(' · ');
    line(doc,bottom-12);doc.font('Helvetica').fontSize(7.5).fillColor(muted);
    doc.text(legal,48,bottom,{width:499,align:'center'});doc.text(bank,48,bottom+11,{width:499,align:'center'});
    doc.end();
  }catch(e){console.error(e);res.status(500).json({error:'PDF konnte nicht erstellt werden.'});}
};