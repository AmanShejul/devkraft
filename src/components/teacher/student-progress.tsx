"use client";

import { CircleUserRound } from "lucide-react";
import { motion } from "framer-motion";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { DEMO_CLASS } from "@/data/demo-class";

export function StudentProgress() {
  return <SectionCard className="h-full"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">Student progress</h2><p className="mt-1 text-xs text-muted">A small sample from the demo class.</p></div><CircleUserRound className="text-brand" size={20} /></div><div className="mt-4 divide-y divide-[var(--line)]">{DEMO_CLASS.map((student, index) => <motion.div key={student.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: index * 0.06 }} className="group flex items-center gap-3 py-3.5 first:pt-1 transition hover:bg-white/[.03]"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{student.initials}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{student.name}</p><Badge tone={student.progress >= 65 ? "green" : "gold"}>{student.progress >= 65 ? "On track" : "Check in"}</Badge></div><p className="mt-0.5 text-[11px] text-muted">{student.activity}</p></div><div className="w-14 shrink-0 text-right"><span className="text-xs font-bold text-ink">{student.progress}%</span><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${student.progress}%` }} /></div></div></motion.div>)}</div><p className="mt-4 text-xs font-medium text-muted">Showing {DEMO_CLASS.length} demo learners.</p></SectionCard>;
}
