import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`border border-[#262626] bg-[#090909] p-5 shadow-card sm:p-6 ${className}`}>{children}</section>;
}
