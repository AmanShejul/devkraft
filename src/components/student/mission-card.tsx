import Link from "next/link";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import type { LearningMission } from "@/types/domain";

export function MissionCard({ mission }: { mission: LearningMission | null }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-ink p-6 text-white shadow-card sm:p-7">
      <div aria-hidden="true" className="absolute -right-10 -top-12 size-44 rounded-full border border-white/10" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f2cd7b]"><Sparkles size={13} /> Suggested next mission</span><span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/65"><Clock3 size={14} /> {mission?.estimatedMinutes ?? 10} min</span></div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{mission?.title ?? "Choose a concept to practice"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{mission?.description ?? "Try an assessment to find a useful next step."}</p>
        <Link href="/arena" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f0c46a] px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-[#f7d990]">Open practice space <ArrowRight size={16} /></Link>
        <p className="mt-4 text-[11px] text-white/50">Mission choice is based on mastery estimates and prerequisites.</p>
      </div>
    </section>
  );
}
