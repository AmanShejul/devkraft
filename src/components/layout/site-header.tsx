import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";

const links = [
  { href: "/student", label: "Student" },
  { href: "/teacher", label: "Teacher" },
  { href: "/assessment", label: "Assessment" },
  { href: "/arena", label: "Coding arena" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7eeea] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="SkillPath home">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white shadow-sm"><Compass size={21} strokeWidth={2.3} /></span>
          <span className="leading-tight">
            <span className="block text-[17px] font-extrabold tracking-tight text-ink">SkillPath</span>
            <span className="hidden text-[10px] font-semibold tracking-[0.12em] text-muted sm:block">YOUR SKILLS. YOUR PATH.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold text-[#536970] transition hover:bg-brand-soft hover:text-brand-dark sm:px-4">
              {link.label}
            </Link>
          ))}
          <Link href="/student" className="ml-1 hidden items-center gap-1 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-dark sm:flex">
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
