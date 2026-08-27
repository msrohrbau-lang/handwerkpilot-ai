const PDFDocument = require('pdfkit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt.' });
  try {
    const d = req.body || {};
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: d.title || 'HandwerkPilot Dokument', Author: d.company || 'HandwerkPilot AI' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      const safe = String(d.filename || 'HandwerkPilot.pdf').replace(/[^a-zA-Z0-9._-]/g, '-');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
      res.setHeader('Content-Length', pdf.length);
      res.status(200).send(pdf);
    });
    doc.fontSize(10).fillColor('#64748b').text(d.company || 'HandwerkPilot AI');
    doc.moveDown(.5).fontSize(25).fillColor('#0f172a').text(d.title || 'Dokument');
    if (d.number) doc.fontSize(10).fillColor('#475569').text(`Nummer: ${d.number}`);
    doc.moveDown();
    if (d.customer) { doc.fontSize(11).fillColor('#0f172a').text('Kunde', { continued:false }); doc.fontSize(10).fillColor('#334155').text(d.customer); doc.moveDown(); }
    if (d.intro) { doc.fontSize(10).fillColor('#334155').text(d.intro); doc.moveDown(); }
    const positions = Array.isArray(d.positions) ? d.positions : [];
    if (positions.length) {
      doc.fontSize(9).fillColor('#0f172a').text('Pos.',48,doc.y,{width:35}); doc.text('Leistung',85,doc.y-11,{width:255}); doc.text('Menge',345,doc.y-11,{width:70,align:'right'}); doc.text('Gesamt',425,doc.y-11,{width:120,align:'right'}); doc.moveDown(.6); doc.moveTo(48,doc.y).lineTo(547,doc.y).strokeColor('#cbd5e1').stroke(); doc.moveDown(.5);
      positions.forEach((p,i)=>{ const y=doc.y; const qty=`${p.qty ?? ''} ${p.unit ?? ''}`.trim(); const total=Number(p.qty||0)*Number(p.price||0); doc.fillColor('#0f172a').fontSize(9).text(String(i+1),48,y,{width:35}); doc.text(String(p.desc||''),85,y,{width:255}); doc.text(qty,345,y,{width:70,align:'right'}); doc.text(eur(total),425,y,{width:120,align:'right'}); doc.y=Math.max(doc.y,y+28); if(doc.y>720) doc.addPage(); });
      doc.moveDown();
    }
    const net=Number(d.net||0), vatRate=Number(d.vat||19), vat=net*vatRate/100, gross=net+vat;
    if (d.showTotals !== false) { doc.fontSize(10).fillColor('#0f172a').text(`Netto: ${eur(net)}`,330,doc.y,{width:215,align:'right'}); doc.text(`${vatRate} % MwSt.: ${eur(vat)}`,330,doc.y,{width:215,align:'right'}); doc.fontSize(13).text(`Brutto: ${eur(gross)}`,330,doc.y+4,{width:215,align:'right'}); doc.moveDown(2); }
    if (d.notes) doc.fontSize(9).fillColor('#334155').text(d.notes);
    doc.fontSize(8).fillColor('#94a3b8').text('Erstellt mit HandwerkPilot AI',48,790,{align:'center',width:499});
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error:'PDF konnte nicht erstellt werden.' }); }
};
function eur(n){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0)}