import type { ReactNode } from "react";

export function Badge({ children, tone = "green", className = "" }: { children: ReactNode; tone?: "green" | "gold" | "gray"; className?: string }) {
  const tones = {
    green: "border-[#67c9a2]/25 bg-[#67c9a2]/10 text-[#9ae0c8]",
    gold: "border-brand/25 bg-brand-soft text-brand",
    gray: "border-white/10 bg-white/[.04] text-white/55",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]} ${className}`}>{children}</span>;
}
