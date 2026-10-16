import type { SVGProps } from "react";

type SkillPathLogoProps = {
  compact?: boolean;
  dark?: boolean;
  className?: string;
};

function PathMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden="true" {...props}>
      <path d="M10 32.5 18.3 24l6.2 5.9L34 18.7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 32.5V11.5h10.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".42" />
      <circle cx="10" cy="32.5" r="3.5" fill="currentColor" />
      <circle cx="34" cy="18.7" r="3.5" fill="currentColor" />
      <path d="m29.5 18.7 4.5 0 0-4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SkillPathLogo({ compact = false, dark = false, className = "" }: SkillPathLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
        <PathMark className="size-7" />
      </span>
      {!compact && <span className={`leading-none ${dark ? "text-white" : "text-[#18203b]"}`}><span className="block text-[17px] font-extrabold tracking-[-0.04em]">SkillPath</span><span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] ${dark ? "text-white/45" : "text-[#8b91a6]"}`}>Learn in motion</span></span>}
    </span>
  );
}

export function SkillPathMark({ className = "" }: { className?: string }) {
  return <PathMark className={className} />;
}
