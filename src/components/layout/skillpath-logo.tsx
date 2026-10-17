import Image from "next/image";

export function SkillPathLogo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Image
        src="/favicon.png"
        alt=""
        width={44}
        height={44}
        className="size-10 rounded-[12px] object-cover"
      />
      {!compact && (
        <span className="leading-none">
          <span className={`block text-[17px] font-bold tracking-[-.04em] ${dark ? "text-white" : "text-black"}`}>SkillPath</span>
          <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[.18em] ${dark ? "text-white/40" : "text-black/40"}`}>Learn in motion</span>
        </span>
      )}
    </span>
  );
}
