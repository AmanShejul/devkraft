"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, FilePlus2, FileText, LoaderCircle, Send, Upload, WandSparkles, X } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import {
  personalizeDraftQuestions,
  type AssignmentSubmission,
  type DraftQuestion,
  type LearningStage,
  type QuestionDifficulty,
  type TeacherAssignment,
} from "@/features/teacher-portal/question-drafts";
import type { ApiResponse } from "@/types/api";
import type { GeneratedQuestion, TeacherQuizSet, VisualExplanation } from "@/features/teacher-portal/contracts";

const difficultyOptions: QuestionDifficulty[] = ["foundation", "intermediate", "advanced"];
const textDocumentPattern = /\.(txt|md|markdown|csv|js|jsx|ts|tsx|py|java|c|cc|cpp|cs|go|rs|rb|php|html|css|json|sql)$/i;
const presentationPattern = /\.pptx$/i;

export function AssignmentStudio() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [learningStage, setLearningStage] = useState<LearningStage>("diagnostic");
  const [content, setContent] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [visualExplanation, setVisualExplanation] = useState<VisualExplanation | null>(null);
  const [message, setMessage] = useState("");
  const [direction, setDirection] = useState("");
  const [personalizationDifficulty, setPersonalizationDifficulty] = useState<QuestionDifficulty>("intermediate");
  const [generationPreference, setGenerationPreference] = useState<"auto" | "ollama" | "gemini">("auto");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPdfName, setSelectedPdfName] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  useEffect(() => {
    fileInputRef.current?.setAttribute("webkitdirectory", "");
    const toDraft = (question: GeneratedQuestion): DraftQuestion => ({
      id: question.id, prompt: question.prompt, answer: question.correctAnswer, source: question.source.excerpt,
      difficulty: question.difficulty, conceptId: question.conceptId, options: question.options, explanation: question.explanation,
      sourceDocumentId: question.source.documentId, sourcePage: question.source.page,
      reviewStatus: question.reviewStatus, generationStatus: question.generationStatus,
    });
    const refresh = async () => {
      try {
        const response = await fetch("/api/teacher/assignments", { cache: "no-store" });
        const payload = await response.json() as ApiResponse<TeacherQuizSet[]>;
        if (!response.ok || !payload.ok) throw new Error("server unavailable");
        setAssignments(payload.data.map((assignment) => ({ id: assignment.id, topicId: assignment.topicId, title: assignment.title, subject: assignment.subject, topic: assignment.topic, content: assignment.instructions, questions: assignment.questions.map(toDraft), status: assignment.status === "published" ? "published" : "draft", learningStage: assignment.learningStage, createdAt: assignment.createdAt, publishedAt: assignment.publishedAt, visualExplanation: assignment.visualExplanation })));
      } catch {
        setAssignments([]);
        setMessage("Saved assignments are unavailable right now. You can still prepare a draft and try again.");
      }
    };
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function personalizeQuestions() {
    if (questions.length === 0) {
      setMessage("Generate question drafts first, then add a direction to personalize them.");
      return;
    }
    setQuestions((current) => personalizeDraftQuestions(current, direction, personalizationDifficulty));
    setMessage("Questions personalized locally. Review the wording and answer keys before adding the kit to the student portal.");
  }

  async function processContentFiles(files: File[]) {
    if (files.length === 0) return;
    const supportedFiles = files.filter((file) => file.type === "application/pdf"
      || file.type.startsWith("text/")
      || /\.pdf$/i.test(file.name)
      || presentationPattern.test(file.name)
      || textDocumentPattern.test(file.name));
    if (supportedFiles.length === 0) {
      setMessage("Drop a course file or your notes here.");
      return;
    }
    setSelectedFiles(supportedFiles);
    const firstDocument = supportedFiles.find((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") || presentationPattern.test(file.name) || textDocumentPattern.test(file.name));
    setSelectedPdfName(firstDocument?.name ?? "");
    const textFiles = supportedFiles.filter((file) => /text\/(plain|csv|markdown)/.test(file.type) || textDocumentPattern.test(file.name));
    if (textFiles.length > 0) {
      const extractedText = await Promise.all(textFiles.map((file) => file.text()));
      setContent((current) => [current.trim(), ...extractedText].filter(Boolean).join("\n\n"));
    }
    setMessage(firstDocument
      ? `${supportedFiles.length} file${supportedFiles.length === 1 ? "" : "s"} selected. Choose a document below, then generate questions from it.`
      : `${supportedFiles.length} text file${supportedFiles.length === 1 ? "" : "s"} added to the teaching content.`);
  }

  async function handleContentFiles(event: React.ChangeEvent<HTMLInputElement>) {
    await processContentFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleContentDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);
    void processContentFiles(Array.from(event.dataTransfer.files));
  }

  function handleContentPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const clipboardFiles = Array.from(event.clipboardData.files);
    if (clipboardFiles.length > 0) {
      event.preventDefault();
      void processContentFiles(clipboardFiles);
      return;
    }
    const pastedText = event.clipboardData.getData("text/plain").trim();
    if (pastedText) {
      event.preventDefault();
      setContent((current) => [current.trim(), pastedText].filter(Boolean).join("\n\n"));
      setMessage("Pasted teaching notes into the content area.");
    }
  }

  async function generateQuestionsFromMaterial() {
    const selectedFile = selectedFiles.find((item) => item.name === selectedPdfName);
    const file = selectedFile ?? (content.trim() ? new File([content], "pasted-notes.txt", { type: "text/plain" }) : null);
    if (!file) {
      setMessage("Add or paste some teaching material first.");
      return;
    }
    setGeneratingPdf(true);
    setGenerationFailed(false);
    setMessage("Preparing question drafts from your material…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("direction", direction);
      form.append("subject", subject);
      form.append("topic", topic);
      form.append("difficulty", personalizationDifficulty);
      form.append("generationPreference", generationPreference);
      form.append("learningStage", learningStage);
      form.append("count", learningStage === "diagnostic" ? "5" : "7");
      const response = await fetch("/api/teacher/questions", { method: "POST", body: form, signal: AbortSignal.timeout(240_000) });
      const payload = await response.json() as ApiResponse<{ questions: GeneratedQuestion[]; requestedCount: number; visualExplanation: VisualExplanation | null; sourceFile: string; difficulty: QuestionDifficulty; generationProvider: "gemini" | "ollama" }>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Questions could not be created right now." : payload.error.message);
      const generatedQuestions = payload.data.questions.map((question) => ({ id: question.id, prompt: question.prompt, answer: question.correctAnswer, source: question.source.excerpt, difficulty: question.difficulty, options: question.options, explanation: question.explanation, sourceDocumentId: question.source.documentId, sourcePage: question.source.page, reviewStatus: "draft" as const, generationStatus: question.generationStatus }));
      setQuestions(generatedQuestions);
      setVisualExplanation(payload.data.visualExplanation);
      setContent((current) => current || `Questions generated from ${payload.data.sourceFile}.`);
      const providerName = payload.data.generationProvider === "ollama" ? "local Ollama" : "Gemini";
      setGenerationFailed(false);
      const questionCount = payload.data.questions.length;
      const questionCountLabel = questionCount < payload.data.requestedCount ? `${questionCount} of ${payload.data.requestedCount} requested` : `${questionCount}`;
      const canPublishAutomatically = Boolean(title.trim() && subject.trim() && topic.trim())
        && generatedQuestions.every((question) => question.generationStatus === "grounded")
        && (learningStage === "diagnostic" ? generatedQuestions.length >= 4 && generatedQuestions.length <= 5 : generatedQuestions.length >= 6 && generatedQuestions.length <= 7);
      if (canPublishAutomatically) {
        const published = await saveAssignment("published", generatedQuestions, payload.data.visualExplanation);
        if (published) {
          setMessage(`Created ${questionCountLabel} questions from ${payload.data.sourceFile} using ${providerName} and published them to the student portal.`);
        } else {
          setGenerationFailed(true);
        }
      } else {
        setMessage(`Created ${questionCountLabel} editable questions from ${payload.data.sourceFile} using ${providerName}. Add the assignment details and review any flagged questions before publishing.`);
      }
    } catch (error) {
      setGenerationFailed(true);
      setMessage(error instanceof Error ? error.message : "Questions could not be created from this material.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  function verifyQuestion(id: string) {
    updateQuestion(id, { generationStatus: "grounded", reviewStatus: "reviewed" });
  }

  async function saveAssignment(status: "draft" | "published", questionList = questions, visualGuide = visualExplanation): Promise<boolean> {
    if (!title.trim() || !subject.trim() || !topic.trim() || questionList.length === 0) {
      setMessage("Add a title, subject, topic, and at least one question before saving.");
      return false;
    }
    if (status === "published" && (learningStage === "diagnostic" ? questionList.length < 4 || questionList.length > 5 : questionList.length < 6 || questionList.length > 7)) {
      setMessage(learningStage === "diagnostic" ? "A published diagnostic needs 4 to 5 questions. Generate or prepare more questions before publishing." : "A published follow-up set needs 6 to 7 questions. Generate or prepare more questions before publishing.");
      return false;
    }

    const existing = assignments.find((assignment) => assignment.id === assignmentId);
    const existingTopic = assignments.find((item) => item.subject.trim().toLowerCase() === subject.trim().toLowerCase()
      && item.topic.trim().toLowerCase() === topic.trim().toLowerCase());
    const resolvedTopicId = topicId ?? existingTopic?.topicId ?? crypto.randomUUID();
    const assignment: TeacherAssignment = {
      id: assignmentId ?? crypto.randomUUID(),
      topicId: resolvedTopicId,
      title: title.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      content: content.trim(),
      questions: questionList,
      visualExplanation: visualGuide,
      status,
      learningStage,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(selectedFiles.length > 0 ? { sourceFiles: selectedFiles.map((file) => file.webkitRelativePath || file.name) } : {}),
      ...(status === "published" ? { publishedAt: new Date().toISOString() } : {}),
    };

    const payloadQuestions = questionList.map((question) => ({
      id: question.id, type: question.options && question.options.length > 1 ? "mcq" : "short-answer", prompt: question.prompt,
      ...(question.options && question.options.length > 1 ? { options: question.options } : {}), correctAnswer: question.answer,
      explanation: question.explanation ?? "Review the supporting source excerpt before using this answer.", subject: subject.trim(), topic: topic.trim(), conceptId: question.conceptId ?? null,
      difficulty: question.difficulty, source: { documentId: question.sourceDocumentId ?? "manual-content", documentName: selectedFiles[0]?.name ?? "Teacher notes", page: question.sourcePage ?? null, excerpt: question.source },
      generationStatus: question.generationStatus ?? "needs-review", reviewStatus: status === "published" ? "published" : (question.reviewStatus ?? "draft"),
    }));
    try {
      const response = await fetch("/api/teacher/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: assignment.id, topicId: assignment.topicId, title: assignment.title, subject: assignment.subject, topic: assignment.topic, instructions: assignment.content, learningStage, status, visualExplanation: visualGuide, questions: payloadQuestions }) });
      const payload = await response.json() as ApiResponse<TeacherQuizSet>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Assignment could not be saved." : payload.error.message);
      setAssignmentId(payload.data.id);
      setTopicId(payload.data.topicId);
      setAssignments((current) => [{ ...assignment, id: payload.data.id, topicId: payload.data.topicId, learningStage, status }, ...current.filter((item) => item.id !== payload.data.id)]);
      setMessage(status === "published" ? "Assignment published to the student portal." : "Draft saved to the server.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment could not be saved.");
      return false;
    }
  }

  function editDraft(assignment: TeacherAssignment) {
    setAssignmentId(assignment.id);
    setTopicId(assignment.topicId);
    setTitle(assignment.title);
    setSubject(assignment.subject);
    setTopic(assignment.topic);
    setLearningStage(assignment.learningStage ?? "diagnostic");
    setContent(assignment.content);
    setQuestions(assignment.questions);
    setVisualExplanation(assignment.visualExplanation ?? null);
    setMessage("Draft loaded for editing.");
  }

  function createFollowUpStage() {
    if (!topicId) return;
    setAssignmentId(null);
    setTitle("");
    setQuestions([]);
    setVisualExplanation(null);
    setLearningStage("practice");
    setMessage("Create follow-up questions for this same topic. The topic ID is retained.");
  }

  const published = assignments.filter((assignment) => assignment.status === "published");
  const recentSubmissions: AssignmentSubmission[] = [];

  return (
    <div className="space-y-5">
      <SectionCard className="overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(31,36,41,.94),rgba(14,17,20,.98))]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand shadow-[0_0_30px_rgba(232,185,106,.1)]"><FilePlus2 size={18} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand">Assignment studio</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.03em] text-ink">Create a student assignment</h2>
            <p className="mt-1 text-xs leading-5 text-muted">Add teaching content and generate a student-ready question set. Flagged questions remain drafts for review.</p>
          </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Grounded sets auto-publish</span>
        </div>

        <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.txt,.md,.markdown,.csv,.js,.jsx,.ts,.tsx,.py,.java,.c,.cc,.cpp,.cs,.go,.rs,.rb,.php,.html,.css,.json,.sql" className="sr-only" onChange={(event) => void handleContentFiles(event)} />
        <div className="mt-6 grid gap-2 border-y border-white/10 py-4 sm:grid-cols-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/35 bg-brand/[.06] px-3 py-3 text-xs font-bold text-brand transition hover:border-brand hover:bg-brand/[.12]"><Upload size={15} /> Add content</button>
          <button type="button" onClick={() => void generateQuestionsFromMaterial()} disabled={generatingPdf || (!content.trim() && !selectedPdfName)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.02] px-3 py-3 text-xs font-bold text-white/75 transition hover:border-brand/40 hover:bg-white/[.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><WandSparkles size={15} /> {generatingPdf ? "Creating questions" : selectedPdfName ? "Generate from file" : "Generate the Qs"}</button>
          <button type="button" onClick={personalizeQuestions} disabled={questions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.02] px-3 py-3 text-xs font-bold text-white/75 transition hover:border-brand/40 hover:bg-white/[.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><WandSparkles size={15} /> Personalize the Qs</button>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload teaching files by dropping them here or opening the file picker"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
          onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDraggingFiles(false); }}
          onDrop={handleContentDrop}
          onPaste={handleContentPaste}
          className={`mt-4 cursor-pointer rounded-xl border border-dashed px-4 py-5 text-center transition focus:outline-none focus:ring-2 focus:ring-brand/60 ${isDraggingFiles ? "border-brand bg-brand/[.12]" : "border-white/15 bg-white/[.02] hover:border-brand/50"}`}
        >
          <Upload size={18} className={`mx-auto ${isDraggingFiles ? "text-brand" : "text-white/40"}`} />
          <p className="mt-2 text-xs font-semibold text-white/75">Drag and drop files here</p>
          <p className="mt-1 text-[11px] text-muted">or click / paste to add course files and notes</p>
        </div>

        {selectedFiles.length > 0 && <div className="mt-4 rounded-xl border border-brand/20 bg-brand/[.05] p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-brand">Selected content</p><p className="mt-1 text-[11px] text-muted">Folder picker results · {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}</p></div><button type="button" aria-label="Clear selected content" onClick={() => { setSelectedFiles([]); setSelectedPdfName(""); }} className="text-white/40 hover:text-white"><X size={15} /></button></div>
          <div className="mt-3 space-y-2">{selectedFiles.map((file) => { const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"); const isPresentation = presentationPattern.test(file.name); const isTextDocument = textDocumentPattern.test(file.name) || file.type.startsWith("text/"); return <button key={`${file.name}-${file.size}`} type="button" onClick={() => (isPdf || isPresentation || isTextDocument) && setSelectedPdfName(file.name)} className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs ${selectedPdfName === file.name ? "border-brand bg-brand-soft text-ink" : "border-white/10 text-white/60"}`}><FileText size={14} className={isPdf || isPresentation || isTextDocument ? "text-brand" : "text-white/35"} /><span className="min-w-0 flex-1 truncate">{file.webkitRelativePath || file.name}</span><span className="text-[10px] text-white/35">{Math.ceil(file.size / 1024)} KB</span></button>; })}</div>
          {selectedPdfName && <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3"><span className="text-xs text-muted">Document selected: <strong className="text-ink">{selectedPdfName}</strong></span><button type="button" onClick={() => void generateQuestionsFromMaterial()} disabled={generatingPdf} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-[#171411] disabled:opacity-60">{generatingPdf ? <LoaderCircle size={14} className="animate-spin" /> : <WandSparkles size={14} />} Generate questions from this file</button></div>}
          <p className="mt-3 text-[11px] leading-5 text-muted">Your material stays in the lesson workflow. You can also paste notes directly or use the file picker.</p>
        </div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-white/75">Assignment title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Relational database basics" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
          </label>
          <label className="text-xs font-semibold text-white/75">Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Database Management Systems" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
          </label>
          <label className="text-xs font-semibold text-white/75 sm:col-span-2">Topic
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Relational model" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
          </label>
          <label className="text-xs font-semibold text-white/75">Learning stage
            <select value={learningStage} onChange={(event) => setLearningStage(event.target.value as LearningStage)} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand">
              <option value="diagnostic">Diagnostic · 5 questions</option>
              <option value="practice">Follow-up practice · 7 questions</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-white/75 sm:col-span-2">Teaching content
            <textarea ref={contentRef} value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="Paste notes or explanations here. Draft questions are created from complete sentences in this text." className="mt-2 w-full resize-y border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm leading-6 text-ink outline-none focus:border-brand" />
          </label>
          <label className="text-xs font-semibold text-white/75 sm:col-span-2">Personalization direction <span className="font-normal text-white/40">(optional)</span>
            <input value={direction} onChange={(event) => setDirection(event.target.value)} placeholder="e.g. Use beginner-friendly real-world scenarios" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
          </label>
          <label className="text-xs font-semibold text-white/75 sm:col-span-2">Question generation model
            <select value={generationPreference} onChange={(event) => setGenerationPreference(event.target.value as "auto" | "ollama" | "gemini")} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand">
              <option value="auto">Automatic: Gemini with local fallback</option>
              <option value="ollama">Local Ollama</option>
              <option value="gemini">Gemini only</option>
            </select>
            <span className="mt-1 block font-normal leading-5 text-muted">Choose local Ollama if you want to bypass Gemini for this generation.</span>
          </label>
          <label className="text-xs font-semibold text-white/75">Target level
            <select value={personalizationDifficulty} onChange={(event) => setPersonalizationDifficulty(event.target.value as QuestionDifficulty)} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand">
              {difficultyOptions.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => contentRef.current?.focus()} className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-brand"><FilePlus2 size={14} /> Or paste notes manually</button>
          {topicId && <button type="button" onClick={createFollowUpStage} className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold text-brand hover:border-brand">Create another stage for this topic</button>}
          {questions.length > 0 && <span className="text-xs text-muted">{questions.length} drafts ready to review</span>}
        </div>

        {questions.length > 0 && (
          <div className="mt-6 space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="border border-[var(--line)] bg-[#111518] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">Question {index + 1}</h3>
                  <label className="sr-only" htmlFor={`difficulty-${question.id}`}>Question {index + 1} difficulty</label>
                  <select id={`difficulty-${question.id}`} value={question.difficulty} onChange={(event) => updateQuestion(question.id, { difficulty: event.target.value as QuestionDifficulty })} className="border border-[var(--line)] bg-[#0b0d0f] px-2 py-2 text-xs text-ink">
                    {difficultyOptions.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                  </select>
                </div>
                <label className="block text-xs font-semibold text-white/75">Prompt
                  <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={2} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm leading-5 text-ink outline-none focus:border-brand" />
                </label>
                <label className="mt-3 block text-xs font-semibold text-white/75">Expected answer
                  <input value={question.answer} onChange={(event) => updateQuestion(question.id, { answer: event.target.value })} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
                </label>
                <label className="mt-3 block text-xs font-semibold text-white/75">Concept tag <span className="font-normal text-white/40">(used for weak-concept analysis)</span>
                  <input value={question.conceptId ?? ""} onChange={(event) => updateQuestion(question.id, { conceptId: event.target.value.trim() || null })} placeholder="e.g. bfs-queue" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
                </label>
                {question.options && <label className="mt-3 block text-xs font-semibold text-white/75">Answer choices <span className="font-normal text-white/40">(one per line)</span>
                  <textarea value={question.options.join("\n")} onChange={(event) => updateQuestion(question.id, { options: event.target.value.split(/\r?\n/).map((option) => option.trim()).filter(Boolean) })} rows={4} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm leading-5 text-ink outline-none focus:border-brand" />
                </label>}
                <p className="mt-3 border-l-2 border-brand/50 pl-3 text-xs leading-5 text-muted"><strong className="text-white/70">Source:</strong> {question.source}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className={`text-[10px] font-bold uppercase tracking-[.1em] ${question.generationStatus === "needs-review" ? "text-amber-300" : "text-emerald-300"}`}>{question.generationStatus === "needs-review" ? "Needs a quick check" : question.reviewStatus === "reviewed" ? "Ready to publish" : "Draft question"}</span>
                  {question.reviewStatus !== "reviewed" && <button type="button" onClick={() => verifyQuestion(question.id)} className="border border-brand/40 px-2.5 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/10">Mark as checked</button>}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => saveAssignment("draft")} className="inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-sm font-semibold text-ink hover:border-brand"><Check size={15} /> Save draft</button>
              <button type="button" onClick={() => saveAssignment("published")} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark"><Send size={15} /> Add kit to student portal</button>
            </div>
          </div>
        )}

        {message && <p role={generationFailed ? "alert" : "status"} aria-live={generationFailed ? "assertive" : "polite"} className={`mt-4 text-xs leading-5 ${generationFailed ? "text-[#ffb3aa]" : "text-muted"}`}>{message}</p>}
        {generationFailed && <button type="button" onClick={() => void generateQuestionsFromMaterial()} disabled={generatingPdf || (!content.trim() && !selectedPdfName)} className="mt-3 inline-flex items-center gap-2 border border-brand/40 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"><WandSparkles size={14} /> Retry generation</button>}
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-[11px] leading-5 text-muted">Saved assignments are loaded from the connected workspace. Nothing is shown until it has been saved.</p>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-[#202c3a] text-[#b8d4f0]"><BookOpen size={18} /></span>
          <div><h2 className="text-lg font-bold text-ink">Published assignments</h2><p className="mt-1 text-xs text-muted">Assignments currently visible in the student portal.</p></div>
        </div>
        {published.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">Nothing published yet.</p> : (
          <div className="mt-4 divide-y divide-[var(--line)]">
            {published.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-2"><div><h3 className="text-sm font-semibold text-ink">{assignment.title}</h3><p className="mt-1 text-xs text-muted">{assignment.subject} · {assignment.topic} · {assignment.questions.length} questions</p></div><span className="border border-[#526c55] px-2.5 py-1 text-[10px] font-bold uppercase text-[#a9d9ad]">Published</span></div>)}
          </div>
        )}
        {assignments.some((assignment) => assignment.status === "draft") && <div className="mt-4 border-t border-[var(--line)] pt-4"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-muted">Saved drafts</h3><div className="mt-2 space-y-2">{assignments.filter((assignment) => assignment.status === "draft").map((assignment) => <button key={assignment.id} type="button" onClick={() => editDraft(assignment)} className="block text-left text-sm font-semibold text-brand hover:text-brand-dark">Edit {assignment.title}</button>)}</div></div>}
      </SectionCard>

      <SectionCard>
        <div><h2 className="text-lg font-bold text-ink">Student submissions</h2><p className="mt-1 text-xs text-muted">Results will appear after students submit published assignments.</p></div>
        {recentSubmissions.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">No student submissions yet.</p> : (
          <div className="mt-4 divide-y divide-[var(--line)]">
            {recentSubmissions.map((submission) => {
              const assignment = assignments.find((item) => item.id === submission.assignmentId);
              const correct = submission.results.filter((result) => result.correct).length;
              return <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-ink">{submission.learner}</p><p className="mt-1 text-xs text-muted">{assignment?.title ?? "Assignment"} · {new Date(submission.submittedAt).toLocaleString()}</p></div><span className="text-sm font-bold text-brand">{correct}/{submission.results.length}</span></div>;
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
