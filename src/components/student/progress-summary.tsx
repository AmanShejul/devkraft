import { ArrowUpRight, Flame, Goal, Timer } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";

const stats = [
  { label: "Concepts explored", value: "4 of 6", note: "Across the starter path", icon: Goal, color: "text-brand bg-brand-soft" },
  { label: "Practice this week", value: "42 min", note: "Sample activity", icon: Timer, color: "text-white/70 bg-[#1b1b1b]" },
  { label: "Learning streak", value: "3 days", note: "Keep a steady rhythm", icon: Flame, color: "text-white/70 bg-[#1b1b1b]" },
];

export function ProgressSummary() {
  return <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, note, icon: Icon, color }) => <SectionCard key={label} className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className={`grid size-8 place-items-center rounded-xl ${color}`}><Icon size={16} /></span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{value}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted">{note} <ArrowUpRight size={12} /></p></SectionCard>)}</div>;
}
