"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, FilePlus2, Send, WandSparkles } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import {
  generateDraftQuestions,
  readDemoAssignments,
  readDemoSubmissions,
  writeDemoAssignment,
  type AssignmentSubmission,
  type DraftQuestion,
  type QuestionDifficulty,
  type TeacherAssignment,
} from "@/features/teacher-portal/demo-data";

const difficultyOptions: QuestionDifficulty[] = ["foundation", "intermediate", "advanced"];

export function AssignmentStudio() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      setAssignments(readDemoAssignments());
      setSubmissions(readDemoSubmissions());
    };
    const initialRefresh = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function generateQuestions() {
    const generated = generateDraftQuestions(content);
    setQuestions(generated);
    setMessage(generated.length
      ? `Created ${generated.length} editable question drafts. Review each answer before publishing.`
      : "Add a few complete explanatory sentences so question drafts can be created.");
  }

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  function saveAssignment(status: "draft" | "published") {
    if (!title.trim() || !subject.trim() || !topic.trim() || questions.length === 0) {
      setMessage("Add a title, subject, topic, and at least one question before saving.");
      return;
    }

    const existing = assignments.find((assignment) => assignment.id === assignmentId);
    const assignment: TeacherAssignment = {
      id: assignmentId ?? crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      content: content.trim(),
      questions,
      status,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(status === "published" ? { publishedAt: new Date().toISOString() } : {}),
    };

    setAssignments(writeDemoAssignment(assignment));
    setAssignmentId(assignment.id);
    setMessage(status === "published" ? "Assignment published to the student portal." : "Draft saved in this browser.");
  }

  function editDraft(assignment: TeacherAssignment) {
    setAssignmentId(assignment.id);
    setTitle(assignment.title);
    setSubject(assignment.subject);
    setTopic(assignment.topic);
    setContent(assignment.content);
    setQuestions(assignment.questions);
    setMessage("Draft loaded for editing.");
  }

  const published = assignments.filter((assignment) => assignment.status === "published");
  const recentSubmissions = submissions.slice(0, 8);

  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-brand-soft text-brand"><FilePlus2 size={18} /></span>
          <div>
            <h2 className="text-lg font-bold text-ink">Create a student assignment</h2>
            <p className="mt-1 text-xs leading-5 text-muted">Add teaching content, create editable question drafts, then publish when they are ready.</p>
          </div>
        </div>

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
          <label className="text-xs font-semibold text-white/75 sm:col-span-2">Teaching content
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="Paste notes or explanations here. Draft questions are created from complete sentences in this text." className="mt-2 w-full resize-y border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm leading-6 text-ink outline-none focus:border-brand" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={generateQuestions} disabled={!content.trim()} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"><WandSparkles size={16} /> Generate question drafts</button>
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
                <p className="mt-3 border-l-2 border-brand/50 pl-3 text-xs leading-5 text-muted"><strong className="text-white/70">Source:</strong> {question.source}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => saveAssignment("draft")} className="inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-sm font-semibold text-ink hover:border-brand"><Check size={15} /> Save draft</button>
              <button type="button" onClick={() => saveAssignment("published")} className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark"><Send size={15} /> Publish to students</button>
            </div>
          </div>
        )}

        {message && <p role="status" className="mt-4 text-xs leading-5 text-muted">{message}</p>}
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-[11px] leading-5 text-muted">Demo storage: assignments and submissions are saved only in this browser. Configure shared database storage before using this with a class.</p>
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
        <div><h2 className="text-lg font-bold text-ink">Student submissions</h2><p className="mt-1 text-xs text-muted">Recent results from assignments completed in this browser.</p></div>
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