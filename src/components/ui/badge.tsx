import type { ReactNode } from "react";

export function Badge({ children, tone = "green", className = "" }: { children: ReactNode; tone?: "green" | "gold" | "gray"; className?: string }) {
  const tones = {
    green: "bg-brand-soft text-brand-dark",
    gold: "bg-[#1d1d1d] text-[#c5c5c5]",
    gray: "bg-[#151515] text-[#929292]",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
