// Vercel serverless function that proxies requests to Groq.
//
// Modes:
//  - "artifacts": build notes/summary/mindmap/quiz/flashcards from transcript
//  - "chat": lesson-aware chat based on context + question
//
// Requires env var: GROQ_API_KEY
// Optional env var: GROQ_MODEL (defaults to "llama-3.1-8b-instant")

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GROQ_API_KEY is not set on the server" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }
  body = body || {};
  const { mode, transcript, question, context } = body;

  try {
    if (mode === "artifacts") {
      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Missing transcript" });
      }

      const prompt = `
You are an AI study assistant. Given a lecture transcript, create helpful study materials.

Return ONLY a valid JSON object, no explanations, no markdown, no extra text.
The JSON MUST have exactly this structure:

{
  "notes": "string (markdown-style bullet notes, short and clear)",
  "summary": "string (3-8 bullet points, concise)",
  "mindmap": {
    "topic": "string (main topic of the lecture)",
    "children": [
      { "topic": "subtopic 1", "children": [] },
      { "topic": "subtopic 2", "children": [] }
    ]
  },
  "quiz": [
    {
      "question": "string (MCQ or short question)",
      "options": ["A", "B", "C", "D"],
      "answer": "string (one of the options or short answer)"
    }
  ],
  "flashcards": [
    { "front": "Term or question", "back": "Explanation or answer" }
  ]
}

Transcript:
"""${transcript}"""`;

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a strict JSON generator for study materials. You never include markdown code fences.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        }
      );

      if (!groqRes.ok) {
        const txt = await groqRes.text().catch(() => "");
        return res.status(groqRes.status).json({
          error: "Groq HTTP " + groqRes.status,
          details: txt,
        });
      }

      const data = await groqRes.json();
      const content = data.choices?.[0]?.message?.content || "";

      let jsonText = content.trim();
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];

      let artifacts;
      try {
        artifacts = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse Groq JSON:", jsonText);
        return res.status(500).json({
          error: "Failed to parse Groq JSON",
          details: String(e.message || e),
        });
      }

      return res
        .status(200)
        .json({ success: true, mode: "artifacts", artifacts });
    }

    if (mode === "chat") {
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Missing question" });
      }
      if (!context || typeof context !== "string") {
        return res.status(400).json({ error: "Missing context" });
      }

      const userPrompt = `
You are Lexis, an AI study assistant. Answer the student's question **only** using the lesson context below.
If the answer is not clearly supported by the context, say you are not sure and explain what *is* in the notes instead.
Keep answers short and focused (2–5 sentences).

Lesson context:
"""${context}"""

Student question:
"""${question}"""`;

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are Lexis, a helpful and concise AI study assistant for a single lesson.",
              },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!groqRes.ok) {
        const txt = await groqRes.text().catch(() => "");
        return res.status(groqRes.status).json({
          error: "Groq HTTP " + groqRes.status,
          details: txt,
        });
      }

      const data = await groqRes.json();
      const answer = data.choices?.[0]?.message?.content?.trim() || "";

      return res.status(200).json({
        success: true,
        mode: "chat",
        answer,
      });
    }

    return res.status(400).json({ error: "Invalid mode" });
  } catch (err) {
    console.error("Groq backend error:", err);
    return res.status(500).json({
      error: "Groq backend error",
      details: String(err.message || err),
    });
  }
}