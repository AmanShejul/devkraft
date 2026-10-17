"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { CONCEPT_GRAPH, selectNextMission } from "@/features/adaptive-learning";
import { LEARNING_MISSIONS } from "@/data/learning";
import { LEARNING_CONFIG } from "@/config/learning";
import { readLocalMasteryRecord } from "@/features/assessments/local-mastery-store";
import { SectionCard } from "@/components/ui/section-card";
import type { ConceptId, ConceptMastery } from "@/types/domain";

export function MasteryList({ learnerId }: { learnerId: string }) {
  const [mastery, setMastery] = useState<ConceptMastery[]>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setMastery(readLocalMasteryRecord(learnerId).mastery);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Saved browser mastery could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [learnerId]);

  const byId = new Map(mastery.map((item) => [item.conceptId, item]));
  const missionMastery = useMemo(() => Object.fromEntries(mastery.map((item) => [item.conceptId, item.probability])) as Record<ConceptId, number>, [mastery]);
  const nextMission = mastery.length > 0
    ? selectNextMission(LEARNING_MISSIONS, missionMastery, LEARNING_CONFIG.masteryThreshold)?.mission ?? null
    : null;
  return (
    <SectionCard>
      <div><h2 className="text-lg font-bold text-ink">Concept mastery</h2><p className="mt-1 text-xs leading-5 text-muted">Saved estimates from completed checks and assignments.</p></div>
      {loadError && <p role="alert" className="mt-4 text-xs text-[#ffb3aa]">{loadError}</p>}
      {mastery.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-raised)] p-5 text-sm leading-6 text-muted">No mastery data has been recorded yet. Complete the assessment to start tracking concepts.</div> : <div className="mt-5 space-y-4">
        {CONCEPT_GRAPH.map((concept) => {
          const saved = byId.get(concept.id);
          const percent = saved ? Math.round(saved.probability * 100) : null;
          return <div key={concept.id} className="group rounded-xl px-2 py-2 transition hover:bg-white/[.03]" title={saved ? `Latest saved estimate: ${percent}%.` : "This concept has not been measured yet."}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-ink">{concept.title}</span><span className="text-xs font-bold text-muted">{percent === null ? "Not measured" : `${percent}%`} {percent !== null && <span className="ml-1 text-brand/70">{percent >= 65 ? "↗" : "→"}</span>}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-label={`${concept.title} mastery`} aria-valuenow={percent ?? 0} aria-valuemin={0} aria-valuemax={100}><motion.div className={`h-full rounded-full ${percent !== null && percent >= 65 ? "bg-brand" : "bg-[#d7aa4d]"}`} initial={{ width: 0 }} animate={{ width: `${percent ?? 0}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: concept.id.length * 0.02 }} /></div>
          </div>;
        })}
      </div>}
      {nextMission && <div className="mt-5 rounded-xl border border-brand/25 bg-brand/[.06] p-4">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-brand"><Sparkles size={13} /> Suggested mission</p>
        <h3 className="mt-2 text-sm font-bold text-ink">{nextMission.title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">{nextMission.description}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted"><Clock3 size={12} /> {nextMission.estimatedMinutes} min · {nextMission.conceptId} · lowest mastery with unlocked prerequisites</p>
        <Link href="/arena" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-dark">Open practice space <ArrowRight size={14} /></Link>
      </div>}
      <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-muted">Values update after check-ins in this browser and completed assignments.</p>
      <Link href="/assessment" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">Take a quick check-in <ArrowRight size={15} /></Link>
    </SectionCard>
  );
}
