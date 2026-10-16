"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Send } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import {
  normalizeResponse,
  getRecommendedDifficulty,
  readDemoAssignments,
  readDemoSubmissions,
  selectQuestionsForDifficulty,
  writeDemoSubmission,
  type AssignmentSubmission,
  type QuestionDifficulty,
  type TeacherAssignment,
} from "@/features/teacher-portal/demo-data";

export function PublishedAssignments() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [learner, setLearner] = useState("");
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<Record<string, { correct: number; total: number; difficulty: QuestionDifficulty }>>({});

  useEffect(() => {
    const refresh = () => {
      setAssignments(readDemoAssignments().filter((assignment) => assignment.status === "published"));
      setSubmissions(readDemoSubmissions());
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  function submit(assignment: TeacherAssignment) {
    if (!learner.trim()) {
      setMessage("Enter your name or student ID before submitting.");
      return;
    }
    const recommendedDifficulty = getRecommendedDifficulty(assignment.subject, assignment.topic, assignments, submissions, learner);
    const questions = selectQuestionsForDifficulty(assignment.questions, recommendedDifficulty);
    const assignedDifficulty = questions[0]?.difficulty ?? recommendedDifficulty;
    const results = questions.map((question) => ({
      questionId: question.id,
      correct: normalizeResponse(answers[question.id] ?? "") === normalizeResponse(question.answer),
      response: (answers[question.id] ?? "").trim(),
    }));
    const correct = results.filter((result) => result.correct).length;
    const submission = {
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      learner: learner.trim(),
      results,
      submittedAt: new Date().toISOString(),
    };
    setSubmissions(writeDemoSubmission(submission));
    setSubmitted((current) => ({ ...current, [assignment.id]: { correct, total: results.length, difficulty: assignedDifficulty } }));
    setMessage(`Submitted at ${assignedDifficulty} level. You answered ${correct} of ${results.length} correctly.`);
    setOpenAssignment(null);
  }

  const assignmentCards = assignments.map((assignment) => {
    const recommendedDifficulty = learner.trim()
      ? getRecommendedDifficulty(assignment.subject, assignment.topic, assignments, submissions, learner)
      : "foundation";
    const questions = selectQuestionsForDifficulty(assignment.questions, recommendedDifficulty);
    return {
      assignment,
      recommendedDifficulty,
      assignedDifficulty: questions[0]?.difficulty ?? recommendedDifficulty,
      questions,
    };
  });

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center bg-brand-soft text-brand"><BookOpenCheck size={18} /></span>
        <div><h2 className="text-lg font-bold text-ink">Assignments from your teacher</h2><p className="mt-1 text-xs leading-5 text-muted">Open a published assignment and submit your answers.</p></div>
      </div>
      {assignments.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">No assignments have been published yet.</p> : (
        <>
          <label className="mt-5 block max-w-sm text-xs font-semibold text-white/75">Your name or student ID
            <input value={learner} onChange={(event) => setLearner(event.target.value)} placeholder="Enter your name or ID" className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand" />
          </label>
          <div className="mt-4 divide-y divide-[var(--line)]">
            {assignmentCards.map(({ assignment, recommendedDifficulty, assignedDifficulty, questions }) => (
              <article key={assignment.id} className="py-4 first:pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold text-ink">{assignment.title}</h3><p className="mt-1 text-xs text-muted">{assignment.subject} · {assignment.topic} · {assignment.questions.length} questions</p></div>
                  <button type="button" onClick={() => { if (!learner.trim()) { setMessage("Enter your name or student ID to choose your starting level."); return; } setOpenAssignment(openAssignment === assignment.id ? null : assignment.id); setMessage(""); }} className="border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink hover:border-brand">{openAssignment === assignment.id ? "Close" : "Open assignment"}</button>
                </div>
                <p className="mt-2 text-xs text-muted">Recommended level: <span className="font-semibold capitalize text-brand">{recommendedDifficulty}</span>{assignedDifficulty !== recommendedDifficulty ? <span> · Using {assignedDifficulty}; no {recommendedDifficulty} questions are available yet</span> : learner.trim() ? " · Based on your latest result for this topic" : " · Enter your student ID to personalize"}</p>
                {submitted[assignment.id] && <p className="mt-2 text-xs font-semibold text-brand">Latest score: {submitted[assignment.id].correct}/{submitted[assignment.id].total} at {submitted[assignment.id].difficulty} level</p>}
                {openAssignment === assignment.id && <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">{questions.map((question, index) => <label key={question.id} className="block text-sm font-semibold leading-6 text-ink">{index + 1}. {question.prompt}<input value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm font-normal text-ink outline-none focus:border-brand" /></label>)}<button type="button" onClick={() => submit(assignment)} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark"><Send size={15} /> Submit answers</button></div>}
              </article>
            ))}
          </div>
        </>
      )}
      {message && <p role="status" className="mt-3 text-xs text-muted">{message}</p>}
      <p className="mt-4 border-t border-[var(--line)] pt-4 text-[11px] leading-5 text-muted">Demo mode: assignments and answers are stored in this browser only.</p>
    </SectionCard>
  );
}