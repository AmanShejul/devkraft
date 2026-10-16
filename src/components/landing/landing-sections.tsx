"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock3, GitBranch, Layers3, Sparkles } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/text-animation";

const testimonials = [
  { quote: "I stopped guessing what to practice. The next step was always visible.", name: "Maya R.", role: "Frontend learner" },
  { quote: "The graph made the gaps feel manageable instead of mysterious.", name: "Arjun K.", role: "Career switcher" },
  { quote: "A focused coding workspace with just enough signal to keep moving.", name: "Noah T.", role: "Computer science student" },
];

export function LandingStats() {
  return <div className="grid grid-cols-3 border-y border-white/10 py-5 sm:max-w-xl sm:py-6">
    {[{ value: 6, label: "Concepts mapped" }, { value: 24, label: "Focused missions" }, { value: 3, label: "Languages ready" }].map((stat) => <div key={stat.label} className="border-l border-white/10 pl-4 first:border-0 first:pl-0 sm:pl-6">
      <p className="text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl"><AnimatedNumber value={stat.value} suffix="+" /></p><p className="mt-1 text-[10px] uppercase tracking-[.13em] text-white/35">{stat.label}</p>
    </div>)}
  </div>;
}

export function MarqueeStrip() {
  const items = ["Adaptive paths", "Hidden tests", "Session replay", "Viva checks"];
  const reduceMotion = useReducedMotion();
  return <div className="overflow-hidden border-y border-brand/20 bg-brand/[.07] py-3 text-[10px] font-bold uppercase tracking-[.2em] text-brand"><motion.div className="flex min-w-max gap-8" animate={reduceMotion ? undefined : { x: ["0%", "-25%"] }} transition={reduceMotion ? undefined : { duration: 24, repeat: Infinity, ease: "linear" }}>{[...items, ...items, ...items, ...items].map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-8">{item}<i className="size-1 rounded-full bg-brand/60" /></span>)}</motion.div></div>;
}

export function HowItWorks() {
  const steps = [
    { number: "01", title: "Diagnose", description: "See which ideas are solid—and where practice will unlock more." },
    { number: "02", title: "Practice", description: "Work through focused missions with hints at the right level." },
    { number: "03", title: "Master", description: "Build a durable map of concepts and what to revisit next." },
  ];
  return <div className="relative grid gap-8 md:grid-cols-3"><motion.svg className="pointer-events-none absolute left-[11%] right-[11%] top-6 hidden h-10 w-[78%] md:block" viewBox="0 0 800 40" fill="none" aria-hidden="true"><motion.path d="M8 20H792" stroke="rgba(232,185,106,.5)" strokeWidth="1" strokeDasharray="4 8" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 1.2, ease: "easeOut" }} /></motion.svg>{steps.map((step, index) => <motion.article key={step.number} className="group relative rounded-2xl border border-white/10 bg-white/[.025] p-6 transition-colors hover:-translate-y-1 hover:border-brand/40 hover:bg-brand/[.04]" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: index * 0.08 }}><span className="relative z-10 grid size-10 place-items-center rounded-full border border-brand/40 bg-canvas text-xs font-bold text-brand shadow-[0_0_24px_rgba(232,185,106,.14)]">{step.number}</span><h3 className="mt-12 text-xl font-medium text-white">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/45">{step.description}</p></motion.article>)}</div>;
}

export function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => { if (reduceMotion || paused) return; const timer = window.setInterval(() => setActive((value) => (value + 1) % testimonials.length), 6000); return () => window.clearInterval(timer); }, [paused, reduceMotion]);
  return <div className="relative min-h-[245px] rounded-2xl border border-white/10 bg-white/[.025] p-7 sm:p-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}><span className="font-serif text-6xl leading-none text-brand/65">“</span><AnimatePresence mode="wait" initial={false}><motion.div key={active} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 120, damping: 20 }}><blockquote className="mt-2 max-w-2xl text-2xl leading-tight tracking-[-.03em] text-white sm:text-3xl">{testimonials[active].quote}</blockquote><p className="mt-7 text-xs uppercase tracking-[.14em] text-white/40">{testimonials[active].name} · {testimonials[active].role}</p></motion.div></AnimatePresence><div className="absolute bottom-7 right-7 flex gap-1.5" aria-label="Testimonial selector">{testimonials.map((testimonial, index) => <button key={testimonial.name} type="button" aria-label={`Show testimonial ${index + 1}`} aria-current={active === index} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${active === index ? "w-7 bg-brand" : "w-1.5 bg-white/25"}`} />)}</div></div>;
}

export function FeatureCard({ index, title, description }: { index: string; title: string; description: string }) {
  const Icon = index === "01" ? Layers3 : index === "02" ? GitBranch : Sparkles;
  return <motion.article className="group rounded-2xl border border-white/10 bg-white/[.025] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_18px_60px_rgba(232,185,106,.08)]" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: Number(index) * 0.07 }}><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={17} /></span><span className="text-[10px] font-bold tracking-[.18em] text-white/30">{index}</span></div><h3 className="mt-10 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/45">{description}</p></motion.article>;
}

export function RecommendationMeta() {
  return <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-white/45"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5"><Clock3 size={12} /> 12 min</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5"><Sparkles size={12} /> Starter</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5"><Check size={12} /> Loops</span><ArrowRight className="ml-auto text-brand" size={16} /></div>;
}
