"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Clock3, RotateCcw, Send } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { VisualExplanationSection } from "@/components/learning/visual-explanation";
import { LEARNING_CONFIG } from "@/config/learning";
import type { GeneratedQuestion, TeacherQuizSet, VisualExplanation } from "@/features/teacher-portal/contracts";
import type { LearningEventType } from "@/features/student-portal/events";
import type { ApiResponse } from "@/types/api";

type StudentAssignment = Pick<TeacherQuizSet, "id" | "topicId" | "learningStage" | "title" | "subject" | "topic" | "availableFrom" | "dueAt" | "visualExplanation"> & {
  questions: Array<Pick<GeneratedQuestion, "id" | "type" | "prompt" | "options" | "topic" | "difficulty" | "conceptId">>;
};

type AttemptResult = {
  duplicate: boolean;
  learningStage: "diagnostic" | "practice";
  score: number;
  total: number;
  feedback: Array<{ questionId: string; response: string; correct: boolean; topic: string; difficulty: string; conceptId: string | null; explanation: string }>;
  recommendation: { mission: { title: string; description: string }; reason: string } | null;
};

type StudentProgress = {
  summary: { availableTopics: number; startedTopics: number; completedTopics: number; completionPercent: number; diagnosticAverage: number | null; practiceAverage: number | null };
  topics: Array<{ topicId: string; subject: string; topic: string; title: string; diagnosticAssignmentId: string | null; practiceAssignmentIds: string[]; diagnosticAttempts: number; practiceAttempts: number; latestScore: { score: number; total: number; stage: string } | null; started: boolean; completed: boolean; weakConcepts: Array<{ conceptId: string; incorrectResponses: number }>; lastActivityAt: string | null }>;
  weakConcepts: Array<{ conceptId: string; incorrectResponses: number; topic: string; subject: string }>;
  recentActivity: Array<{ id: string; type: string; assignmentId: string; learningStage?: string; score?: number; total?: number; occurredAt: string }>;
  recommendedNext: { topicId: string; topic: string; subject: string; stage: string } | null;
};

type Phase = "overview" | "diagnostic" | "explanation" | "practice" | "complete";

async function readApi<T>(response: Response): Promise<T> {
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.ok ? "The request could not be completed." : payload.error.message);
  return payload.data;
}

export function LearningPortal() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("overview");
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const idempotencyKey = useRef<string | null>(null);

  async function refreshProgress() {
    const data = await readApi<StudentProgress>(await fetch("/api/student/progress", { cache: "no-store" }));
    setProgress(data);
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [assignmentData, progressData] = await Promise.all([
          readApi<StudentAssignment[]>(await fetch("/api/student/assignments", { cache: "no-store" })),
          readApi<StudentProgress>(await fetch("/api/student/progress", { cache: "no-store" })),
        ]);
        if (active) {
          setAssignments(assignmentData);
          setProgress(progressData);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Your learning data could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };
    const refreshPublishedAssignments = async () => {
      try {
        const assignmentData = await readApi<StudentAssignment[]>(await fetch("/api/student/assignments", { cache: "no-store" }));
        if (active) setAssignments(assignmentData);
      } catch (refreshError) {
        if (active) setError(refreshError instanceof Error ? refreshError.message : "Published topics could not be refreshed.");
      }
    };
    void load();
    const refreshOnFocus = () => void refreshPublishedAssignments();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshPublishedAssignments();
    };
    const refreshTimer = window.setInterval(refreshOnFocus, 15_000);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const groupedTopics = new Map<string, StudentAssignment[]>();
  for (const assignment of assignments) {
    const group = groupedTopics.get(assignment.topicId) ?? [];
    group.push(assignment);
    groupedTopics.set(assignment.topicId, group);
  }
  const topics = [...groupedTopics.entries()].map(([topicId, topicAssignments]) => ({
    topicId,
    assignments: topicAssignments,
    diagnostic: topicAssignments.find((assignment) => assignment.learningStage === "diagnostic") ?? null,
    practice: topicAssignments.filter((assignment) => assignment.learningStage === "practice"),
    visualExplanation: topicAssignments.find((assignment) => assignment.visualExplanation)?.visualExplanation ?? null,
  }));
  const activeTopic = topics.find((topic) => topic.topicId === activeTopicId) ?? null;
  const activeAssignment = activeTopic?.assignments.find((assignment) => assignment.id === activeAssignmentId) ?? null;
  const weakConcepts = result?.feedback.filter((item) => !item.correct).map((item) => item.conceptId || item.topic) ?? [];
  const uniqueWeakConcepts = [...new Set(weakConcepts)];

  async function recordEvent(type: LearningEventType, assignment: StudentAssignment, conceptId?: string) {
    const response = await fetch("/api/student/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, topicId: assignment.topicId, type, ...(conceptId ? { conceptId } : {}) }),
    });
    await readApi(await response);
  }

  function openTopic(topicId: string) {
    setActiveTopicId(topicId);
    setActiveAssignmentId(null);
    setPhase("overview");
    setResult(null);
    setAnswers({});
    idempotencyKey.current = null;
    setError("");
    const topic = topics.find((item) => item.topicId === topicId);
    if (topic?.diagnostic) void recordEvent("topic_opened", topic.diagnostic).catch((eventError: unknown) => setError(eventError instanceof Error ? eventError.message : "Topic activity could not be saved."));
  }

  function startDiagnostic() {
    if (!activeTopic?.diagnostic) return;
    idempotencyKey.current = null;
    setActiveAssignmentId(activeTopic.diagnostic.id);
    setAnswers({});
    setResult(null);
    setPhase("diagnostic");
  }

  function startPractice() {
    if (!activeTopic || activeTopic.practice.length === 0) return;
    const candidates = activeTopic.practice.map((assignment) => ({
      assignment,
      matched: assignment.questions.filter((question) => !uniqueWeakConcepts.length || uniqueWeakConcepts.includes(question.conceptId ?? question.topic)).length,
    })).sort((left, right) => right.matched - left.matched);
    const selected = candidates[0]?.assignment;
    if (!selected) return;
    idempotencyKey.current = null;
    setActiveAssignmentId(selected.id);
    setAnswers({});
    setPhase("practice");
    void recordEvent("explanation_viewed", activeTopic.diagnostic ?? selected).catch((eventError: unknown) => setError(eventError instanceof Error ? eventError.message : "Learning activity could not be saved."));
    for (const conceptId of uniqueWeakConcepts) {
      void recordEvent("concept_revisited", activeTopic.diagnostic ?? selected, conceptId).catch((eventError: unknown) => setError(eventError instanceof Error ? eventError.message : "Learning activity could not be saved."));
    }
  }

  async function submitAssignment() {
    if (!activeAssignment || pending) return;
    if (activeAssignment.questions.some((question) => !answers[question.id]?.trim())) {
      setError("Answer every question before submitting.");
      return;
    }
    setPending(true);
    setError("");
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/student/assignments/${activeAssignment.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: idempotencyKey.current, answers }),
      });
      const attempt = await readApi<AttemptResult>(response);
      idempotencyKey.current = null;
      setResult(attempt);
      setPhase("explanation");
      const eventType = attempt.learningStage === "diagnostic" ? "diagnostic_completed" : "practice_completed";
      await recordEvent(eventType, activeAssignment);
      if (attempt.learningStage === "practice" && attempt.total > 0 && attempt.score / attempt.total >= LEARNING_CONFIG.masteryThreshold) {
        await recordEvent("topic_completed", activeAssignment);
        setPhase("complete");
      }
      await refreshProgress();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your answers could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return <div className="space-y-5">
    {progress && <div className="grid gap-3 sm:grid-cols-3">
      {[
        { label: "Published topics", value: progress.summary.availableTopics },
        { label: "Topics completed", value: `${progress.summary.completedTopics}/${progress.summary.availableTopics}` },
        { label: "Assessment average", value: progress.summary.practiceAverage === null ? "Not measured" : `${progress.summary.practiceAverage}%` },
      ].map((item) => <SectionCard key={item.label} className="p-4 sm:p-5"><p className="text-xs font-semibold text-muted">{item.label}</p><p className="mt-3 text-2xl font-extrabold text-ink">{item.value}</p><p className="mt-1 text-[11px] text-muted">Calculated from saved activity</p></SectionCard>)}
    </div>}

    {!activeTopicId && <SectionCard>
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center bg-brand-soft text-brand"><BookOpenCheck size={18} /></span><div><h2 className="text-lg font-bold text-ink">Published topics</h2><p className="mt-1 text-xs leading-5 text-muted">Choose a teacher-published topic to begin its diagnostic.</p></div></div>
      {loading ? <p role="status" className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">Loading published topics…</p>
        : topics.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">No topics are published yet. Your teacher’s topics will appear here.</p>
          : <div className="mt-4 divide-y divide-[var(--line)]">{topics.map((topic) => {
            const summary = progress?.topics.find((item) => item.topicId === topic.topicId);
            return <article key={topic.topicId} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand">{topic.assignments[0]?.subject}</p><h3 className="mt-1 text-sm font-bold text-ink">{topic.assignments.find((assignment) => assignment.learningStage === "diagnostic")?.topic ?? topic.assignments[0]?.topic}</h3><p className="mt-1 text-xs text-muted">{topic.diagnostic?.questions.length ?? 0} diagnostic questions · {topic.practice.reduce((total, assignment) => total + assignment.questions.length, 0)} practice questions</p>{summary?.weakConcepts[0] && <p className="mt-1 text-xs text-amber-300">Revisit: {summary.weakConcepts.map((item) => item.conceptId).join(", ")}</p>}</div><div className="flex items-center gap-3"><span className="text-xs text-muted">{summary?.completed ? "Complete" : summary?.started ? "In progress" : "Not started"}</span><button type="button" onClick={() => openTopic(topic.topicId)} className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink hover:border-brand">Open topic <ArrowRight size={14} /></button></div></article>;
          })}</div>}
    </SectionCard>}

    {activeTopic && <SectionCard>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4"><div><button type="button" onClick={() => { setActiveTopicId(null); setActiveAssignmentId(null); setPhase("overview"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"><ArrowLeft size={14} /> All topics</button><p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-brand">{activeTopic.assignments[0]?.subject}</p><h2 className="mt-1 text-xl font-bold text-ink">{activeTopic.assignments[0]?.topic}</h2><p className="mt-1 text-xs text-muted">{activeTopic.assignments.find((assignment) => assignment.learningStage === "diagnostic")?.title ?? activeTopic.assignments[0]?.title}</p></div><span className="border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold uppercase text-muted">{phase === "overview" ? "Ready" : phase === "complete" ? "Complete" : phase}</span></div>

      {phase === "overview" && <div className="mt-5 space-y-4">
        <p className="text-sm leading-6 text-muted">{activeTopic.visualExplanation?.summary ?? "Your teacher has published this topic. Start with its diagnostic to measure what you already understand."}</p>
        <p className="text-xs text-muted">{activeTopic.diagnostic ? `${activeTopic.diagnostic.questions.length} diagnostic questions` : "No diagnostic has been published for this topic yet."} · {activeTopic.practice.reduce((total, assignment) => total + assignment.questions.length, 0)} follow-up questions available</p>
        {activeTopic.diagnostic && <button type="button" onClick={startDiagnostic} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark">Start diagnostic <ArrowRight size={15} /></button>}
      </div>}

      {(phase === "diagnostic" || phase === "practice") && activeAssignment && <div className="mt-5 space-y-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-brand">{phase === "diagnostic" ? "Starting diagnostic" : "Follow-up practice"}</p><p className="mt-1 text-xs text-muted">{activeAssignment.questions.length} teacher-authored questions</p></div>
        {activeAssignment.questions.map((question, index) => <fieldset key={question.id} className="border-t border-[var(--line)] pt-4 text-sm font-semibold leading-6 text-ink"><legend>{index + 1}. {question.prompt}</legend>{question.options?.length ? <div className="mt-2 grid gap-2">{question.options.map((option) => <label key={option} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-normal text-white/75 hover:border-brand"><input type="radio" name={`${activeAssignment.id}-${question.id}`} value={option} checked={answers[question.id] === option} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />{option}</label>)}</div> : <input value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand" />}</fieldset>)}
        <button type="button" onClick={() => void submitAssignment()} disabled={pending} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark disabled:opacity-50">{pending ? <Clock3 size={15} className="animate-spin" /> : <Send size={15} />} {pending ? "Scoring and saving…" : "Submit answers"}</button>
      </div>}

      {phase === "explanation" && result && <div className="mt-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-ink">{result.score}/{result.total} correct</p><p className="text-xs text-muted">{result.learningStage === "diagnostic" ? "Diagnostic result" : "Practice result"} · saved to your history</p></div>
        {uniqueWeakConcepts.length > 0 ? <p className="text-xs leading-5 text-amber-300">Review these concepts before continuing: {uniqueWeakConcepts.join(", ")}</p> : <p className="text-xs leading-5 text-emerald-300">No weak concepts were detected in this attempt.</p>}
        <div className="space-y-3">{result.feedback.map((item, index) => {
          const question = activeAssignment?.questions.find((candidate) => candidate.id === item.questionId)
            ?? activeTopic.assignments.flatMap((assignment) => assignment.questions).find((candidate) => candidate.id === item.questionId);
          return <div key={item.questionId} className="border-t border-[var(--line)] pt-3"><p className={`text-xs font-bold ${item.correct ? "text-emerald-300" : "text-amber-300"}`}>Question {index + 1} · {item.correct ? "Correct" : "Review"}</p><p className="mt-1 text-xs text-white/70">{question?.prompt}</p><p className="mt-1 text-xs leading-5 text-muted">{item.explanation}</p></div>;
        })}</div>
        {result.learningStage === "diagnostic" && activeTopic.practice.length > 0 && <button type="button" onClick={startPractice} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark">Continue to follow-up practice <ArrowRight size={15} /></button>}
        {result.learningStage === "diagnostic" && activeTopic.practice.length === 0 && <p className="text-xs text-muted">Your teacher has not published follow-up practice for this topic yet.</p>}
        {result.learningStage === "practice" && <button type="button" onClick={startPractice} className="inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-sm font-semibold text-ink hover:border-brand"><RotateCcw size={15} /> Revisit practice</button>}
      </div>}

      {phase === "complete" && result && <div className="mt-5 space-y-3"><p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 size={17} /> Topic mastery threshold reached</p><p className="text-sm text-muted">Your latest practice score was {result.score}/{result.total}. Progress is saved.</p><button type="button" onClick={() => { setActiveTopicId(null); setActiveAssignmentId(null); setPhase("overview"); setResult(null); void refreshProgress(); }} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark">Return to topics <ArrowRight size={15} /></button></div>}
    </SectionCard>}

    {activeTopic?.visualExplanation && <VisualExplanationSection guides={[{ id: activeTopic.topicId, title: activeTopic.assignments[0]?.title ?? activeTopic.assignments[0]?.topic ?? "Topic", visualExplanation: activeTopic.visualExplanation as VisualExplanation }]} />}
    {error && <p role="alert" className="text-sm text-[#ffb3aa]">{error}</p>}

    {progress && <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard><h2 className="text-lg font-bold text-ink">Concepts to revisit</h2><p className="mt-1 text-xs text-muted">Based on incorrect answers from saved attempts.</p>{progress.weakConcepts.length === 0 ? <p className="mt-4 text-sm text-muted">No weak concepts recorded yet.</p> : <div className="mt-4 space-y-2">{progress.weakConcepts.slice(0, 6).map((item) => <p key={`${item.subject}-${item.topic}-${item.conceptId}`} className="flex justify-between gap-3 border-t border-[var(--line)] pt-2 text-xs"><span className="text-ink">{item.conceptId}</span><span className="text-muted">{item.topic} · {item.incorrectResponses} missed</span></p>)}</div>}</SectionCard>
      <SectionCard><h2 className="text-lg font-bold text-ink">Recent learning activity</h2>{progress.recentActivity.length === 0 ? <p className="mt-4 text-sm text-muted">Open a topic or complete an assessment to begin your activity history.</p> : <div className="mt-3 divide-y divide-[var(--line)]">{progress.recentActivity.slice(0, 6).map((item) => <p key={item.id} className="flex justify-between gap-3 py-2 text-xs"><span className="text-white/75">{item.type.replaceAll("_", " ")}</span><span className="text-muted">{new Date(item.occurredAt).toLocaleString()}</span></p>)}</div>}</SectionCard>
    </div>}
  </div>;
}
