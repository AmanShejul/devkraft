import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, GraduationCap, UsersRound } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { AnimatedNumber } from "@/components/ui/text-animation";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { ConceptWeakness } from "@/components/teacher/concept-weakness";
import { StudentProgress } from "@/components/teacher/student-progress";
import { AssignmentStudio } from "@/components/teacher/assignment-studio";
import { DEMO_CLASS } from "@/data/demo-class";
import { summarizeClass } from "@/features/teacher-analytics/summary";
import { requireWorkspaceRole } from "@/lib/auth/require-workspace-role";

export const metadata: Metadata = { title: "Teacher workspace" };

const summary = summarizeClass(DEMO_CLASS);
const metrics = [
  { label: "Learners", value: String(summary.learnerCount), caption: "Sample class roster", icon: UsersRound, tint: "bg-brand-soft text-brand" },
  { label: "On learning path", value: String(summary.onTrackCount), caption: `of ${summary.learnerCount} sample learners`, icon: BookOpenCheck, tint: "bg-[#202c3a] text-[#b8d4f0]" },
  { label: "Average progress", value: `${summary.averageProgress}%`, caption: "Across starter concepts", icon: GraduationCap, tint: "bg-brand-soft text-brand" },
];

export default async function TeacherPage() {
  await requireWorkspaceRole("teacher");
  return <PageLayout>
    <PageIntro eyebrow="Teacher workspace" title="Help your class find its next step." description="Spot common sticking points and plan a focused check-in for your learners.">
      <Badge tone="gold">DEMO CLASS ANALYTICS</Badge>
    </PageIntro>
    <div className="space-y-5">
      <AssignmentStudio />
      <div className="grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, caption, icon: Icon, tint }) => <SectionCard key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${tint}`}><Icon size={17} /></span></div><p className="mt-3 text-3xl font-extrabold tracking-tight text-ink"><AnimatedNumber value={Number.parseInt(value, 10)} suffix={value.endsWith("%") ? "%" : ""} /></p><p className="mt-1 text-xs text-muted">{caption}</p></SectionCard>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <ConceptWeakness />
        <StudentProgress />
      </div>
      <SectionCard className="border-[var(--line)] bg-[var(--panel-raised)] shadow-none">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-brand">Suggested intervention</p><h2 className="mt-1 text-lg font-bold text-ink">Run a 10-minute loop tracing activity.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Ask learners to trace the counter, condition, and update step for a few inputs. This suggestion is a sample based on seeded class data.</p></div><MagneticButton><Link href="/assessment" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark">Open check-in <ArrowRight size={15} /></Link></MagneticButton></div>
      </SectionCard>
      <p className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-xs leading-5 text-muted"><strong className="text-ink">Demo analytics:</strong> Class metrics and concept signals below are sample data. Assignment drafts and submissions are stored in this browser only; no shared class database is connected.</p>
    </div>
  </PageLayout>;
}
