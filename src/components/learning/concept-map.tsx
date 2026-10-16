"use client";

import { useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Concept, ConceptId } from "@/types/domain";
import { isConceptEligible } from "@/features/adaptive-learning";

type Point = { x: number; y: number };
const positions: Record<string, Point> = {
  variables: { x: 110, y: 250 },
  conditionals: { x: 320, y: 125 },
  loops: { x: 535, y: 205 },
  arrays: { x: 320, y: 380 },
  functions: { x: 535, y: 395 },
  "array-iteration": { x: 765, y: 250 },
};

function edgePath(from: Point, to: Point) {
  const midpoint = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midpoint} ${from.y}, ${midpoint} ${to.y}, ${to.x} ${to.y}`;
}

export function ConceptMap({ concepts, mastery }: { concepts: readonly Concept[]; mastery: Record<ConceptId, number> }) {
  const router = useRouter();
  const [active, setActive] = useState<ConceptId | null>(null);
  const unlocked = useMemo(() => Object.fromEntries(concepts.map((concept) => [concept.id, isConceptEligible(concept.id, mastery)])), [concepts, mastery]);
  const frontier = concepts.filter((concept) => unlocked[concept.id]).sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0))[0]?.id;

  function openConcept(conceptId: ConceptId) {
    router.push(unlocked[conceptId] ? "/arena" : "/assessment");
  }

  return <div className="relative min-h-[540px] overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0e10] p-3 sm:p-5">
    <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px]" />
    <svg viewBox="0 0 900 500" className="relative min-w-[760px]" role="img" aria-label="Animated concept prerequisite map">
      <g aria-hidden="true">
        {concepts.flatMap((concept, conceptIndex) => concept.prerequisites.map((prerequisite, edgeIndex) => {
          const from = positions[prerequisite];
          const to = positions[concept.id];
          return <motion.path key={`${prerequisite}-${concept.id}`} d={edgePath(from, to)} fill="none" stroke={unlocked[concept.id] ? "rgba(232,185,106,.38)" : "rgba(255,255,255,.13)"} strokeWidth="2" strokeDasharray="5 8" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, delay: (conceptIndex + edgeIndex) * 0.12, ease: "easeOut" }} />;
        }))}
      </g>
      {concepts.map((concept, index) => {
        const point = positions[concept.id];
        const percent = Math.round((mastery[concept.id] ?? 0) * 100);
        const locked = !unlocked[concept.id];
        const circumference = 2 * Math.PI * 33;
        const isFrontier = frontier === concept.id;
        const isActive = active === concept.id;
        return <g key={concept.id} transform={`translate(${point.x}, ${point.y})`} className="cursor-pointer" role="button" tabIndex={0} aria-label={`${concept.title}, ${locked ? "locked" : `${percent}% mastery`}`} onClick={() => openConcept(concept.id)} onFocus={() => setActive(concept.id)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(concept.id)} onMouseLeave={() => setActive(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openConcept(concept.id); } }}>
          <motion.circle r="46" fill={locked ? "#111518" : "#151b1e"} stroke={isActive ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.08)"} strokeWidth="1" animate={isFrontier ? { scale: [1, 1.06, 1], opacity: [0.92, 1, 0.92] } : undefined} transition={isFrontier ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined} />
          <circle r="34" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
          <motion.circle r="34" fill="none" stroke={locked ? "rgba(255,255,255,.22)" : percent >= 65 ? "#e8b96a" : "#b58c4a"} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: locked ? circumference : circumference * (1 - percent / 100) }} transition={{ duration: 0.9, delay: index * 0.1, type: "spring", stiffness: 120, damping: 20 }} transform="rotate(-90)" />
          {locked ? <foreignObject x="-12" y="-12" width="24" height="24"><div className="grid size-6 place-items-center text-white/45"><LockKeyhole size={15} /></div></foreignObject> : <text textAnchor="middle" dominantBaseline="central" className="fill-white text-[12px] font-semibold">{percent}%</text>}
          <text y="70" textAnchor="middle" className={`text-[13px] font-semibold ${locked ? "fill-white/40" : "fill-white"}`}>{concept.title}</text>
          <text y="89" textAnchor="middle" className="fill-white/35 text-[10px]">{locked ? "Complete prerequisites" : isFrontier ? "Your next frontier" : "Continue in arena"}</text>
        </g>;
      })}
    </svg>
    {active && <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[240px] rounded-xl border border-brand/30 bg-[#14191c]/95 p-4 shadow-2xl backdrop-blur sm:left-auto sm:right-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand">{unlocked[active] ? "Available next" : "Locked"}</p><h3 className="mt-2 text-sm font-semibold text-white">{concepts.find((concept) => concept.id === active)?.title}</h3><p className="mt-1 text-xs leading-5 text-white/55">{concepts.find((concept) => concept.id === active)?.description}</p><p className="mt-3 text-xs font-semibold text-white/75">Mastery {Math.round((mastery[active] ?? 0) * 100)}%</p><span className="mt-3 inline-block text-[11px] font-bold text-brand">{unlocked[active] ? "Continue →" : "Take the check-in →"}</span></div>}
  </div>;
}
