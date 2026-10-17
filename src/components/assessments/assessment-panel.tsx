"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CircleHelp, LoaderCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { AnimatedNumber } from "@/components/ui/text-animation";
import { SectionCard } from "@/components/ui/section-card";
import { scoreAssessment } from "@/features/assessments/question-bank";
import { getOrCreateBrowserLearnerId, readLocalMasteryRecord, writeLocalMasteryRecord } from "@/features/assessments/local-mastery-store";
import type { AssessmentQuestion, AssessmentResult } from "@/types/domain";

export function AssessmentPanel({ initialQuestions, learnerId: initialLearnerId }: { initialQuestions: AssessmentQuestion[]; learnerId?: string }) {
  const [questions] = useState(initialQuestions);
  const [learnerId, setLearnerId] = useState(initialLearnerId ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const id = initialLearnerId ?? getOrCreateBrowserLearnerId();
        setLearnerId(id);
        const saved = readLocalMasteryRecord(id);
        if (saved.assessmentResult) setResult(saved.assessmentResult);
      } catch (restoreError) {
        setError(restoreError instanceof Error ? restoreError.message : "Saved browser progress could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLearnerId]);

  async function submitAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length !== questions.length || !learnerId) return;
    setSubmitting(true);
    setError("");
    try {
      const current = readLocalMasteryRecord(learnerId);
      const scored = scoreAssessment(questions.map((question) => ({ questionId: question.id, choiceId: answers[question.id] })), current.mastery);
      const savedResult: AssessmentResult = { ...scored, persistence: "saved" };
      setResult(savedResult);
      writeLocalMasteryRecord(learnerId, { ...current, mastery: savedResult.mastery, assessmentResult: savedResult });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your answers could not be scored or saved in this browser.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (result || !currentQuestion || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const choiceIndex = Number(event.key) - 1;
      if (choiceIndex >= 0 && choiceIndex < currentQuestion.choices.length) {
        setAnswers((current) => ({ ...current, [currentQuestion.id]: currentQuestion.choices[choiceIndex].id }));
      }
      if (event.key === "Enter" && answers[currentQuestion.id]) {
        event.preventDefault();
        if (currentIndex < questions.length - 1) setCurrentIndex((index) => index + 1);
        else document.getElementById("assessment-submit")?.click();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answers, currentIndex, currentQuestion, questions.length, result]);

  const resultByQuestion = new Map(result?.answers.map((answer) => [answer.questionId, answer]) ?? []);
  const answeredCount = Object.keys(answers).length;

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <SectionCard className="overflow-hidden">
      <div className="-mx-5 -mt-5 mb-6 h-1 bg-white/10 sm:-mx-6 sm:-mt-6"><motion.div className="h-full bg-brand" animate={{ width: `${result ? 100 : ((currentIndex + 1) / questions.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-5"><div><p className="eyebrow text-brand">Question {result ? questions.length : currentIndex + 1} of {questions.length}</p><h2 className="mt-2 text-lg font-bold text-ink">Coding foundations check-in</h2><p className="mt-1 text-sm text-muted">Three quick questions · about 3 minutes</p></div><Badge tone="gold">DEMO ASSESSMENT</Badge></div>
      {!result ? <form onSubmit={submitAssessment}>
        <AnimatePresence mode="wait" initial={false}>
          {currentQuestion && <motion.fieldset key={currentQuestion.id} disabled={submitting} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="py-7" aria-label={`Question ${currentIndex + 1}`}>
            <legend className="max-w-full whitespace-pre-line text-base font-bold leading-7 text-ink">{currentQuestion.prompt}</legend>
            <div className="mt-6 space-y-2">
              {currentQuestion.choices.map((choice, index) => { const selected = answers[currentQuestion.id] === choice.id; return <label key={choice.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3.5 text-sm transition ${selected ? "border-brand bg-brand-soft text-ink" : "border-[var(--line)] hover:border-brand/50"}`}><input className="sr-only" type="radio" name={currentQuestion.id} value={choice.id} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: choice.id }))} /><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-brand" : "border-white/25"}`}>{selected && <motion.span layoutId="assessment-choice" className="size-2.5 rounded-full bg-brand" />}</span><span className="flex-1">{choice.text}</span><span className="text-[10px] font-bold text-muted">{index + 1}</span></label>; })}
            </div>
          </motion.fieldset>}
        </AnimatePresence>
        {error && <p role="alert" className="text-sm text-[#ffb3aa]">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5"><p className="text-xs text-muted">{answeredCount} of {questions.length} answered · Press 1–4 to choose, Enter to continue</p>{currentIndex < questions.length - 1 ? <button type="button" disabled={!answers[currentQuestion?.id]} onClick={() => setCurrentIndex((index) => index + 1)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40">Continue <ArrowRight size={15} /></button> : <MagneticButton><button id="assessment-submit" type="submit" disabled={submitting || answeredCount !== questions.length} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><LoaderCircle className="animate-spin" size={16} /> Checking…</> : <>Check my answers <ArrowRight size={16} /></>}</button></MagneticButton>}</div>
      </form> : <div className="pt-7"><div className="flex flex-col items-center rounded-2xl border border-brand/25 bg-brand/[.06] p-7 text-center"><div className="relative grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(var(--brand) ${(result.score / result.total) * 360}deg, rgba(255,255,255,.08) 0deg)` }}><div className="grid size-24 place-items-center rounded-full bg-[#181d22]"><span className="text-3xl font-extrabold text-brand"><AnimatedNumber value={result.score} /><span className="text-base text-muted"> / {result.total}</span></span></div></div><p className="mt-4 text-sm font-semibold text-ink">Your check-in is complete.</p><p className="mt-1 text-xs text-muted">Score and mastery are saved in this browser.</p></div><div className="mt-7 space-y-2"><p className="eyebrow text-brand">Review your answers</p>{questions.map((question, index) => { const questionResult = resultByQuestion.get(question.id); return <details key={question.id} className="group rounded-xl border border-white/10 bg-white/[.025] p-4"><summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-semibold text-ink"><span className={`grid size-6 shrink-0 place-items-center rounded-full ${questionResult?.correct ? "bg-[#67c9a2]/15 text-[#9ae0c8]" : "bg-[#b35c53]/15 text-[#ffb3aa]"}`}>{questionResult?.correct ? <Check size={13} /> : index + 1}</span><span className="flex-1">{question.prompt.split("\n")[0]}</span><span className="text-xs text-muted group-open:rotate-180">⌄</span></summary><p className="mt-3 pl-9 text-xs leading-5 text-muted">{questionResult?.explanation}</p></details>; })}</div><p className="mt-5 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-center text-xs text-muted">Loops mastery updated · {Math.round((result.mastery.find((item) => item.conceptId === "loops")?.probability ?? 0) * 100)}%</p><button type="button" onClick={() => { setResult(null); setAnswers({}); setCurrentIndex(0); setError(""); }} className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-ink hover:bg-[var(--panel-raised)]"><RotateCcw size={15} /> Try again</button></div>}
    </SectionCard>
    <aside className="space-y-4"><SectionCard className={result ? "border-brand bg-[var(--panel-raised)]" : ""}><span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand"><CircleHelp size={19} /></span><h2 className="mt-4 text-lg font-bold text-ink">{result ? "Your check-in" : "What this is for"}</h2>{result ? <><p className="mt-2 text-sm leading-6 text-muted">This is a small practice check, not a validated assessment or final mastery score. Updated concept estimates are saved to this browser for this learner.</p><Badge className="mt-4" tone="gold">MASTERY SAVED</Badge></> : <><p className="mt-2 text-sm leading-6 text-muted">Use this short check-in to think about variables, decisions, and loops. Your answers and concept mastery are saved locally in this browser.</p><div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Not saved until you finish</div></>}</SectionCard></aside>
  </div>;
}
