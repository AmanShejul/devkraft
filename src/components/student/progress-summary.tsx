import { Flame, Goal, Timer } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { AnimatedNumber } from "@/components/ui/text-animation";
import { CONCEPT_GRAPH } from "@/features/adaptive-learning";
import type { ConceptMastery } from "@/types/domain";

export function ProgressSummary({ mastery }: { mastery: readonly ConceptMastery[] }) {
  const explored = mastery.filter((item) => item.probability > 0).length;
  const stats = [
    { label: "Concepts explored", value: explored, suffix: ` of ${CONCEPT_GRAPH.length}`, note: explored ? "Based on saved progress" : "Complete a check-in to begin", icon: Goal, color: "text-brand bg-brand-soft" },
    { label: "Practice this week", value: 0, suffix: " min", note: "No practice time recorded yet", icon: Timer, color: "text-brand bg-brand-soft" },
    { label: "Learning streak", value: 0, suffix: " days", note: "No streak recorded yet", icon: Flame, color: "text-[#f0b8c8] bg-[#35252c]" },
  ];

  return <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, suffix, note, icon: Icon, color }) => <SectionCard key={label} className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className={`grid size-8 place-items-center rounded-xl ${color}`}><Icon size={16} /></span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-ink"><AnimatedNumber value={value} suffix={suffix} /></p><div className="mt-2 h-4 w-14 rounded border border-dashed border-[var(--line)]" aria-hidden="true" /><p className="mt-1 text-[11px] text-muted">{note}</p></SectionCard>)}</div>;
}
