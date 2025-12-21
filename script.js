(function () {
  // =========================
  //  SIMPLE AUTH GUARD
  // =========================
  try {
    const rawUser = localStorage.getItem("lexis_user");
    if (!rawUser) {
      window.location.replace("/login/");
      return; // stop running dashboard JS
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

  // Enable Groq backend only when NOT running on localhost
  const IS_LOCAL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const GROQ_ENABLED = !IS_LOCAL;

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
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];

    const byPunc = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (byPunc.length > 1) return byPunc;

    const words = cleaned.split(/\s+/);
    const sentences = [];
    const chunkSize = 20;
    for (let i = 0; i < words.length; i += chunkSize) {
      sentences.push(words.slice(i, i + chunkSize).join(" "));
    }
    return sentences;
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
    if (!sentences.length) return "";

    if (sentences.length <= 4) {
      return sentences.map((s) => "- " + s).join("\n");
    }

    const freqs = {};
    sentences.forEach((s) => {
      s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .forEach((w) => {
          if (w.length < 4 || STOPWORDS.has(w)) return;
          freqs[w] = (freqs[w] || 0) + 1;
        });
    });

    function scoreSentence(s) {
      const words = s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/);
      let score = 0;
      let count = 0;
      words.forEach((w) => {
        if (w.length < 4 || STOPWORDS.has(w)) return;
        score += freqs[w] || 0;
        count++;
      });
      return count ? score / count : 0;
    }

    const scored = sentences.map((s, idx) => ({
      s,
      idx,
      score: scoreSentence(s),
    }));
    scored.sort((a, b) => b.score - a.score);
    const TOP = Math.min(5, scored.length);
    const selected = scored.slice(0, TOP).sort((a, b) => a.idx - b.idx);

    return selected.map((x) => "- " + x.s).join("\n");
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
      (s) => s.split(/\s+/).length >= 6
    );
    if (!sentences.length) return [];

    const keywords = extractKeywords(text, 12);
    if (!keywords.length) return [];

    const quiz = [];
    const usedSentences = new Set();

  function randomChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    for (const kw of keywords) {
      if (quiz.length >= 5) break;

      const lowerKw = kw.toLowerCase();
      const candidateSentence = sentences.find((s) => {
        const key = s.toLowerCase();
        return (
          key.includes(lowerKw) &&
          !usedSentences.has(s) &&
          s.length > 20 &&
          s.length < 240
        );
      });

      if (!candidateSentence) continue;
      usedSentences.add(candidateSentence);

      const questionSentence = candidateSentence.replace(
        new RegExp(kw, "i"),
        "_____"
      );

      const distractorsPool = keywords.filter(
        (k) => k.toLowerCase() !== lowerKw
      );
      const distractors = [];
      while (distractors.length < 3 && distractorsPool.length > 0) {
        const d = randomChoice(distractorsPool);
        if (!distractors.includes(d)) distractors.push(d);
      }
      if (distractors.length < 3) continue;

      const correct = kw;
      const options = shuffle([correct, ...distractors]);

      quiz.push({
        question:
          'Which term best completes the sentence: "' +
          questionSentence +
          '"',
        options,
        answer: correct,
      });
    }

    return quiz;
  }

  function generateFlashcardsFromTranscript(text) {
    const sentences = splitIntoSentences(text);
    const keywords = extractKeywords(text, 6);
    const flashcards = [];

    for (const kw of keywords) {
      let sentence =
        sentences.find((s) =>
          s.toLowerCase().includes(kw.toLowerCase())
        ) || "Appears in the lesson transcript.";

      if (sentence.length > 220) {
        const lower = sentence.toLowerCase();
        const idx = lower.indexOf(kw.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 80);
          const end = Math.min(sentence.length, idx + 140);
          const prefix = start > 0 ? "…" : "";
          const suffix = end < sentence.length ? "…" : "";
          sentence = prefix + sentence.slice(start, end).trim() + suffix;
        } else {
          sentence = sentence.slice(0, 200).trim() + "…";
        }
      }

      flashcards.push({ front: kw, back: sentence });
    }

    return flashcards;
  }

  // ===== SHARE HELPERS =====

  function normalizeField(field) {
    if (typeof field === "string") {
      return field.trim();
    }
    if (Array.isArray(field)) {
      return field.join("\n").trim();
    }
    if (field && typeof field === "object") {
      try {
        return JSON.stringify(field, null, 2).trim();
      } catch {
        return String(field);
      }
    }
    if (field == null) return "";
    return String(field).trim();
  }

  function buildShareText(lesson) {
    const title =
      typeof lesson.title === "string" && lesson.title.trim()
        ? lesson.title.trim()
        : "Untitled lesson";

    const summary = normalizeField(lesson.summary);
    const notes = normalizeField(lesson.notes);

    let text = `Lesson: ${title}\n`;
    if (lesson.createdAt) {
      text += `Date: ${formatDate(lesson.createdAt)}\n\n`;
    } else {
      text += "\n";
    }

    if (summary) {
      text += "Summary:\n" + summary + "\n\n";
    }
    if (notes) {
      text += "Notes:\n" + notes + "\n\n";
    }

    return text.trim();
  }

  async function shareCurrentLesson() {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    const text = buildShareText(lesson);
    console.log("[Lexis] Share invoked. Text length:", text.length);

    // 1) Native share (mostly mobile)
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: lesson.title || "Lexis lesson",
          text,
        });
        return;
      } catch (err) {
        console.log("navigator.share error:", err);
      }
    }

    // 2) Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        alert(
          "Lesson summary and notes copied to clipboard. You can paste and share them anywhere."
        );
        return;
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }

    // 3) Fallback: prompt for manual copy
    try {
      window.prompt(
        "Your browser doesn't support direct sharing here. Copy the text below:",
        text
      );
    } catch (err) {
      console.error("Prompt share fallback failed:", err);
      alert(
        "Sharing is not fully supported in this browser. You can still copy notes manually from the Notes tab."
      );
    }
  }

  // =========================
  //  GROQ BACKEND CALLS
  // =========================

  async function callGroqForLessonArtifacts(transcript) {
    const res = await fetch("/api/lexis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "artifacts", transcript }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("Backend HTTP " + res.status + ": " + txt);
    }

    const data = await res.json();
    if (!data || !data.success || !data.artifacts) {
      throw new Error("Invalid artifacts response from backend");
    }
    return data.artifacts;
  }

  async function callGroqForChat(question, lesson) {
    const contextParts = [];
    if (lesson.notes) contextParts.push("NOTES:\n" + lesson.notes);
    if (lesson.summary) contextParts.push("SUMMARY:\n" + lesson.summary);
    if (lesson.transcript)
      contextParts.push("TRANSCRIPT:\n" + lesson.transcript);

    let context = contextParts.join("\n\n");
    if (context.length > 8000) {
      context = context.slice(context.length - 8000);
    }

    const res = await fetch("/api/lexis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "chat", question, context }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("Backend HTTP " + res.status + ": " + txt);
    }

    const data = await res.json();
    if (!data || !data.success || typeof data.answer !== "string") {
      throw new Error("Invalid chat response from backend");
    }
    return data.answer;
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
  let activeTab = "transcript"; // default tab
  let isRecording = false;
  let isProcessing = false;
  let liveUpdateTimeout = null;
  let stopRequestedByUser = false; // track who stopped recording

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
        "Your browser does not support SpeechRecognition.\nUse Chrome or Edge, or paste your transcript in the Transcript tab."
      );
      return;
    }

    const lesson = getCurrentLesson();
    if (!lesson) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    stopRequestedByUser = false;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }
      lesson.transcript = text.trim();
      saveLessons();

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
      // If the user didn't explicitly stop, auto-restart
      if (!stopRequestedByUser && isRecording) {
        console.log(
          "[Lexis] Speech recognition ended by browser, restarting…"
        );
        try {
          recognition.start();
        } catch (err) {
          console.error("Error restarting recognition:", err);
        }
        return;
      }

      // Otherwise, process as a completed recording
      isRecording = false;
      stopRequestedByUser = false;
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
      stopRequestedByUser = true;
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

    try {
      console.log(
        "[Lexis] Generating study materials from transcript, length =",
        text.length
      );

      const localNotes = generateNotesFromTranscript(text);
      const localSummary = generateSummaryFromTranscript(text);
      const localMindmap = generateMindmapFromTranscript(text);
      const localQuiz = generateQuizFromTranscript(text);
      const localFlashcards = generateFlashcardsFromTranscript(text);

      lesson.notes = localNotes;
      lesson.summary = localSummary;
      lesson.mindmap = localMindmap;
      lesson.quiz = localQuiz;
      lesson.flashcards = localFlashcards;

      saveLessons();
      renderMain();

      if (!GROQ_ENABLED) {
        console.log(
          "[Lexis] GROQ_ENABLED is false → using local materials only"
        );
        return;
      }

      console.log("[Lexis] Calling backend for enhanced materials…");
      const ai = await callGroqForLessonArtifacts(text);

      if (ai.notes) lesson.notes = ai.notes;
      if (ai.summary) lesson.summary = ai.summary;
      if (ai.mindmap) lesson.mindmap = ai.mindmap;
      if (Array.isArray(ai.quiz) && ai.quiz.length > 0) {
        lesson.quiz = ai.quiz;
      }
      if (Array.isArray(ai.flashcards) && ai.flashcards.length > 0) {
        lesson.flashcards = ai.flashcards;
      }

      console.log("[Lexis] Backend enhancement applied.");
    } catch (err) {
      console.error("Error generating lesson artifacts:", err);
      if (GROQ_ENABLED) {
        alert(
          "AI generation failed (see console). Using locally generated materials only."
        );
      }
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

      if (/^[A-D]$/i.test(answer)) {
        const idx = answer.toUpperCase().charCodeAt(0) - 65;
        return idx >= 0 && idx < q.options.length ? idx : -1;
      }

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
                  .join("");

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

            let feedbackText = "";
            if (answered && correctIndex !== -1) {
              if (selectedIndex === correctIndex) {
                feedbackText = "Correct.";
              } else {
                const correctText =
                  q.options && q.options[correctIndex]
                    ? q.options[correctIndex]
                    : q.answer;
                feedbackText = "Incorrect. Correct answer: " + correctText;
              }
            }

            let feedbackHtml = "";
            if (feedbackText) {
              const feedbackClass =
                selectedIndex === correctIndex ? "correct" : "incorrect";
              feedbackHtml =
                '<div class="quiz-feedback ' +
                feedbackClass +
                '">' +
                feedbackText +
                "</div>";
            }

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
    let panelActionsHtml = "";

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
      panelActionsHtml = `
        <button class="generate-btn" data-action="generate-from-text">
          Generate from this transcript
        </button>
      `;
      panelContent = `
        <textarea
          class="textarea"
          data-field="transcript"
          placeholder="Speak using Start recording, or paste/type your transcript here. Then click Generate to create notes, summary, mindmap, quiz & flashcards."
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
          <button class="share-btn" data-action="share-lesson">Share</button>
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
          <div class="panel-actions">
            ${panelActionsHtml}
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
    activeTab = "transcript";
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
    if (lessons.length > 0) {
      selectedLessonId = lessons[0].id;
      activeTab = "transcript";
    } else {
      selectedLessonId = null;
    }

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

  async function sendChat() {
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

    input.value = "";
    saveLessons();
    renderChatBubble();

    if (!GROQ_ENABLED) {
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
      }, 400);
      return;
    }

    const tempId = `${lesson.id}-a-${Date.now()}`;
    lesson.messages.push({
      id: tempId,
      role: "assistant",
      text: "Thinking about this lesson…",
      read: isChatOpen,
    });
    saveLessons();
    renderChatBubble();

    try {
      const answer = await callGroqForChat(text, lesson);
      const msg = lesson.messages.find((m) => m.id === tempId);
      if (msg) {
        msg.text =
          answer ||
          "I'm not completely sure how to answer that based on this lesson, but you can review the notes and summary above.";
      }
    } catch (err) {
      console.error("AI chat error:", err);
      const msg = lesson.messages.find((m) => m.id === tempId);
      if (msg) {
        msg.text =
          "I had trouble contacting the AI service. You can still use the notes, summary, and flashcards above.";
      }
    } finally {
      saveLessons();
      renderChatBubble();
      updateChatBadge();
    }
  }

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
      activeTab = "transcript";
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
      else if (action === "generate-from-text") {
        isProcessing = true;
        renderMain();
        generateArtifactsForCurrentLesson().catch((err) => {
          console.error(err);
          isProcessing = false;
          renderMain();
        });
      } else if (action === "share-lesson") {
        shareCurrentLesson();
      }
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
  //  DEBUG HELPER
  // =========================

  window.lexisGetLesson = function () {
    const lesson = getCurrentLesson();
    return lesson ? JSON.parse(JSON.stringify(lesson)) : null;
  };

  // =========================
  //  INIT
  // =========================

  renderApp();
})();