export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {const body = req.body || {};
const message =
  body.message ||
  body.prompt ||
  body.text ||
  body.input ||
  "";
  

    if (!message) {
      return res.status(400).json({
        error: "Bitte eine Nachricht eingeben."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY ist nicht eingerichtet."
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Du bist HandwerkPilot AI, ein digitaler Büroassistent für Handwerksbetriebe. Antworte auf Deutsch, professionell, verständlich und praxisnah."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Fehler bei der KI-Anfrage."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    return res.status(200).json({
      answer: answer || "Keine Antwort erhalten."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Interner Serverfehler."
    });
  }
}
