import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Code2, FileText } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { MasteryList } from "@/components/student/mastery-list";
import { MissionCard } from "@/components/student/mission-card";
import { ProgressSummary } from "@/components/student/progress-summary";
import { DEMO_MASTERY, DEMO_MISSIONS, DEMO_RECENT_ACTIVITY } from "@/data/demo-learning";
import { selectNextMission } from "@/features/adaptive-learning";

export const metadata: Metadata = { title: "Student workspace" };

const masteryByConcept = Object.fromEntries(DEMO_MASTERY.map((item) => [item.conceptId, item.probability]));
const nextMission = selectNextMission(DEMO_MISSIONS, masteryByConcept)?.mission ?? null;

export default function StudentPage() {
  return (
    <PageLayout>
      <PageIntro eyebrow="Student workspace" title="Good to see you, learner." description="A clear view of what you have practiced and a useful next step to keep your momentum." >
        <Badge tone="gold">DEMO DATA · SAMPLE LEARNER</Badge>
      </PageIntro>
      <div className="space-y-5">
        <ProgressSummary />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <MissionCard mission={nextMission} />
            <SectionCard>
              <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Recent activity</h2><p className="mt-1 text-xs text-muted">A sample of your recent practice.</p></div><Link href="/assessment" className="text-xs font-bold text-brand">All activity</Link></div>
              <div className="mt-4 divide-y divide-[#edf1ef]">
                {DEMO_RECENT_ACTIVITY.map((activity) => {
                  const Icon = activity.icon === "check" ? Check : activity.icon === "code" ? Code2 : FileText;
                  return <div key={activity.label} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{activity.label}</p><p className="mt-0.5 text-xs text-muted">{activity.detail}</p></div><span className="shrink-0 text-[11px] text-muted">{activity.time}</span></div>;
                })}
              </div>
              <Link href="/arena" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Continue practicing <ArrowRight size={15} /></Link>
            </SectionCard>
          </div>
          <MasteryList mastery={DEMO_MASTERY} />
        </div>
        <div className="rounded-2xl border border-[#dfeae4] bg-white/70 px-5 py-4 text-xs leading-5 text-muted"><strong className="text-ink">Demo workspace:</strong> Progress, activity, and concept estimates are seeded examples. No account or database is connected yet.</div>
      </div>
    </PageLayout>
  );
}
