import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#e8eeeb] bg-white p-5 shadow-card sm:p-6 ${className}`}>{children}</section>;
}
