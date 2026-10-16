import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpenCheck, Braces, ChartNoAxesColumnIncreasing, CirclePlay, Compass, MoveUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { PageLayout } from "@/components/layout/page-layout";

const tracks = [
  { icon: Braces, title: "Learn by doing", text: "Short coding challenges connect each new idea to something you can build." },
  { icon: ChartNoAxesColumnIncreasing, title: "See your progress", text: "A concept map helps you notice what is clicking and where to practice next." },
  { icon: BookOpenCheck, title: "Get useful guidance", text: "Concept notes and practice hints keep the next step within reach." },
];

export default function HomePage() {
  return (
    <PageLayout className="pb-16 pt-7 sm:pt-12">
      <section className="relative grid gap-8 overflow-hidden rounded-[32px] bg-[#e9f4ef] px-6 py-9 sm:px-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-center lg:px-16">
        <div aria-hidden="true" className="absolute -right-12 -top-20 size-72 rounded-full border-[1px] border-[#d0e9df] sm:size-[440px]" />
        <div aria-hidden="true" className="absolute -right-2 -top-10 size-56 rounded-full border-[1px] border-[#d0e9df] sm:right-9 sm:top-2 sm:size-[350px]" />
        <div className="relative z-10 max-w-3xl">
          <Badge><Sparkles size={12} className="mr-1.5" /> A clearer way to learn code</Badge>
          <h1 className="mt-6 max-w-3xl text-[42px] font-extrabold leading-[1.07] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[68px]">
            Your skills.<br className="hidden sm:block" /> Your path. Your progress.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#526c70] sm:text-lg">
            Build coding confidence one concept at a time. Practice, track what you know, and find a useful next step.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/student" className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark">
              Explore student workspace <ArrowRight size={17} />
            </Link>
            <Link href="/teacher" className="inline-flex items-center gap-2 rounded-full border border-[#c7ddd3] bg-white/70 px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-white">
              View teacher dashboard <ArrowUpRight size={16} />
            </Link>
          </div>
          <p className="mt-5 text-xs font-medium text-[#657c7d]">Preview workspace · All displayed learning data is sample data</p>
        </div>
        <div className="relative z-10 grid max-w-[570px] grid-cols-2 gap-3 lg:w-full lg:grid-cols-1">
          <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between text-xs font-bold text-muted"><span>YOUR LEARNING MAP</span><Compass size={16} className="text-brand" /></div>
            <div className="mt-4 flex items-end gap-2"><span className="text-3xl font-extrabold text-ink">4</span><span className="mb-1 text-sm text-muted">of 6 concepts explored</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full w-1/2 rounded-full bg-brand" /></div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-dark"><MoveUpRight size={14} /> Loops are your next focus</div>
          </div>
          <div className="rounded-2xl bg-ink p-4 text-white shadow-card sm:p-5">
            <div className="flex items-center justify-between text-xs font-bold text-white/65"><span>UP NEXT</span><CirclePlay size={17} className="text-[#f0c46a]" /></div>
            <p className="mt-3 text-lg font-bold">Count it down</p>
            <p className="mt-1 text-xs leading-5 text-white/65">A 12-minute practice mission on loops.</p>
            <Link href="/student" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#f0c46a] hover:text-[#ffe4a5]">Open student view <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">A learning workspace</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Keep moving, one idea at a time.</h2></div>
          <Link href="/assessment" className="hidden items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark sm:flex">Try a check-in <ArrowRight size={15} /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {tracks.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 0.07}>
            <div className="rounded-[22px] border border-[#e8eeeb] bg-white p-6 shadow-card">
              <div className={`grid size-11 place-items-center rounded-2xl ${index === 1 ? "bg-[#fff3d7] text-[#a87513]" : "bg-brand-soft text-brand"}`}><Icon size={20} /></div>
              <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2ebe6] py-6 text-xs text-muted">
        <span>SkillPath · Your Skills. Your Path. Your Progress.</span><Link href="/student" className="inline-flex items-center gap-1 font-semibold text-brand">Continue exploring <ArrowRight size={13} /></Link>
      </footer>
    </PageLayout>
  );
}
