import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, GraduationCap, UsersRound } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { ConceptWeakness } from "@/components/teacher/concept-weakness";
import { StudentProgress } from "@/components/teacher/student-progress";
import { DEMO_CLASS } from "@/data/demo-class";
import { summarizeClass } from "@/features/teacher-analytics/summary";

export const metadata: Metadata = { title: "Teacher workspace" };

const summary = summarizeClass(DEMO_CLASS);
const metrics = [
  { label: "Learners", value: String(summary.learnerCount), caption: "Sample class roster", icon: UsersRound, tint: "bg-brand-soft text-brand" },
  { label: "On learning path", value: String(summary.onTrackCount), caption: `of ${summary.learnerCount} sample learners`, icon: BookOpenCheck, tint: "bg-[#eaf0ff] text-[#5572bb]" },
  { label: "Average progress", value: `${summary.averageProgress}%`, caption: "Across starter concepts", icon: GraduationCap, tint: "bg-[#fff3d7] text-[#a87513]" },
];

export default function TeacherPage() {
  return <PageLayout>
    <PageIntro eyebrow="Teacher workspace" title="Help your class find its next step." description="Spot common sticking points and plan a focused check-in for your learners.">
      <Badge tone="gold">DEMO DATA · SAMPLE CLASS</Badge>
    </PageIntro>
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, caption, icon: Icon, tint }) => <SectionCard key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${tint}`}><Icon size={17} /></span></div><p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-muted">{caption}</p></SectionCard>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <ConceptWeakness />
        <StudentProgress />
      </div>
      <SectionCard className="border-[#dce9e2] bg-[#eef6f1] shadow-none">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-brand">Suggested intervention</p><h2 className="mt-1 text-lg font-bold text-ink">Run a 10-minute loop tracing activity.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Ask learners to trace the counter, condition, and update step for a few inputs. This suggestion is a sample based on seeded class data.</p></div><Link href="/assessment" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark">Open check-in <ArrowRight size={15} /></Link></div>
      </SectionCard>
      <p className="rounded-2xl border border-[#e4ebe7] bg-white/70 px-5 py-4 text-xs leading-5 text-muted"><strong className="text-ink">Demo workspace:</strong> Class size, learner names, progress, and concept signals are sample data. No teacher account or student records are connected.</p>
    </div>
  </PageLayout>;
}
