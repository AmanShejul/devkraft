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
import { CONCEPT_GRAPH, selectNextMission } from "@/features/adaptive-learning";
import { LEARNING_CONFIG } from "@/config/learning";
import { getCurrentLearnerId, getLearnerMastery } from "@/features/assessments/mastery-store";

export const metadata: Metadata = { title: "Student workspace" };

export default async function StudentPage() {
  const learnerId = await getCurrentLearnerId();
  const savedMastery = learnerId ? await getLearnerMastery(learnerId) : null;
  const hasSavedMastery = Boolean(savedMastery?.length);
  const mastery = savedMastery?.length
    ? CONCEPT_GRAPH.map((concept) => {
      const saved = savedMastery.find((item) => item.conceptId === concept.id);
      return saved ?? { conceptId: concept.id, probability: LEARNING_CONFIG.bkt.initialMastery };
    })
    : DEMO_MASTERY;
  const masteryByConcept = Object.fromEntries(mastery.map((item) => [item.conceptId, item.probability]));
  const nextMission = selectNextMission(DEMO_MISSIONS, masteryByConcept, LEARNING_CONFIG.masteryThreshold)?.mission ?? null;

  return (
    <PageLayout>
      <PageIntro eyebrow="Student workspace" title="Good to see you, learner." description="A clear view of what you have practiced and a useful next step to keep your momentum." >
        <Badge tone="gold">{hasSavedMastery ? "SAVED LEARNER PROGRESS" : "DEMO DATA · SAMPLE LEARNER"}</Badge>
      </PageIntro>
      <div className="space-y-5">
        <ProgressSummary />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <MissionCard mission={nextMission} />
            <SectionCard>
              <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Recent activity</h2><p className="mt-1 text-xs text-muted">A sample of your recent practice.</p></div><Link href="/assessment" className="text-xs font-bold text-brand">All activity</Link></div>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {DEMO_RECENT_ACTIVITY.map((activity) => {
                  const Icon = activity.icon === "check" ? Check : activity.icon === "code" ? Code2 : FileText;
                  return <div key={activity.label} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{activity.label}</p><p className="mt-0.5 text-xs text-muted">{activity.detail}</p></div><span className="shrink-0 text-[11px] text-muted">{activity.time}</span></div>;
                })}
              </div>
              <Link href="/arena" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Continue practicing <ArrowRight size={15} /></Link>
            </SectionCard>
          </div>
          <MasteryList mastery={mastery} />
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-xs leading-5 text-muted"><strong className="text-ink">{hasSavedMastery ? "Learner progress:" : "Demo workspace:"}</strong> {hasSavedMastery ? "Concept mastery reflects your latest assessment; other concepts use the configured starting estimate. Recent activity remains sample data." : "Progress, activity, and concept estimates are seeded examples. Submit an assessment to save your mastery progress."}</div>
      </div>
    </PageLayout>
  );
}
