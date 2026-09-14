export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt.' });

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const subject = String(req.body?.subject || 'Allgemeine Frage').trim();
  const message = String(req.body?.message || '').trim();
  const website = String(req.body?.website || '').trim();

  if (website) return res.status(200).json({ ok: true });
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5) {
    return res.status(400).json({ error: 'Bitte Name, gültige E-Mail-Adresse und Nachricht ausfüllen.' });
  }
  if (name.length > 120 || subject.length > 160 || message.length > 5000) {
    return res.status(400).json({ error: 'Die Nachricht ist zu lang.' });
  }

  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!resendKey) return res.status(503).json({ error: 'Der Support ist gerade nicht verfügbar. Bitte später erneut versuchen.' });

  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#039;' }[char]));
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'HandwerkPilot Support <hallo@handwerkpilot.app>',
      to: ['schmidt@ms-rohrbau.de'],
      reply_to: email,
      subject: '[HandwerkPilot Support] ' + subject,
      text: 'Neue Supportanfrage\n\nVon: ' + name + ' <' + email + '>\nBetreff: ' + subject + '\n\n' + message,
      html: '<h2>Neue Supportanfrage</h2><p><b>Von:</b> ' + esc(name) + ' &lt;' + esc(email) + '&gt;</p><p><b>Betreff:</b> ' + esc(subject) + '</p><p style="white-space:pre-wrap">' + esc(message) + '</p>'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('support mail', response.status, data);
    return res.status(502).json({ error: 'Die Nachricht konnte nicht gesendet werden. Bitte später erneut versuchen.' });
  }
  return res.status(200).json({ ok: true });
}