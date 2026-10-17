import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { PageLayout, PageIntro } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { SplitReveal } from "@/components/ui/text-animation";
import { ConceptMap } from "@/components/learning/concept-map";
import { VisualExplanationSection } from "@/components/learning/visual-explanation";
import { CONCEPT_GRAPH, selectNextMission } from "@/features/adaptive-learning";
import { LEARNING_MISSIONS } from "@/data/learning";
import { LEARNING_CONFIG } from "@/config/learning";
import { getCurrentLearnerId, getLearnerMastery } from "@/features/assessments/mastery-store";
import { listPublishedAssignments } from "@/features/teacher-portal/server-store";

export const metadata: Metadata = { title: "Learning path" };

export default async function LearningPage() {
  const learnerId = await getCurrentLearnerId();
  const savedMastery = learnerId ? await getLearnerMastery(learnerId) : null;
  const mastery = Object.fromEntries((savedMastery ?? []).map((item) => [item.conceptId, item.probability]));
  const nextMission = savedMastery?.length
    ? selectNextMission(LEARNING_MISSIONS, mastery, LEARNING_CONFIG.masteryThreshold)?.mission ?? null
    : null;
  const exploredCount = Object.values(mastery).filter((value) => value > 0).length;
  let visualGuides: Array<{ id: string; title: string; visualExplanation: NonNullable<Awaited<ReturnType<typeof listPublishedAssignments>>[number]["visualExplanation"]> }> = [];
  try {
    visualGuides = (await listPublishedAssignments()).flatMap((assignment) => assignment.visualExplanation ? [{ id: assignment.id, title: assignment.title, visualExplanation: assignment.visualExplanation }] : []);
  } catch {
    visualGuides = [];
  }

  return (
    <PageLayout>
      <PageIntro eyebrow="Learning path" title="Build from the ground up." description="A connected route through the concepts that unlock what comes next.">
        <Badge tone="gold">{CONCEPT_GRAPH.length} CONCEPTS</Badge>
      </PageIntro>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface-card noise-overlay overflow-hidden rounded-2xl border border-white/10 bg-[#111619]">
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7">
            <div>
              <p className="eyebrow text-brand">Foundations / Fluency</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white">Your concept map</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Follow the prerequisite route. Each node shows where your understanding stands today.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/40">Path progress</p>
              <p className="mt-1 text-sm font-semibold text-white">{exploredCount} <span className="font-normal text-white/45">of {CONCEPT_GRAPH.length} explored</span></p>
            </div>
          </div>
          <div className="p-3 sm:p-5"><ConceptMap concepts={CONCEPT_GRAPH} mastery={mastery} /></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 px-5 py-4 text-[11px] text-white/45 sm:px-7">
            <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-brand" /> Measured progress</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={13} className="text-brand" /> Available</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole size={13} /> Locked by prerequisites</span>
          </div>
        </section>

        <aside className="space-y-5">
          {nextMission ? <section className="relative overflow-hidden rounded-2xl border border-brand/30 bg-[radial-gradient(circle_at_90%_0%,rgba(232,185,106,.2),transparent_42%),linear-gradient(145deg,#202321,#111416)] p-6 shadow-[0_20px_60px_rgba(0,0,0,.18)]">
            <div className="absolute -right-10 -top-12 size-36 rounded-full bg-brand/10 blur-3xl" />
            <p className="eyebrow text-brand">Recommended next</p>
            <SplitReveal as="h2" className="relative mt-4 text-2xl font-semibold tracking-[-.04em]" delay={0.08}>{nextMission.title}</SplitReveal>
            <p className="relative mt-3 text-sm leading-6 text-white/55">{nextMission.description}</p>
            <div className="relative mt-5 flex flex-wrap gap-2"><Badge tone="gold"><Clock3 size={12} className="mr-1.5" /> {nextMission.estimatedMinutes} min</Badge><Badge tone="gray">{nextMission.difficulty}</Badge></div>
            <MagneticButton className="relative mt-7"><Link href="/arena" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark">Continue mission <ArrowRight size={15} /></Link></MagneticButton>
          </section> : <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
            <p className="eyebrow text-brand">Your next step</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-white">Start with a check-in.</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">Your first saved result will unlock a recommendation shaped around your progress.</p>
            <Link href="/assessment" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark">Take the check-in <ArrowRight size={15} /></Link>
          </section>}

          <section className="rounded-2xl border border-white/10 bg-[#111619] p-6">
            <p className="eyebrow text-white/45">How the path works</p>
            <div className="mt-5 space-y-4">
              {["Check your starting point", "Practice the next idea", "Unlock what follows"].map((step, index) => <div key={step} className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/[.08] text-xs font-bold text-brand">{index + 1}</span><p className="pt-1 text-sm text-white/65">{step}</p></div>)}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-8"><VisualExplanationSection guides={visualGuides} /></div>
    </PageLayout>
  );
}
