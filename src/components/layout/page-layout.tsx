import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";

export function PageLayout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto min-h-[calc(100vh-72px)] max-w-7xl bg-canvas px-5 py-10 text-white sm:px-8 sm:py-12 lg:px-10 ${className}`}>{children}</main>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} titleAs="h1" />
      {children}
    </div>
  );
}
