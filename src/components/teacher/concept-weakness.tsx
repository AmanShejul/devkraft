"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { SectionCard } from "@/components/ui/section-card";
import { DEMO_CLASS } from "@/data/demo-class";
import { summarizeClass } from "@/features/teacher-analytics/summary";

const focusByConcept: Record<string, string> = { loops: "Counter updates and stopping conditions", functions: "Parameters and return values", arrays: "Zero-based indexes and bounds" };
const concepts = summarizeClass(DEMO_CLASS).conceptWeaknesses.slice(0, 3);

export function ConceptWeakness() {
  return <SectionCard><div><h2 className="text-lg font-bold text-ink">Concepts to revisit</h2><p className="mt-1 text-xs text-muted">Demo signals from a sample class cohort.</p></div><div className="mt-4 space-y-3">{concepts.map((concept, index) => { const percent = Math.round(concept.averageMastery * 100); const intervention = focusByConcept[concept.conceptId] ?? "Core practice"; return <motion.details key={concept.conceptId} open={index === 0} className="rounded-2xl border border-[var(--line)] bg-[var(--panel-raised)] p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: index * 0.07 }}><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-brand-soft text-brand"><AlertTriangle size={15} /></span><span className="text-sm font-bold capitalize text-ink">{concept.conceptId}</span></div><span className="text-xs font-bold text-muted">{percent}% avg.</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><motion.div className="h-full rounded-full bg-[#d7aa4d]" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div><p className="mt-2 text-xs text-muted">{concept.learnersBelowThreshold} of {DEMO_CLASS.length} below threshold · {intervention}</p></summary><p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/60"><strong className="text-brand">Suggested intervention:</strong> {intervention}. Review one example together, then ask learners to explain the stopping condition.</p></motion.details>; })}</div></SectionCard>;
}
