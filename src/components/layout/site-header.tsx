"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-[#202020] bg-black/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1400px] items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" aria-label="SkillPath home" onClick={() => setOpen(false)}><SkillPathLogo dark /></Link>
        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid size-10 place-items-center rounded-xl border border-[#303030] text-white md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        <nav aria-label="Main navigation" className={`${open ? "absolute left-4 right-4 top-[70px] flex" : "hidden"} flex-col gap-1 rounded-none border border-[#292929] bg-[#090909] p-3 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="whitespace-nowrap rounded-none px-3 py-2.5 text-[13px] font-semibold text-white/50 transition hover:text-white sm:px-4">
              {link.label}
            </Link>
          ))}
          <Link href="/student" onClick={() => setOpen(false)} className="ml-1 inline-flex items-center justify-center gap-1 border border-white/25 bg-white px-4 py-2.5 text-[13px] font-bold text-black transition hover:bg-white/80">
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
