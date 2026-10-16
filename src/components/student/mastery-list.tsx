"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CircleHelp } from "lucide-react";
import { CONCEPT_GRAPH } from "@/features/adaptive-learning";
import { SectionCard } from "@/components/ui/section-card";
import type { ConceptMastery } from "@/types/domain";

export function MasteryList({ mastery }: { mastery: readonly ConceptMastery[] }) {
  const byId = new Map(mastery.map((item) => [item.conceptId, item.probability]));
  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-ink">Concept mastery</h2><p className="mt-1 text-xs leading-5 text-muted">An estimate of how familiar each concept feels.</p></div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--panel-raised)] text-muted" title="Illustrative sample estimates"><CircleHelp size={17} /></span>
      </div>
      <div className="mt-5 space-y-4">
        {CONCEPT_GRAPH.map((concept) => {
          const percent = Math.round((byId.get(concept.id) ?? 0) * 100);
          return <div key={concept.id} className="group rounded-xl px-2 py-2 transition hover:bg-white/[.03]" title={`Why: ${mastery.find((item) => item.conceptId === concept.id)?.updatedAt ? "latest saved estimate" : "illustrative sample estimate"}. Exact mastery is ${percent}%.`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-ink">{concept.title}</span><span className="text-xs font-bold text-muted">{percent}% <span className="ml-1 text-brand/70">{percent >= 65 ? "↗" : "→"}</span></span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label={`${concept.title} mastery`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><motion.div className={`h-full rounded-full ${percent >= 65 ? "bg-brand" : "bg-[#d7aa4d]"}`} initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: concept.id.length * 0.02 }} /></div>
          </div>;
        })}
      </div>
      <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-muted">These values use a small illustrative model and are not a validated assessment.</p>
      <Link href="/assessment" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Take a quick check-in <ArrowRight size={15} /></Link>
    </SectionCard>
  );
}
