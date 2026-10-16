import type { ReactNode } from "react";

export function Badge({ children, tone = "green", className = "" }: { children: ReactNode; tone?: "green" | "gold" | "gray"; className?: string }) {
  const tones = {
    green: "bg-brand-soft text-brand-dark",
    gold: "bg-[#fff4d8] text-[#8c5b08]",
    gray: "bg-[#edf1ef] text-[#596d73]",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
