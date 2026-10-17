import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SplitReveal } from "@/components/ui/text-animation";
import { SectionCard } from "@/components/ui/section-card";
import { MasteryList } from "@/components/student/mastery-list";
import { MissionCard } from "@/components/student/mission-card";
import { ProgressSummary } from "@/components/student/progress-summary";
import { LEARNING_MISSIONS } from "@/data/learning";
import { selectNextMission } from "@/features/adaptive-learning";
import { LEARNING_CONFIG } from "@/config/learning";
import { getCurrentLearnerId, getLearnerMastery } from "@/features/assessments/mastery-store";
import { requireWorkspaceRole } from "@/lib/auth/require-workspace-role";
import { PublishedAssignments } from "@/components/student/published-assignments";

export const metadata: Metadata = { title: "Student workspace" };

export default async function StudentPage() {
  await requireWorkspaceRole("student");
  const learnerId = await getCurrentLearnerId();
  const savedMastery = learnerId ? await getLearnerMastery(learnerId) : null;
  const hasSavedMastery = Boolean(savedMastery?.length);
  const mastery = savedMastery ?? [];
  const masteryByConcept = Object.fromEntries(mastery.map((item) => [item.conceptId, item.probability]));
  const nextMission = hasSavedMastery
    ? selectNextMission(LEARNING_MISSIONS, masteryByConcept, LEARNING_CONFIG.masteryThreshold)?.mission ?? null
    : null;

  return (
    <PageLayout>
      <PageIntro eyebrow="Student workspace" title={<SplitReveal as="span" className="inline">Good to see you, learner.</SplitReveal>} description="A clear view of what you have practiced and a useful next step to keep your momentum.">
        <Badge tone="gold">{hasSavedMastery ? "SAVED LEARNER PROGRESS" : "READY TO BEGIN"}</Badge>
      </PageIntro>
      <div className="space-y-5">
        <PublishedAssignments />
        <ProgressSummary mastery={mastery} />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <MissionCard mission={nextMission} />
            <SectionCard>
              <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Recent activity</h2><p className="mt-1 text-xs text-muted">Completed work will appear here.</p></div><Link href="/assessment" className="text-xs font-bold text-brand">Start a check-in</Link></div>
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-raised)] p-5 text-sm leading-6 text-muted">No practice activity has been recorded yet.</div>
              <Link href="/arena" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Continue practicing <ArrowRight size={15} /></Link>
            </SectionCard>
          </div>
          <MasteryList mastery={mastery} />
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-xs leading-5 text-muted"><strong className="text-ink">{hasSavedMastery ? "Learner progress:" : "Getting started:"}</strong> {hasSavedMastery ? "Concept mastery reflects your saved assessment and assignment activity." : "Complete a check-in or assignment to start building your saved progress."}</div>
      </div>
    </PageLayout>
  );
}
