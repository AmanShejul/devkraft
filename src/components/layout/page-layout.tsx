import type { ReactNode } from "react";

export function PageLayout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto min-h-[calc(100vh-72px)] max-w-[1400px] bg-black px-5 py-8 text-white sm:px-8 sm:py-10 lg:px-12 ${className}`}>{children}</main>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>}
      </div>
      {children}
    </div>
  );
}
