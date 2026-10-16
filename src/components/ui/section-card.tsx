import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card rounded-2xl p-5 shadow-card sm:p-6 ${className}`}>{children}</section>;
}
