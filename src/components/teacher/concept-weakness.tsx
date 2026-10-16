import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { DEMO_CLASS } from "@/data/demo-class";
import { summarizeClass } from "@/features/teacher-analytics/summary";

const focusByConcept: Record<string, string> = { loops: "Counter updates and stopping conditions", functions: "Parameters and return values", arrays: "Zero-based indexes and bounds" };
const concepts = summarizeClass(DEMO_CLASS).conceptWeaknesses.slice(0, 3);

export function ConceptWeakness() {
  return <SectionCard>
    <div><h2 className="text-lg font-bold text-ink">Concepts to revisit</h2><p className="mt-1 text-xs text-muted">Demo signals from a sample class cohort.</p></div>
    <div className="mt-4 space-y-3">
      {concepts.map((concept) => <div key={concept.conceptId} className="rounded-2xl border border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-[#fff3d7] text-[#a87513]"><AlertTriangle size={15} /></span><span className="text-sm font-bold capitalize text-ink">{concept.conceptId}</span></div><span className="text-xs font-bold text-muted">{Math.round(concept.averageMastery * 100)}% avg.</span></div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#d7aa4d]" style={{ width: `${Math.round(concept.averageMastery * 100)}%` }} /></div>
        <p className="mt-2 text-xs text-muted">{concept.learnersBelowThreshold} of {DEMO_CLASS.length} below threshold · {focusByConcept[concept.conceptId] ?? "Core practice"}</p>
      </div>)}
    </div>
  </SectionCard>;
}
