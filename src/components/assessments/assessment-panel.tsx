"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleHelp, LoaderCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { ApiResponse } from "@/types/api";
import type { AssessmentQuestion, AssessmentResult } from "@/types/domain";

export function AssessmentPanel({ initialQuestions }: { initialQuestions: AssessmentQuestion[] }) {
  const [questions] = useState(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length !== questions.length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: questions.map((question) => ({ questionId: question.id, choiceId: answers[question.id] })) }),
      });
      const payload = await response.json() as ApiResponse<AssessmentResult>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Your answers could not be scored." : payload.error.message);
      setResult(payload.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your answers could not be scored.");
    } finally {
      setSubmitting(false);
    }
  }

  const resultByQuestion = new Map(result?.answers.map((answer) => [answer.questionId, answer]) ?? []);

  return <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
    <SectionCard>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ef] pb-5"><div><h2 className="text-lg font-bold text-ink">Coding foundations check-in</h2><p className="mt-1 text-sm text-muted">Three quick questions · about 3 minutes</p></div><Badge tone="gold">DEMO ASSESSMENT</Badge></div>
      <form onSubmit={submitAssessment}>
          <div className="divide-y divide-[#edf1ef]">
            {questions.map((question, index) => {
              const questionResult = resultByQuestion.get(question.id);
              return <fieldset key={question.id} className="py-5 first:pt-5" disabled={Boolean(result)}>
                <legend className="mb-3 flex w-full items-start gap-3 text-sm font-bold leading-6 text-ink"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs text-brand">{index + 1}</span><span>{question.prompt}</span></legend>
                <div className="ml-10 space-y-2">
                  {question.choices.map((choice) => {
                    const selected = answers[question.id] === choice.id;
                    const isCorrect = questionResult?.correctChoiceId === choice.id;
                    const isWrongChoice = Boolean(questionResult && selected && !questionResult.correct);
                    return <label key={choice.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${isCorrect ? "border-brand bg-brand-soft text-brand-dark" : isWrongChoice ? "border-[#ebc4bb] bg-[#fff2ef] text-[#9c4c3d]" : selected ? "border-brand bg-[#f4faf7]" : "border-[#e8eeeb] hover:border-[#bdd8ca]"}`}>
                      <input className="mt-0.5 accent-[#177c68]" type="radio" name={question.id} value={choice.id} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))} />
                      <span className="flex-1">{choice.text}</span>
                      {isCorrect && <Check size={16} className="shrink-0" />}
                    </label>;
                  })}
                </div>
                {questionResult && <p className={`ml-10 mt-3 text-xs leading-5 ${questionResult.correct ? "text-brand-dark" : "text-muted"}`}>{questionResult.explanation}</p>}
              </fieldset>;
            })}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-[#a34436]">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ef] pt-5">
            <p className="text-xs text-muted">{result ? "Score calculated and mastery saved for this learner" : `${Object.keys(answers).length} of ${questions.length} answered`}</p>
            {result ? <button type="button" onClick={() => { setResult(null); setAnswers({}); setError(""); }} className="inline-flex items-center gap-2 rounded-full border border-[#dfe8e3] px-4 py-2.5 text-sm font-bold text-ink hover:bg-[#f6f9f7]"><RotateCcw size={15} /> Try again</button> : <button type="submit" disabled={submitting || Object.keys(answers).length !== questions.length} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><LoaderCircle className="animate-spin" size={16} /> Checking…</> : <>Check my answers <ArrowRight size={16} /></>}</button>}
          </div>
      </form>
    </SectionCard>
    <aside className="space-y-4">
      <SectionCard className={result ? "border-brand bg-[#f0f8f4]" : ""}>
        <span className="grid size-10 place-items-center rounded-2xl bg-[#fff3d7] text-[#a87513]"><CircleHelp size={19} /></span>
        <h2 className="mt-4 text-lg font-bold text-ink">{result ? "Your check-in" : "What this is for"}</h2>
        {result ? <><p className="mt-2 text-3xl font-extrabold text-brand">{result.score}<span className="text-lg text-muted"> / {result.total}</span></p><p className="mt-2 text-sm leading-6 text-muted">This is a small practice check, not a validated assessment or final mastery score. Updated concept estimates are saved to your learner workspace.</p><Badge className="mt-4" tone="gold">MASTERY SAVED</Badge></> : <><p className="mt-2 text-sm leading-6 text-muted">Use this short check-in to think about variables, decisions, and loops. Your answers are checked by the server and their concept mastery updates are saved for this browser.</p><div className="mt-4 rounded-xl bg-[#f5f8f6] p-3 text-xs leading-5 text-muted">No account or database is required for local demo persistence.</div></>}
      </SectionCard>
    </aside>
  </div>;
}
