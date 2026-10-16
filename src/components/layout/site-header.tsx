"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SkillPathLogo } from "@/components/layout/skillpath-logo";

const links = [
  { href: "/student", label: "Student" },
  { href: "/learn", label: "Learning path" },
  { href: "/teacher", label: "Teacher" },
  { href: "/assessment", label: "Assessment" },
  { href: "/arena", label: "Coding arena" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/") return null;
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0" aria-label="SkillPath home" onClick={() => setOpen(false)}><SkillPathLogo dark /></Link>
        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid size-10 place-items-center border border-[#303030] text-white md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        <nav aria-label="Main navigation" className={`${open ? "absolute left-4 right-4 top-[70px] flex" : "hidden"} flex-col gap-1 border border-[#292929] bg-[#090909] p-3 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-white/50 transition hover:text-white sm:px-4">
              {link.label}
            </Link>
          ))}
          <Link href="/student" onClick={() => setOpen(false)} className="ml-1 inline-flex items-center justify-center gap-1 bg-brand px-4 py-2.5 text-[13px] font-bold text-[#171411] transition hover:bg-brand-dark">
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
