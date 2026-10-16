import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Circle, Route } from "lucide-react";
import { HeroSculpture } from "@/components/landing/hero-sculpture";
import { FeatureCard, HowItWorks, LandingStats, MarqueeStrip, RecommendationMeta, TestimonialCarousel } from "@/components/landing/landing-sections";
import { SkillPathLogo } from "@/components/layout/skillpath-logo";
import { GradientText, SplitReveal } from "@/components/ui/text-animation";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: { absolute: "SkillPath — Learn with direction." },
  description: "A coding path shaped around what you know—and what you need next.",
};

function MiniGraph() {
  return <div className="relative h-[330px] overflow-hidden rounded-2xl border border-white/10 bg-[#080808] p-5 sm:h-[390px] sm:p-8">
    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(#fff1_1px,transparent_1px),linear-gradient(90deg,#fff1_1px,transparent_1px)] [background-size:36px_36px]" />
    <svg viewBox="0 0 620 300" className="relative h-full w-full" fill="none" aria-label="Preview of the SkillPath concept graph">
      <path d="M82 228c83-15 78-111 175-108 91 2 90 89 185 52 42-16 49-72 92-94" stroke="#777" strokeWidth="1" strokeDasharray="3 8" /><path d="M82 228c83-15 78-111 175-108 91 2 90 89 185 52 42-16 49-72 92-94" stroke="#e8b96a" strokeWidth="3" strokeLinecap="round" /><path d="M257 120 222 58M442 172l-12 77M534 78l40 44" stroke="#555" />
      <g fill="#050505" stroke="#fff" strokeWidth="2"><circle cx="82" cy="228" r="15" /><circle cx="257" cy="120" r="20" /><circle cx="442" cy="172" r="18" /><circle cx="534" cy="78" r="23" /></g><g fill="#e8b96a"><circle cx="82" cy="228" r="4" /><circle cx="257" cy="120" r="5" /><circle cx="442" cy="172" r="5" /><circle cx="534" cy="78" r="6" /></g><g fill="#888" fontSize="11" fontFamily="Arial"><text x="57" y="270">variables</text><text x="232" y="80">loops</text><text x="420" y="214">arrays</text><text x="501" y="45">mastery</text></g>
    </svg>
    <div className="absolute bottom-5 left-5 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-white/40 sm:bottom-8 sm:left-8"><Route size={13} /> Explore the graph <ArrowUpRight size={13} /></div>
  </div>;
}

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-canvas text-white">
    <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between border-b border-white/10 px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/" aria-label="SkillPath home"><SkillPathLogo dark /></Link>
      <nav className="hidden items-center gap-8 text-[13px] font-medium text-white/55 md:flex"><Link href="#how-it-works" className="transition hover:text-white">How it works</Link><Link href="/login/student" className="transition hover:text-white">Student login</Link><Link href="/login/teacher" className="transition hover:text-white">Teacher login</Link><MagneticButton><Link href="/login/student" className="ml-4 inline-flex items-center gap-2 border border-white/25 px-4 py-2.5 text-white transition hover:border-brand hover:bg-brand hover:text-[#171411]">Open student portal <ArrowUpRight size={14} /></Link></MagneticButton></nav>
      <Link href="/login/student" className="text-[12px] font-semibold md:hidden">Student sign in <ArrowUpRight size={14} className="inline" /></Link>
    </header>
    <section className="relative isolate mx-auto grid min-h-[calc(100vh-76px)] max-w-[1440px] grid-cols-1 items-center gap-8 overflow-hidden px-5 py-12 sm:px-8 lg:grid-cols-12 lg:gap-0 lg:px-12 lg:py-8">
      <HeroSculpture />
      <div className="relative z-10 lg:col-span-5 lg:pr-6"><p className="mb-7 text-[11px] uppercase tracking-[.24em] text-brand/75">Personalised coding practice</p><SplitReveal className="max-w-[590px] text-[52px] font-medium leading-[.98] sm:text-[76px] lg:text-[84px]">Learn with direction.</SplitReveal><p className="mt-8 max-w-[410px] text-base leading-7 text-white/50 sm:text-lg">A coding path shaped around what you know—and what you need next.</p><div className="mt-9 flex flex-wrap gap-3"><MagneticButton><Link href="/login/student" className="inline-flex items-center gap-2 bg-brand px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-brand-dark">Student sign in <ArrowUpRight size={16} /></Link></MagneticButton><MagneticButton><Link href="/login/teacher" className="inline-flex items-center gap-2 border border-white/25 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-brand hover:bg-white/[.06]">Teacher sign in <ArrowUpRight size={16} /></Link></MagneticButton></div><div className="mt-10"><LandingStats /></div></div>
    </section>
    <MarqueeStrip />
    <section id="how-it-works" className="mx-auto max-w-[1440px] border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><Reveal><div className="mb-12 max-w-xl"><p className="eyebrow text-brand">How it works</p><h2 className="mt-5 text-3xl font-medium leading-tight sm:text-5xl">A clear next step, every time.</h2></div></Reveal><HowItWorks /></section>
    <section className="mx-auto max-w-[1440px] border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="grid gap-10 lg:grid-cols-12 lg:items-end"><Reveal className="lg:col-span-4"><p className="eyebrow text-brand">The learning graph</p><h2 className="mt-5 max-w-[460px] text-3xl font-medium leading-tight sm:text-5xl">See the relationship between <GradientText>ideas.</GradientText></h2><p className="mt-6 max-w-[390px] text-sm leading-6 text-white/45">Prerequisites stay visible, so progress feels like a route—not a list of disconnected lessons.</p><Link href="/login/student" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand underline decoration-brand/30 underline-offset-8 transition hover:decoration-brand">Open student portal <ArrowUpRight size={15} /></Link></Reveal><div className="lg:col-span-7 lg:col-start-6"><MiniGraph /></div></div></section>
    <section className="mx-auto max-w-[1440px] border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-brand">The workspace</p><h2 className="mt-5 text-3xl font-medium leading-tight sm:text-5xl">Less noise. More learning.</h2></div><p className="max-w-sm text-sm leading-6 text-white/45">Every surface is built to keep the next useful signal close.</p></div><div className="grid gap-4 sm:grid-cols-3"><FeatureCard index="01" title="Adaptive missions" description="Recommendations shaped by your current concept mastery." /><FeatureCard index="02" title="Coding practice" description="An editor and problem space built for deliberate practice." /><FeatureCard index="03" title="Concept mastery" description="A living view of what is clicking and what comes next." /></div></section>
    <section className="mx-auto max-w-[1440px] border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="grid gap-10 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-4"><p className="eyebrow text-brand">A useful loop</p><h2 className="mt-5 text-3xl font-medium leading-tight sm:text-5xl">Momentum feels better with company.</h2><p className="mt-6 max-w-[390px] text-sm leading-6 text-white/45">A small nudge, a clear signal, and a path that keeps its promises.</p></div><div className="lg:col-span-7 lg:col-start-6"><TestimonialCarousel /></div></div></section>
    <section className="mx-auto max-w-[1440px] border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[.13] via-white/[.03] to-transparent p-7 sm:p-10"><p className="eyebrow text-brand">Begin anywhere</p><h2 className="mt-5 max-w-xl text-4xl font-medium sm:text-6xl">Keep moving.</h2><p className="mt-4 max-w-md text-sm leading-6 text-white/50">Find a small, useful next step and build from there.</p><RecommendationMeta /><MagneticButton className="mt-8"><Link href="/login/student" className="inline-flex items-center gap-2 bg-brand px-5 py-3.5 text-sm font-semibold text-[#171411] transition hover:bg-brand-dark">Sign in to explore <ArrowUpRight size={16} /></Link></MagneticButton></div></section>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-7 text-[10px] uppercase text-white/35 sm:px-8 lg:px-12"><SkillPathLogo compact dark /><span>SkillPath · Your skills. Your path. Your progress.</span><span className="flex items-center gap-2"><Circle size={7} fill="currentColor" /> Adaptive learning</span></footer>
  </main>;
}
