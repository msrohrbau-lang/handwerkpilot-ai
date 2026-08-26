export default async function handler(req, res) {
  // Nur POST-Anfragen zulassen
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, context } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Bitte eine Nachricht eingeben."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY ist noch nicht eingerichtet."
      });
    }

    const systemPrompt = `
Du bist HandwerkPilot AI – ein digitaler Büroassistent speziell für Handwerksbetriebe.

Du hilfst Handwerkern schnell, verständlich und praxisnah bei Büroarbeit.

Du kannst insbesondere:
- Angebote formulieren
- Rechnungspositionen formulieren
- Baustellenberichte schreiben
- Kunden-E-Mails erstellen
- Leistungsbeschreibungen erstellen
- Texte verbessern
- professionelle Antworten an Kunden verfassen
- Arbeits- und Projektinformationen strukturieren

Schreibe auf Deutsch.
Verwende einfache, professionelle Sprache.
Vermeide unnötige Fachbegriffe und lange Erklärungen.
Das Ergebnis soll möglichst direkt kopiert und verwendet werden können.

Wenn Firmendaten oder andere Informationen als Kontext mitgeschickt werden,
berücksichtige diese bei deiner Antwort.

Wenn wichtige Angaben fehlen, erstelle trotzdem einen brauchbaren Entwurf
und kennzeichne Stellen, die ergänzt werden müssen.
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content:
                (context ? `Kontext:\n${context}\n\n` : "") +
                `Aufgabe:\n${message}`
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Die KI konnte gerade keine Antwort erstellen."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      "Es konnte keine Antwort erstellt werden.";

    return res.status(200).json({
      answer
    });

  } catch (error) {
    console.error("HandwerkPilot API error:", error);

    return res.status(500).json({
      error: "Beim Erstellen der Antwort ist ein Fehler aufgetreten."
    });
  }
}
