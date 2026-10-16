import { ArrowUpRight, Flame, Goal, Timer } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { AnimatedNumber } from "@/components/ui/text-animation";

const stats = [
  { label: "Concepts explored", value: 4, suffix: " of 6", note: "Across the starter path", icon: Goal, color: "text-brand bg-brand-soft", points: "2,12 12,10 22,14 32,7 42,9 52,3" },
  { label: "Practice this week", value: 42, suffix: " min", note: "Sample activity", icon: Timer, color: "text-brand bg-brand-soft", points: "2,15 12,13 22,14 32,9 42,11 52,5" },
  { label: "Learning streak", value: 3, suffix: " days", note: "Keep a steady rhythm", icon: Flame, color: "text-[#f0b8c8] bg-[#35252c]", points: "2,15 12,12 22,15 32,10 42,11 52,7" },
];

export function ProgressSummary() {
  return <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, suffix, note, icon: Icon, color, points }) => <SectionCard key={label} className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className={`grid size-8 place-items-center rounded-xl ${color}`}><Icon size={16} /></span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-ink"><AnimatedNumber value={value} suffix={suffix} /></p><svg viewBox="0 0 54 18" className="mt-2 h-4 w-14" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand/70" /></svg><p className="mt-1 flex items-center gap-1 text-[11px] text-muted">{note} <ArrowUpRight size={12} /></p></SectionCard>)}</div>;
}
