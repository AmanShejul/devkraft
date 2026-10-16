"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const HeroSculptureCanvas = dynamic(() => import("./hero-sculpture-canvas"), {
  ssr: false,
  loading: () => <StaticSculpture />,
});

function StaticSculpture() {
  return <div className="relative h-full min-h-[360px] w-full" aria-label="Abstract learning path sculpture" role="img"><svg viewBox="0 0 640 560" className="absolute inset-0 h-full w-full" fill="none"><defs><linearGradient id="fallback-metal" x1="130" y1="420" x2="520" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#4a4a4a" /><stop offset=".35" stopColor="#f3f3f3" /><stop offset=".62" stopColor="#717171" /><stop offset="1" stopColor="#e9e9e9" /></linearGradient><filter id="fallback-shadow"><feGaussianBlur stdDeviation="12" /></filter></defs><ellipse cx="335" cy="465" rx="220" ry="28" fill="#fff" fillOpacity=".08" filter="url(#fallback-shadow)" /><path d="M122 417c63-84 87-154 168-169 95-17 87-145 199-159 40-5 73 7 103 29" stroke="#111" strokeWidth="72" strokeLinecap="round" /><path d="M122 405c63-84 87-154 168-169 95-17 87-145 199-159 40-5 73 7 103 29" stroke="url(#fallback-metal)" strokeWidth="43" strokeLinecap="round" /><path d="M143 393c61-79 86-129 157-145 99-22 95-132 193-150" stroke="#fff" strokeOpacity=".58" strokeWidth="3" strokeLinecap="round" /><path d="M179 350 114 272M293 236l-12-92M400 112l51 68" stroke="#a5a5a5" strokeWidth="2" strokeDasharray="4 9" /><circle cx="122" cy="405" r="16" fill="#dedede" /><circle cx="290" cy="236" r="16" fill="#f1f1f1" /><circle cx="490" cy="77" r="18" fill="#fff" /><circle cx="490" cy="77" r="29" stroke="#fff" strokeOpacity=".2" /></svg><span className="absolute bottom-[8%] left-[14%] border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[.18em] text-white/50">Foundations</span><span className="absolute right-[7%] top-[10%] border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[.18em] text-white/50">Mastery</span></div>;
}

export function HeroSculpture({ children }: { children?: ReactNode }) {
  return <div className="relative h-[min(70vw,620px)] min-h-[390px] w-full"><HeroSculptureCanvas />{children}</div>;
}
