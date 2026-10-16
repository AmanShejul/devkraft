import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-card sm:p-6 ${className}`}>{children}</section>;
}
