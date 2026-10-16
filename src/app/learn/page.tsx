import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { PageLayout, PageIntro } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { SplitReveal } from "@/components/ui/text-animation";
import { ConceptMap } from "@/components/learning/concept-map";
import { CONCEPT_GRAPH, selectNextMission } from "@/features/adaptive-learning";
import { DEMO_MASTERY, DEMO_MISSIONS } from "@/data/demo-learning";
import { LEARNING_CONFIG } from "@/config/learning";

export const metadata: Metadata = { title: "Learning path" };

export default function LearningPage() {
  const mastery = Object.fromEntries(DEMO_MASTERY.map((item) => [item.conceptId, item.probability]));
  const nextMission = selectNextMission(DEMO_MISSIONS, mastery, LEARNING_CONFIG.masteryThreshold)?.mission ?? DEMO_MISSIONS[2];
  return <PageLayout>
    <PageIntro eyebrow="Learning path" title="Build from the ground up." description="A connected route through the concepts that unlock what comes next."><Badge tone="gold">DEMO PATH · 6 CONCEPTS</Badge></PageIntro>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="noise-overlay rounded-2xl border border-white/10 bg-[#111619] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="eyebrow text-brand">Foundations → Fluency</p><h2 className="mt-2 text-2xl font-medium">Your concept map</h2></div><span className="text-xs text-white/45">4 explored</span></div>
        <div className="mt-5"><ConceptMap concepts={CONCEPT_GRAPH} mastery={mastery} /></div>
      </section>
      <aside className="space-y-5">
        <section className="noise-overlay rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[.14] via-[#171b1d] to-[#111416] p-6">
          <p className="eyebrow text-brand">Next mission</p><SplitReveal as="h2" className="mt-4 text-2xl font-semibold tracking-tight" delay={0.08}>{nextMission.title}</SplitReveal><p className="mt-3 text-sm leading-6 text-white/55">{nextMission.description}</p><div className="mt-5 flex flex-wrap gap-2"><Badge tone="gold"><Clock3 size={12} className="mr-1.5" /> {nextMission.estimatedMinutes} min</Badge><Badge tone="gray">{nextMission.difficulty}</Badge></div><MagneticButton className="mt-7"><Link href="/arena" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-[#171411] transition hover:bg-brand-dark">Continue mission <ArrowRight size={15} /></Link></MagneticButton>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><h2 className="text-lg font-medium">The path moves with you.</h2><p className="mt-3 text-sm leading-6 text-white/45">Start with a diagnostic, practice the idea, then unlock the concepts your progress supports.</p><Link href="/assessment" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand underline underline-offset-8">Take the check-in <ArrowRight size={14} /></Link></section>
      </aside>
    </div>
  </PageLayout>;
}
