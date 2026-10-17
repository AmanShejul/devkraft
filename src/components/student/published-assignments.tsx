"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Send } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import type { ApiResponse } from "@/types/api";

interface StudentQuestion { id: string; type: "mcq" | "short-answer"; prompt: string; options?: string[]; topic: string; difficulty: string }
interface StudentAssignment { id: string; title: string; subject: string; topic: string; instructions: string; questions: StudentQuestion[] }
interface AttemptResult { duplicate: boolean; score: number; total: number; feedback?: Array<{ questionId: string; correct: boolean; explanation: string }>; recommendation?: { mission: { title: string; description: string }; reason: string } | null }

export function PublishedAssignments() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<Record<string, AttemptResult>>({});

  useEffect(() => {
    void fetch("/api/student/assignments", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as ApiResponse<StudentAssignment[]>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Assignments could not be loaded." : payload.error.message);
      setAssignments(payload.data);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Assignments could not be loaded."));
  }, []);

  async function submit(assignment: StudentAssignment) {
    if (assignment.questions.some((question) => !answers[question.id]?.trim())) {
      setMessage("Answer every question before submitting.");
      return;
    }
    setMessage("Saving and scoring your attempt…");
    try {
      const response = await fetch(`/api/student/assignments/${assignment.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), answers }) });
      const payload = await response.json() as ApiResponse<AttemptResult>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Your attempt could not be saved." : payload.error.message);
      setSubmitted((current) => ({ ...current, [assignment.id]: payload.data }));
      setOpenAssignment(null);
      setMessage(payload.data.recommendation ? `${payload.data.score}/${payload.data.total}. Next: ${payload.data.recommendation.mission.title} — ${payload.data.recommendation.reason}` : `${payload.data.score}/${payload.data.total}. Your result and mastery update were saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your attempt could not be saved."); }
  }

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center bg-brand-soft text-brand"><BookOpenCheck size={18} /></span>
        <div><h2 className="text-lg font-bold text-ink">Assignments from your teacher</h2><p className="mt-1 text-xs leading-5 text-muted">Only published assignments within their availability window appear here.</p></div>
      </div>
      {assignments.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">{message || "No assignments have been published yet."}</p> : (
        <div className="mt-4 divide-y divide-[var(--line)]">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="py-4 first:pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold text-ink">{assignment.title}</h3><p className="mt-1 text-xs text-muted">{assignment.subject} · {assignment.topic} · {assignment.questions.length} questions</p></div>
                <button type="button" onClick={() => { setOpenAssignment(openAssignment === assignment.id ? null : assignment.id); setMessage(""); }} className="border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink hover:border-brand">{openAssignment === assignment.id ? "Close" : "Open assignment"}</button>
              </div>
              {assignment.instructions && <p className="mt-2 text-xs leading-5 text-muted">{assignment.instructions}</p>}
              {submitted[assignment.id] && <p className="mt-2 text-xs font-semibold text-brand">Latest score: {submitted[assignment.id].score}/{submitted[assignment.id].total}</p>}
              {submitted[assignment.id]?.feedback && <div className="mt-3 space-y-2 border-t border-white/10 pt-3">{submitted[assignment.id].feedback?.map((item, index) => <p key={item.questionId} className="text-xs leading-5 text-muted"><span className={item.correct ? "text-emerald-300" : "text-amber-300"}>Question {index + 1}: {item.correct ? "Correct" : "Review"}.</span> {item.explanation}</p>)}</div>}
              {openAssignment === assignment.id && <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
                {assignment.questions.map((question, index) => <fieldset key={question.id} className="block text-sm font-semibold leading-6 text-ink"><legend>{index + 1}. {question.prompt}</legend>{question.options?.length ? <div className="mt-2 grid gap-2">{question.options.map((option) => <label key={option} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-normal text-white/75 hover:border-brand"><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />{option}</label>)}</div> : <input value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand" />}</fieldset>)}
                <button type="button" onClick={() => void submit(assignment)} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark"><Send size={15} /> Submit answers</button>
              </div>}
            </article>
          ))}
        </div>
      )}
      {assignments.length > 0 && message && <p role="status" className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-5 text-muted">{message}</p>}
      <p className="mt-4 border-t border-[var(--line)] pt-4 text-[11px] leading-5 text-muted">Results are graded on the server. Answer keys and private source excerpts are never sent to this page.</p>
    </SectionCard>
  );
}
