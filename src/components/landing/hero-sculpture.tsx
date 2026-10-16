"use client";

import dynamic from "next/dynamic";

const Canvas = dynamic(() => import("./hero-sculpture-canvas"), { ssr: false });
export function HeroSculpture() { return <><div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[calc(100vh-76px)] overflow-hidden" role="img" aria-label="A softly glowing spiral starfield"><div className="absolute inset-0"><Canvas /><div className="hero-starfield-twinkles absolute inset-0" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index} />)}</div></div><div className="absolute inset-0 bg-[linear-gradient(90deg,#060709_0%,rgba(6,7,9,.86)_27%,rgba(6,7,9,.12)_66%,transparent_100%)]" /></div><div className="pointer-events-none absolute bottom-[8%] left-[47%] z-10 flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-white/40"><span className="h-px w-8 bg-white/35" /> A path through concepts</div><div className="relative order-2 h-[min(70vw,620px)] min-h-[380px] w-full lg:order-1 lg:col-span-7 lg:col-start-6 lg:-mr-8" aria-hidden="true" /></>; }
