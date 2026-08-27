export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Nur POST erlaubt." });
  }

  try {
    const body = req.body || {};
    const message = [body.message, body.prompt, body.text, body.input, body.content]
      .find(value => typeof value === "string" && value.trim())?.trim();

    if (!message) {
      return res.status(400).json({ error: "Bitte eine Nachricht eingeben." });
    }

    if (message.length > 20000) {
      return res.status(413).json({ error: "Die Anfrage ist zu lang." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY ist nicht eingerichtet." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          instructions: "Du bist HandwerkPilot AI, ein digitaler Büroassistent für Handwerksbetriebe in Deutschland. Antworte auf Deutsch, professionell, verständlich, praxisnah und ohne unnötige Floskeln. Erfinde niemals fehlende Preise, Mengen, Kundendaten, Normen oder technische Angaben. Weise bei fehlenden entscheidenden Informationen klar darauf hin. Formatiere Angebote, Rechnungen, Berichte, Leistungsbeschreibungen und Kundenmails übersichtlich.",
          input: message,
          max_output_tokens: 1800
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI API Fehler:", response.status, data?.error?.message || data);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: data?.error?.message || "Fehler bei der KI-Anfrage."
      });
    }

    const answer =
      data?.output_text ||
      data?.output?.flatMap(item => item?.content || [])
        .filter(item => item?.type === "output_text")
        .map(item => item?.text || "")
        .join("\n")
        .trim();

    if (!answer) {
      return res.status(502).json({ error: "Keine KI-Antwort erhalten." });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ answer });
  } catch (error) {
    console.error("HandwerkPilot Fehler:", error);
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Die KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen." });
    }
    return res.status(500).json({ error: "Interner Serverfehler." });
  }
}
