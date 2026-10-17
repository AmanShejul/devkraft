"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { CONCEPT_GRAPH } from "@/features/adaptive-learning";
import { SectionCard } from "@/components/ui/section-card";
import type { ConceptMastery } from "@/types/domain";

export function MasteryList({ mastery }: { mastery: readonly ConceptMastery[] }) {
  const byId = new Map(mastery.map((item) => [item.conceptId, item]));
  return (
    <SectionCard>
      <div><h2 className="text-lg font-bold text-ink">Concept mastery</h2><p className="mt-1 text-xs leading-5 text-muted">Saved estimates from completed checks and assignments.</p></div>
      {mastery.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-raised)] p-5 text-sm leading-6 text-muted">No mastery data has been recorded yet.</div> : <div className="mt-5 space-y-4">
        {CONCEPT_GRAPH.map((concept) => {
          const saved = byId.get(concept.id);
          const percent = saved ? Math.round(saved.probability * 100) : null;
          return <div key={concept.id} className="group rounded-xl px-2 py-2 transition hover:bg-white/[.03]" title={saved ? `Latest saved estimate: ${percent}%.` : "This concept has not been measured yet."}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-ink">{concept.title}</span><span className="text-xs font-bold text-muted">{percent === null ? "Not measured" : `${percent}%`} {percent !== null && <span className="ml-1 text-brand/70">{percent >= 65 ? "↗" : "→"}</span>}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label={`${concept.title} mastery`} aria-valuenow={percent ?? 0} aria-valuemin={0} aria-valuemax={100}><motion.div className={`h-full rounded-full ${percent !== null && percent >= 65 ? "bg-brand" : "bg-[#d7aa4d]"}`} initial={{ width: 0 }} animate={{ width: `${percent ?? 0}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: concept.id.length * 0.02 }} /></div>
          </div>;
        })}
      </div>}
      <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-muted">Values update after saved check-ins and completed assignments.</p>
      <Link href="/assessment" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Take a quick check-in <ArrowRight size={15} /></Link>
    </SectionCard>
  );
}
