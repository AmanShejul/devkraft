"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BookOpenCheck, UsersRound } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import type { ApiResponse } from "@/types/api";

type TeacherAnalyticsData = {
  students: Array<{
    student: { id: string; email: string; createdAt: string; lastActivityAt: string };
    attemptCount: number;
    diagnosticAverage: number | null;
    practiceAverage: number | null;
    completedTopics: number;
    weakConcepts: Array<{ conceptId: string; incorrectResponses: number }>;
    needsHelp: boolean;
    events: Array<{ id: string; type: string; topicId: string; assignmentId: string; conceptId: string | null; occurredAt: string }>;
    attempts: Array<{
      id: string; title: string; subject: string; topic: string; learningStage: string; submittedAt: string; score: number; total: number;
      responses: Array<{
        questionId: string; prompt: string; response: string; correct: boolean; conceptId: string | null;
        correctAnswer: string | null; explanation: string | null; sourceExcerpt: string | null;
      }>;
    }>;
  }>;
  summary: { studentCount: number; activeStudents: number; needsHelpCount: number; publishedTopics: number; diagnosticAverage: number | null; practiceAverage: number | null };
};

export function TeacherAnalytics() {
  const [data, setData] = useState<TeacherAnalyticsData | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/teacher/analytics", { cache: "no-store" });
        const payload = await response.json() as ApiResponse<TeacherAnalyticsData>;
        if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Teacher analytics could not be loaded." : payload.error.message);
        if (active) setData(payload.data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Teacher analytics could not be loaded.");
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="border border-[#7a3535] bg-[#241719] px-4 py-3 text-sm text-[#ffb3aa]">{error}</p>;
  if (!data) return <p role="status" className="border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-muted">Loading saved student activity…</p>;

  const stats = [
    { label: "Students with activity", value: data.summary.activeStudents, detail: `${data.summary.studentCount} profiles`, icon: UsersRound },
    { label: "Published topics", value: data.summary.publishedTopics, detail: "Teacher-owned topics", icon: BookOpenCheck },
    { label: "Diagnostic average", value: data.summary.diagnosticAverage === null ? "—" : `${data.summary.diagnosticAverage}%`, detail: "Saved diagnostic attempts", icon: Activity },
    { label: "Need follow-up", value: data.summary.needsHelpCount, detail: "Repeated misses or low diagnostics", icon: AlertTriangle },
  ];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail, icon: Icon }) => <SectionCard key={label} className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted">{label}</p><Icon size={16} className="text-brand" /></div><p className="mt-3 text-2xl font-extrabold text-ink">{value}</p><p className="mt-1 text-[11px] text-muted">{detail}</p></SectionCard>)}</div>
    <SectionCard>
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">Student progress</h2><p className="mt-1 text-xs text-muted">Attempts and weak concepts from your published topics.</p></div><p className="text-xs text-muted">Follow-up average: {data.summary.practiceAverage === null ? "—" : `${data.summary.practiceAverage}%`}</p></div>
      {data.students.length === 0 ? <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-muted">No student attempts have been recorded for your topics yet.</p> : <div className="mt-4 divide-y divide-[var(--line)]">{data.students.map((item) => {
        const expanded = expandedStudent === item.student.id;
        return <article key={item.student.id} className="py-4 first:pt-2">
          <button type="button" aria-expanded={expanded} onClick={() => setExpandedStudent(expanded ? null : item.student.id)} className="grid w-full gap-3 text-left sm:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] sm:items-center">
            <span><strong className="block text-sm text-ink">{item.student.email}</strong><span className="mt-1 block text-[11px] text-muted">Last activity: {item.student.lastActivityAt ? new Date(item.student.lastActivityAt).toLocaleString() : "None"}</span></span>
            <span className="text-xs text-muted">Diagnostic <strong className="text-ink">{item.diagnosticAverage === null ? "—" : `${item.diagnosticAverage}%`}</strong></span>
            <span className="text-xs text-muted">Practice <strong className="text-ink">{item.practiceAverage === null ? "—" : `${item.practiceAverage}%`}</strong></span>
            <span className="text-xs text-muted">Attempts <strong className="text-ink">{item.attemptCount}</strong></span>
            <span className={item.needsHelp ? "text-xs font-semibold text-amber-300" : "text-xs font-semibold text-emerald-300"}>{item.needsHelp ? "Needs help" : item.attemptCount === 0 ? "Started · no attempts" : `${item.completedTopics} topics complete`}</span>
          </button>
          {expanded && <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Concepts to revisit</p><p className="mt-2 text-xs text-ink">{item.weakConcepts.length ? item.weakConcepts.map((concept) => `${concept.conceptId} (${concept.incorrectResponses} missed)`).join(" · ") : "No incorrect responses recorded."}</p></div>
            {item.events.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Learning activity</p><div className="mt-2 flex flex-wrap gap-2">{item.events.map((event) => <span key={event.id} className="border border-[var(--line)] px-2 py-1 text-[10px] text-muted">{event.type.replaceAll("_", " ")} · {new Date(event.occurredAt).toLocaleString()}</span>)}</div></div>}
            {item.attempts.map((attempt) => <section key={attempt.id} className="border-t border-white/10 pt-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold text-ink">{attempt.title} · {attempt.topic} · {attempt.learningStage}</p><p className="text-xs font-bold text-brand">{attempt.score}/{attempt.total} · {new Date(attempt.submittedAt).toLocaleString()}</p></div><div className="mt-2 space-y-3">{attempt.responses.map((response) => <div key={response.questionId} className="border-l border-white/10 pl-3 text-xs leading-5"><p className="text-white/75">{response.prompt}</p><p className={response.correct ? "text-emerald-300" : "text-amber-300"}>Student response: {response.response || "(blank)"} · {response.correct ? "Correct" : "Incorrect"}{response.conceptId ? ` · ${response.conceptId}` : ""}</p>{response.correctAnswer && <p className="mt-1 text-emerald-200/80">Expected answer: {response.correctAnswer}</p>}{response.explanation && <p className="mt-1 text-muted">Explanation: {response.explanation}</p>}{response.sourceExcerpt && <p className="mt-1 text-muted/80">Source: {response.sourceExcerpt}</p>}</div>)}</div></section>)}
          </div>}
        </article>;
      })}</div>}
    </SectionCard>
  </div>;
}