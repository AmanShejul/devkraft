import type { ElementType, ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  titleAs: Title = "h2",
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  titleAs?: ElementType;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <p className="eyebrow text-brand">{eyebrow}</p>}
      <Title className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-4xl">{title}</Title>
      {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>}
    </div>
  );
}
