(function () {
  // -------- Simple auth guard (main page) --------
  try {
    const rawUser = localStorage.getItem("lexis_user");
    if (!rawUser) {
      // no user stored → send to login page
      window.location.replace("/login/");
      return; // stop running the dashboard JS
    }
  } catch (err) {
    window.location.replace("/login/");
    return;
  }

  // =========================
  //  CONSTANTS / CONFIG
  // =========================

  const TABS = [
    { id: "notes", label: "Notes", icon: "edit" },
    { id: "summary", label: "Summary", icon: "list" },
    { id: "transcript", label: "Transcript", icon: "file-text" },
    { id: "mindmap", label: "Mindmap", icon: "git-branch" },
    { id: "quiz", label: "Quiz", icon: "help-circle" },
    { id: "flashcards", label: "Flashcards", icon: "layers" },
  ];

  const STORAGE_KEY = "lexis_lessons_v1";

  // ============ GROQ CONFIG ============
  // Put your valid Groq key + model here
  const GROQ_API_KEY = ""; 
  const GROQ_MODEL = "llama-3.1-8b-instant"; // or any current Groq chat model
  const GROQ_ENABLED =
    !!GROQ_API_KEY && !GROQ_API_KEY.startsWith("YOUR_") && !!GROQ_MODEL;

  // Chat bubble open/closed
  let isChatOpen = false;

  // =========================
  //  ICONS
  // =========================

  const icons = {
    edit: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    `,
    list: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    `,
    "file-text": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    `,
    "git-branch": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="6" y1="3" x2="6" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    `,
    "help-circle": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `,
    layers: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `,
    send: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    `,
    plus: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    `,
    brain: `
      <svg class="mindmap-root-icon" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
    `,
  };

  // =========================
  //  UTILITIES
  // =========================

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function splitIntoSentences(text) {
    return text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const STOPWORDS = new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "from",
    "have",
    "has",
    "had",
    "are",
    "was",
    "were",
    "will",
    "would",
    "could",
    "should",
    "there",
    "their",
    "about",
    "into",
    "your",
    "you",
    "him",
    "her",
    "they",
    "them",
    "our",
    "ours",
    "not",
    "but",
    "than",
    "then",
    "when",
    "what",
    "which",
    "where",
    "how",
    "why",
    "can",
    "may",
    "might",
  ]);

  // =========================
  //  LOCAL FALLBACK GENERATORS
  // =========================

  function generateNotesFromTranscript(text) {
    const sentences = splitIntoSentences(text);
    return sentences.map((s) => "- " + s).join("\n");
  }

  function generateSummaryFromTranscript(text) {
    const sentences = splitIntoSentences(text);
    const chosen = sentences.slice(0, 5);
    return chosen.map((s) => "- " + s).join("\n");
  }

  function extractKeywords(text, max = 6) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w));

    const freq = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  }

  function generateMindmapFromTranscript(text) {
    const sentences = splitIntoSentences(text);
    const topic =
      sentences[0] && sentences[0].length < 80
        ? sentences[0]
        : "Lesson Overview";

    const children = sentences.slice(1, 6).map((s) => ({
      topic: s,
      children: [],
    }));

    return { topic, children };
  }

  function generateQuizFromTranscript(text) {
    const sentences = splitIntoSentences(text).filter(
      (s) => s.split(/\s+/).length >= 5
    );
    const quiz = [];

    for (let i = 0; i < sentences.length && quiz.length < 4; i++) {
      const words = sentences[i].split(/\s+/);
      const candidates = words.filter((w) => w.length >= 5);
      if (!candidates.length) continue;

      const word =
        candidates[Math.floor(Math.random() * candidates.length)];
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
      if (!cleanWord) continue;

      const question = sentences[i].replace(word, "_____");
      quiz.push({
        question: "Fill in the blank: " + question,
        answer: cleanWord,
        // no options in local fallback
      });
    }

    return quiz;
  }

  function generateFlashcardsFromTranscript(text) {
    const sentences = splitIntoSentences(text);
    const keywords = extractKeywords(text, 6);
    const flashcards = [];

    for (const kw of keywords) {
      const sentence =
        sentences.find((s) =>
          s.toLowerCase().includes(kw.toLowerCase())
        ) || "Appears in the lesson transcript.";
      flashcards.push({ front: kw, back: sentence });
    }
    return flashcards;
  }

  // =========================
  //  GROQ CALL
  // =========================

  async function callGroqForLessonArtifacts(transcript) {
    if (!GROQ_ENABLED) {
      throw new Error("Groq is not configured");
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

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
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

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("Groq HTTP " + res.status + ": " + txt);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonText = content.trim();
    const fenceMatch = jsonText.match(/\{[\s\S]*\}/);
    if (fenceMatch) jsonText = fenceMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error("Failed to parse Groq JSON:", jsonText);
      throw err;
    }
    return parsed;
  }

  // =========================
  //  LOCAL STORAGE / LESSONS
  // =========================

  function createSampleLessons() {
    const id = Date.now().toString();
    return [
      {
        id,
        title: "Welcome to Lexis",
        subject: "Tutorial",
        createdAt: new Date().toISOString(),
        transcript: "",
        notes: "",
        summary: "",
        mindmap: { topic: "", children: [] },
        quiz: [],
        flashcards: [],
        messages: [
          {
            id: "m1",
            role: "assistant",
            text:
              "👋 Welcome! I'm Lexis. Click Start recording (Chrome/Edge), speak, then Stop. I'll use your speech to build notes, summary, mindmap, quiz & flashcards.",
            read: false,
          },
        ],
      },
    ];
  }

  let lessons = (function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load lessons:", e);
    }
    return createSampleLessons();
  })();

  function saveLessons() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
    } catch (e) {
      console.error("Failed to save lessons:", e);
    }
  }

  let selectedLessonId = lessons[0]?.id || null;
  let activeTab = "notes";
  let isRecording = false;
  let isProcessing = false;
  let liveUpdateTimeout = null;

  // =========================
  //  SPEECH RECOGNITION
  // =========================

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  function getCurrentLesson() {
    return lessons.find((l) => l.id === selectedLessonId) || null;
  }

  function updateLessonCount() {
    const countEl = document.getElementById("lessonCount");
    if (countEl) countEl.textContent = lessons.length;
  }

  function updateChatBadge() {
    const lesson = getCurrentLesson();
    const badgeEl = document.getElementById("chatBadge");
    if (!badgeEl || !lesson) return;

    const unreadCount = lesson.messages.filter(
      (m) => m.role === "assistant" && !m.read
    ).length;

    badgeEl.textContent = unreadCount;
    if (unreadCount > 0) {
      badgeEl.classList.add("visible");
    } else {
      badgeEl.classList.remove("visible");
    }
  }

  // --- LIVE UPDATE HELPERS ---

  function scheduleLiveUpdate() {
    if (liveUpdateTimeout) clearTimeout(liveUpdateTimeout);
    liveUpdateTimeout = setTimeout(runLiveUpdate, 800);
  }

  function runLiveUpdate() {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    const text = (lesson.transcript || "").trim();
    if (!text) return;

    const localNotes = generateNotesFromTranscript(text);
    const localSummary = generateSummaryFromTranscript(text);

    lesson.notes = localNotes;
    lesson.summary = localSummary;

    saveLessons();

    if (activeTab === "notes" || activeTab === "summary") {
      renderMain();
    }
  }

  async function startRecording() {
    if (!SpeechRecognition) {
      alert(
        "Your browser does not support SpeechRecognition.\nUse Chrome or Edge, or type/paste transcript manually in the Transcript tab."
      );
      return;
    }

    const lesson = getCurrentLesson();
    if (!lesson) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }
      lesson.transcript = text.trim();
      saveLessons();

      // live notes/summary update
      scheduleLiveUpdate();

      if (activeTab === "transcript") renderMain();
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert(
        "Speech recognition error: " +
          event.error +
          "\nYou can still paste text into the Transcript tab and generate notes."
      );
      isRecording = false;
      isProcessing = false;
      renderMain();
    };

    recognition.onend = () => {
      if (isRecording) {
        isRecording = false;
      }
      isProcessing = true;
      renderMain();
      generateArtifactsForCurrentLesson().catch((err) => {
        console.error(err);
        isProcessing = false;
        renderMain();
      });
    };

    recognition.start();
    isRecording = true;
    isProcessing = false;
    renderMain();
  }

  function stopRecording() {
    if (recognition) {
      recognition.stop();
    }
  }

  // =========================
  //  GENERATE ARTIFACTS
  // =========================

  async function generateArtifactsForCurrentLesson() {
    const lesson = getCurrentLesson();
    if (!lesson) return;
    const text = (lesson.transcript || "").trim();
    if (!text) {
      alert(
        "Transcript is empty.\nPlease record some speech or paste text into the Transcript tab first."
      );
      isProcessing = false;
      renderMain();
      return;
    }

    const localNotes = generateNotesFromTranscript(text);
    const localSummary = generateSummaryFromTranscript(text);
    const localMindmap = generateMindmapFromTranscript(text);
    const localQuiz = generateQuizFromTranscript(text);
    const localFlashcards = generateFlashcardsFromTranscript(text);

    lesson.notes =
      localNotes + (GROQ_ENABLED ? "\n\n(Enhancing with Groq…)" : "");
    lesson.summary = localSummary;
    lesson.mindmap = localMindmap;
    lesson.quiz = localQuiz;
    lesson.flashcards = localFlashcards;

    saveLessons();
    renderMain();

    if (!GROQ_ENABLED) {
      isProcessing = false;
      renderMain();
      return;
    }

    try {
      const ai = await callGroqForLessonArtifacts(text);

      lesson.notes = ai.notes || localNotes;
      lesson.summary = ai.summary || localSummary;
      lesson.mindmap = ai.mindmap || localMindmap;
      lesson.quiz =
        Array.isArray(ai.quiz) && ai.quiz.length > 0 ? ai.quiz : localQuiz;
      lesson.flashcards =
        Array.isArray(ai.flashcards) && ai.flashcards.length > 0
          ? ai.flashcards
          : localFlashcards;
    } catch (err) {
      console.error("Groq generation failed, using local only:", err);
      alert(
        "Groq call failed (see console). Using only basic local notes/summary for now."
      );
    } finally {
      isProcessing = false;
      saveLessons();
      renderMain();
    }
  }

  // =========================
  //  RENDERING
  // =========================

  function renderSidebar() {
    const lessonListEl = document.getElementById("lessonList");
    lessonListEl.innerHTML = lessons
      .map((lesson) => {
        const isActive = lesson.id === selectedLessonId;
        return `
          <div class="lesson-item ${isActive ? "active" : ""}" data-id="${
          lesson.id
        }">
            <div class="lesson-title">${lesson.title || "Untitled"}</div>
            <div class="lesson-meta">
              <span class="lesson-dot"></span>
              ${formatDate(lesson.createdAt)} · ${lesson.subject || "General"}
            </div>
          </div>
        `;
      })
      .join("");
    updateLessonCount();
  }

  function renderMindmap(mindmap) {
    if (!mindmap || !mindmap.topic) {
      return `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          <div class="empty-title">No Mindmap Yet</div>
          <div class="empty-desc">Record a lesson or paste a transcript, then stop recording to generate a mindmap.</div>
        </div>
      `;
    }

    function renderChildren(children) {
      if (!children || !children.length) return "";
      return `
        <div class="mindmap-children">
          ${children
            .map(
              (child) => `
            <div class="mindmap-child">• ${child.topic}</div>
          `
            )
            .join("")}
        </div>
      `;
    }

    return `
      <div class="mindmap-container">
        <div class="mindmap-root">
          ${icons.brain}
          <span class="mindmap-root-text">${mindmap.topic}</span>
        </div>
        <div class="mindmap-branch">
          ${mindmap.children
            .map(
              (node) => `
            <div class="mindmap-node">
              <div class="mindmap-node-content">
                <span class="mindmap-node-dot"></span>
                ${node.topic}
              </div>
              ${renderChildren(node.children)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // --------- NEW INTERACTIVE QUIZ RENDERER ----------
  function renderQuiz(quiz) {
    if (!quiz || quiz.length === 0) {
      return `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div class="empty-title">No Quiz Yet</div>
          <div class="empty-desc">Record a lesson and stop to auto-generate quiz questions.</div>
        </div>
      `;
    }

    const norm = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    function getCorrectIndex(q) {
      if (!Array.isArray(q.options) || !q.options.length || !q.answer)
        return -1;
      const answer = String(q.answer).trim();

      // Case 1: answer is like "A"/"B"/"C"/"D"
      if (/^[A-D]$/i.test(answer)) {
        const idx = answer.toUpperCase().charCodeAt(0) - 65;
        return idx >= 0 && idx < q.options.length ? idx : -1;
      }

      // Case 2: answer is (close to) the option text
      const ansNorm = norm(answer);
      let idx = q.options.findIndex((opt) => norm(opt) === ansNorm);
      if (idx !== -1) return idx;

      idx = q.options.findIndex((opt) => {
        const on = norm(opt);
        return on.includes(ansNorm) || ansNorm.includes(on);
      });
      return idx;
    }

    return `
      <div class="quiz-list">
        ${quiz
          .map((q, i) => {
            const selectedIndex =
              typeof q.selectedIndex === "number" ? q.selectedIndex : null;
            const correctIndex = getCorrectIndex(q);
            const answered = selectedIndex !== null;

            const optionsHtml = (q.options || [])
              .map((opt, j) => {
                const isSelected = selectedIndex === j;
                const isCorrectOption = correctIndex === j;
                const classes = [
                  "quiz-option",
                  isSelected ? "selected" : "",
                  answered && isCorrectOption ? "correct" : "",
                  answered && isSelected && !isCorrectOption
                    ? "incorrect"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return `
                  <div
                    class="${classes}"
                    data-quiz-option="1"
                    data-question-index="${i}"
                    data-option-index="${j}"
                  >
                    <span class="quiz-option-letter">${String.fromCharCode(
                      65 + j
                    )}</span>
                    <span>${opt}</span>
                  </div>
                `;
              })
              .join("");

            const feedbackHtml =
              answered && correctIndex !== -1
                ? `
                  <div class="quiz-feedback ${
                    selectedIndex === correctIndex ? "correct" : "incorrect"
                  }">
                    ${
                      selectedIndex === correctIndex
                        ? "Correct."
                        : `Incorrect. Correct answer: ${
                            q.options?.[correctIndex] || q.answer
                          }`
                    }
                  </div>
                `
                : "";

            return `
              <div class="quiz-card">
                <div class="quiz-number">Question ${i + 1}</div>
                <div class="quiz-question">${q.question}</div>
                <div class="quiz-options">
                  ${optionsHtml}
                </div>
                ${feedbackHtml}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderFlashcards(flashcards) {
    if (!flashcards || flashcards.length === 0) {
      return `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
          </svg>
          <div class="empty-title">No Flashcards Yet</div>
          <div class="empty-desc">Record a lesson and stop to auto-generate flashcards.</div>
        </div>
      `;
    }

    return `
      <div class="flashcard-grid">
        ${flashcards
          .map(
            (fc, i) => `
          <div class="flashcard">
            <div class="flashcard-number">Card ${i + 1}</div>
            <div class="flashcard-front">${fc.front}</div>
            <div class="flashcard-divider"></div>
            <div class="flashcard-back">${fc.back}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function renderMain() {
    const mainInner = document.getElementById("mainInner");
    const lesson = getCurrentLesson();

    if (!lesson) {
      mainInner.innerHTML = `
        <div class="no-lesson">
          <svg class="no-lesson-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <div class="no-lesson-title">No Lesson Selected</div>
          <div class="no-lesson-desc">Create a new lesson to start recording and generating AI-powered study materials.</div>
          <button class="no-lesson-btn" data-action="new-lesson">
            ${icons.plus}
            <span>Create New Lesson</span>
          </button>
        </div>
      `;
      return;
    }

    const tabsHtml = TABS.map(
      (tab) => `
      <button class="tab ${
        activeTab === tab.id ? "active" : ""
      }" data-tab="${tab.id}">
        ${tab.label}
      </button>
    `
    ).join("");

    let panelContent = "";
    let panelTitle = "";
    let panelIcon = "";

    if (activeTab === "notes") {
      panelTitle = "Notes";
      panelIcon = icons.edit;
      panelContent = `
        <textarea
          class="textarea"
          data-field="notes"
          placeholder="Your notes will appear here after recording. You can also type directly..."
        >${lesson.notes || ""}</textarea>
      `;
    } else if (activeTab === "summary") {
      panelTitle = "Summary";
      panelIcon = icons.list;
      panelContent = `
        <textarea
          class="textarea"
          data-field="summary"
          placeholder="AI-generated summary will appear here..."
        >${lesson.summary || ""}</textarea>
      `;
    } else if (activeTab === "transcript") {
      panelTitle = "Transcript";
      panelIcon = icons["file-text"];
      panelContent = `
        <textarea
          class="textarea"
          data-field="transcript"
          placeholder="Speak using Start recording, or paste/type your transcript here. Then stop recording to generate notes."
        >${lesson.transcript || ""}</textarea>
      `;
    } else if (activeTab === "mindmap") {
      panelTitle = "Mindmap";
      panelIcon = icons["git-branch"];
      panelContent = renderMindmap(lesson.mindmap);
    } else if (activeTab === "quiz") {
      panelTitle = "Quiz";
      panelIcon = icons["help-circle"];
      panelContent = renderQuiz(lesson.quiz);
    } else if (activeTab === "flashcards") {
      panelTitle = "Flashcards";
      panelIcon = icons.layers;
      panelContent = renderFlashcards(lesson.flashcards);
    }

    let recordBtnHtml;
    if (isProcessing) {
      recordBtnHtml = `
        <button class="record-btn processing" disabled>
          <span class="loading-dots"><span></span><span></span><span></span></span>
          Processing...
        </button>
      `;
    } else if (isRecording) {
      recordBtnHtml = `
        <button class="record-btn stop" data-action="stop-recording">
          ⏹ Stop Recording
        </button>
      `;
    } else {
      recordBtnHtml = `
        <button class="record-btn start" data-action="start-recording">
          <span class="record-dot"></span>
          Start Recording
        </button>
      `;
    }

    mainInner.innerHTML = `
      <div class="header">
        <div class="header-left">
          <input
            class="lesson-title-input"
            data-field="title"
            value="${lesson.title || ""}"
            placeholder="Enter lesson title..."
          />
        </div>
        <div class="record-controls">
          ${recordBtnHtml}
          <button class="delete-btn" data-action="delete-lesson">Delete</button>
        </div>
      </div>

      <div class="tabs-container">
        <div class="tabs">
          ${tabsHtml}
        </div>
      </div>

      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">${panelIcon}</span>
            ${panelTitle}
          </div>
        </div>
        <div class="panel-body">
          ${panelContent}
        </div>
      </div>
    `;
  }

  function renderChatBubble() {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    const chatMessagesEl = document.getElementById("chatMessages");
    if (!chatMessagesEl) return;

    const chatHtml = lesson.messages
      .map(
        (m) => `
      <div class="chat-message ${m.role}">
        <div class="chat-message-role">${
          m.role === "user" ? "You" : "Lexis"
        }</div>
        <div class="chat-message-text">${m.text}</div>
      </div>
    `
      )
      .join("");

    chatMessagesEl.innerHTML = chatHtml;
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

    if (isChatOpen) {
      lesson.messages.forEach((m) => (m.read = true));
      saveLessons();
      updateChatBadge();
    }
  }

  function renderApp() {
    renderSidebar();
    renderMain();
    renderChatBubble();
    updateChatBadge();
    saveLessons();
  }

  // =========================
  //  BASIC ACTIONS
  // =========================

  function handleNewLesson() {
    const id = Date.now().toString();
    const newLesson = {
      id,
      title: "New Lesson",
      subject: "General",
      createdAt: new Date().toISOString(),
      transcript: "",
      notes: "",
      summary: "",
      mindmap: { topic: "", children: [] },
      quiz: [],
      flashcards: [],
      messages: [
        {
          id: `${id}-m1`,
          role: "assistant",
          text:
            "🎯 Ready to learn! Click Start recording, speak, then Stop to generate study materials.",
          read: false,
        },
      ],
    };
    lessons.unshift(newLesson);
    selectedLessonId = id;
    activeTab = "notes";
    renderApp();
  }

  function deleteCurrentLesson() {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    const confirmed = confirm(
      `Delete lesson "${lesson.title || "Untitled"}"?\nThis cannot be undone.`
    );
    if (!confirmed) return;

    lessons = lessons.filter((l) => l.id !== lesson.id);
    if (lessons.length > 0) selectedLessonId = lessons[0].id;
    else selectedLessonId = null;

    saveLessons();
    renderApp();
  }

  function toggleChat() {
    const panel = document.getElementById("chatBubblePanel");
    if (!panel) return;

    isChatOpen = !isChatOpen;
    if (isChatOpen) {
      panel.classList.add("open");
      const lesson = getCurrentLesson();
      if (lesson) {
        lesson.messages.forEach((m) => (m.read = true));
        saveLessons();
      }
      renderChatBubble();
      updateChatBadge();

      setTimeout(() => {
        const input = document.getElementById("chatInput");
        if (input) input.focus();
      }, 100);
    } else {
      panel.classList.remove("open");
    }
  }

  function sendChat() {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    const input = document.getElementById("chatInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    lesson.messages.push({
      id: `${lesson.id}-u-${Date.now()}`,
      role: "user",
      text,
      read: true,
    });

    const responses = [
      "Great question! Based on the lesson, the key is understanding how the concepts connect with each other.",
      "Nice thought! Try linking this back to the main principles discussed earlier in the lecture.",
      "Excellent! This directly relates to the core ideas we just captured in your notes.",
      "Good point. Think about how this example fits into the overall structure of the lesson.",
      "Interesting! Let me help you understand that better based on what we covered.",
    ];

    setTimeout(() => {
      lesson.messages.push({
        id: `${lesson.id}-a-${Date.now()}`,
        role: "assistant",
        text: responses[Math.floor(Math.random() * responses.length)],
        read: isChatOpen,
      });
      saveLessons();
      renderChatBubble();
      updateChatBadge();
    }, 500);

    input.value = "";
    saveLessons();
    renderChatBubble();
  }

  // ---------- NEW: handle quiz option clicks ----------
  function handleQuizOptionClick(el) {
    const questionIndex = Number(el.getAttribute("data-question-index"));
    const optionIndex = Number(el.getAttribute("data-option-index"));
    if (Number.isNaN(questionIndex) || Number.isNaN(optionIndex)) return;

    const lesson = getCurrentLesson();
    if (!lesson || !Array.isArray(lesson.quiz)) return;
    const question = lesson.quiz[questionIndex];
    if (!question || !Array.isArray(question.options)) return;

    question.selectedIndex = optionIndex;

    const norm = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    let correctIndex = -1;
    if (question.answer) {
      const ans = String(question.answer).trim();

      if (/^[A-D]$/i.test(ans)) {
        const idx = ans.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < question.options.length) correctIndex = idx;
      } else {
        const ansNorm = norm(ans);
        correctIndex = question.options.findIndex(
          (opt) => norm(opt) === ansNorm
        );
        if (correctIndex === -1) {
          correctIndex = question.options.findIndex((opt) => {
            const on = norm(opt);
            return on.includes(ansNorm) || ansNorm.includes(on);
          });
        }
      }
    }

    question.isCorrect =
      correctIndex !== -1 && correctIndex === optionIndex;

    saveLessons();
    renderMain();
  }

  // =========================
  //  EVENT LISTENERS
  // =========================

  const newLessonBtn = document.getElementById("newLessonBtn");
  if (newLessonBtn) newLessonBtn.addEventListener("click", handleNewLesson);

  const lessonList = document.getElementById("lessonList");
  if (lessonList) {
    lessonList.addEventListener("click", (e) => {
      const item = e.target.closest(".lesson-item");
      if (!item) return;
      selectedLessonId = item.getAttribute("data-id");
      activeTab = "notes";
      renderApp();
    });
  }

  const mainInner = document.getElementById("mainInner");
  if (mainInner) {
    mainInner.addEventListener("click", (e) => {
      const tabBtn = e.target.closest("[data-tab]");
      if (tabBtn) {
        activeTab = tabBtn.getAttribute("data-tab");
        renderMain();
        return;
      }

      // NEW: quiz option click handler
      const quizOptionEl = e.target.closest("[data-quiz-option]");
      if (quizOptionEl) {
        handleQuizOptionClick(quizOptionEl);
        return;
      }

      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-action");

      if (action === "start-recording") startRecording();
      else if (action === "stop-recording") stopRecording();
      else if (action === "new-lesson") handleNewLesson();
      else if (action === "delete-lesson") deleteCurrentLesson();
    });

    mainInner.addEventListener("input", (e) => {
      const field = e.target.getAttribute("data-field");
      if (!field) return;
      const lesson = getCurrentLesson();
      if (!lesson) return;

      lesson[field] = e.target.value;
      if (field === "title") renderSidebar();
      saveLessons();
    });
  }

  const chatToggleEl = document.getElementById("chatBubbleToggle");
  if (chatToggleEl) chatToggleEl.addEventListener("click", toggleChat);

  const chatCloseBtn = document.getElementById("chatCloseBtn");
  if (chatCloseBtn) chatCloseBtn.addEventListener("click", toggleChat);

  const chatContainer = document.getElementById("chatBubbleContainer");
  if (chatContainer) {
    chatContainer.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-action");
      if (action === "send-chat") sendChat();
    });

    chatContainer.addEventListener("keydown", (e) => {
      if (e.target.id === "chatInput" && e.key === "Enter") {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // =========================
  //  INIT
  // =========================

  renderApp();
})();