"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Presentation, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AppRole } from "@/lib/auth/authorization";
import type { ApiResponse } from "@/types/api";

const workspacePaths: Record<AppRole, string> = {
  student: "/student",
  teacher: "/teacher",
};

const roleLoginPaths: Record<AppRole, string> = {
  student: "/login/student",
  teacher: "/login/teacher",
};

export function LoginForm({ role, roleMismatch = false }: { role: AppRole; roleMismatch?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(roleMismatch ? "This account does not have access to this workspace." : "");
  const [pending, setPending] = useState(false);
  const otherRole = role === "student" ? "teacher" : "student";
  const RoleIcon = role === "student" ? GraduationCap : Presentation;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(role === "student" ? "/api/student/demo-login" : "/api/teacher/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json() as ApiResponse<{ demoMode: true }>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? `${role} demo access could not be created.` : payload.error.message);
      setPassword("");
      router.replace(workspacePaths[role]);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : `${role} demo access could not be created.`);
      setPending(false);
    }
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#080a0d]" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(232,185,106,.07),transparent_52%),linear-gradient(180deg,#090b0e_0%,#080a0d_100%)]" />
        <div className="absolute -left-40 top-[12%] size-[min(70vw,680px)] rounded-full bg-[radial-gradient(circle,rgba(72,104,139,.15),transparent_68%)] blur-3xl animate-[auth-orbit_22s_ease-in-out_infinite_alternate]" />
        <div className="absolute -right-40 bottom-[-18%] size-[min(75vw,760px)] rounded-full bg-[radial-gradient(circle,rgba(232,185,106,.12),transparent_68%)] blur-3xl animate-[auth-orbit_28s_ease-in-out_-8s_infinite_alternate]" />
        <div className="hero-starfield-twinkles absolute inset-0 opacity-70">
          {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_82%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] animate-[auth-card-enter_.7s_cubic-bezier(.2,.75,.25,1)_both]">
        <section className="relative overflow-hidden rounded-[26px] border border-white/[.11] bg-[linear-gradient(145deg,rgba(26,31,37,.94),rgba(15,18,22,.94))] shadow-[0_30px_100px_rgba(0,0,0,.42),0_0_70px_rgba(232,185,106,.045)] backdrop-blur-2xl md:flex">
          <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" aria-hidden="true" />

          <aside className="relative hidden w-[34%] flex-col justify-between overflow-hidden border-r border-white/[.08] bg-[radial-gradient(ellipse_at_15%_90%,rgba(232,185,106,.11),transparent_55%),linear-gradient(160deg,rgba(255,255,255,.025),transparent_70%)] p-8 md:flex lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-brand">
                <Sparkles size={13} aria-hidden="true" />
                {role} workspace
              </div>
              <span className="mt-8 grid size-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.035] text-brand/90" aria-hidden="true">
                <RoleIcon size={23} strokeWidth={1.7} />
              </span>
              <h2 className="mt-6 max-w-[13rem] text-3xl font-semibold leading-tight tracking-[-.035em] text-white">
                {role === "student" ? "Keep your learning in motion." : "Guide every learner forward."}
              </h2>
              <p className="mt-4 max-w-[15rem] text-sm leading-6 text-white/45">
                {role === "student" ? "Pick up where you left off and make your next step count." : "Your teaching workspace is ready when you are."}
              </p>
            </div>
            <div className="relative mt-10 flex items-center gap-3" aria-hidden="true">
              <span className="grid size-8 place-items-center rounded-full border border-brand/30 bg-brand/[.08] text-[10px] text-brand">01</span>
              <span className="h-px w-8 bg-gradient-to-r from-brand/50 to-white/10" />
              <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[.03] text-[10px] text-white/35">02</span>
              <span className="h-px w-8 bg-gradient-to-r from-white/15 to-transparent" />
              <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[.03] text-[10px] text-white/25">03</span>
              <span className="absolute -left-2 -top-2 size-12 rounded-full bg-brand/10 blur-xl" />
            </div>
          </aside>

          <div className="min-w-0 flex-1 p-6 sm:p-8 md:p-9 lg:p-10">
            <div className="mb-5 flex items-center justify-between md:hidden">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-brand">
                <Sparkles size={13} aria-hidden="true" />
                {role} workspace
              </div>
              <span className="grid size-10 place-items-center rounded-2xl border border-white/[.08] bg-white/[.035] text-brand/90" aria-hidden="true">
                <RoleIcon size={20} strokeWidth={1.7} />
              </span>
            </div>

            <h1 className="text-[2.65rem] font-bold leading-none tracking-[-.045em] text-ink sm:text-5xl">Sign in<span className="text-brand">.</span></h1>
            <p className="mt-3 text-sm leading-6 text-white/55">Enter any email or name and password to continue.</p>

            {error && (
              <p role="alert" className="mt-5 rounded-xl border border-[#ff8e80]/20 bg-[#ff8e80]/[.07] px-4 py-3 text-sm leading-5 text-[#ffb3aa]">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-white/75">
                Email or name
                <span className="relative mt-2 block">
                  <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    name="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-white/[.09] bg-black/25 py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-brand/70 focus:bg-black/35 focus:ring-4 focus:ring-brand/[.08]"
                  />
                </span>
              </label>
              <label className="block text-xs font-semibold text-white/75">
                Password
                <span className="relative mt-2 block">
                  <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/[.09] bg-black/25 py-3 pl-11 pr-12 text-sm text-ink outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-brand/70 focus:bg-black/35 focus:ring-4 focus:ring-brand/[.08]"
                  />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-white/40 transition hover:text-brand">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              <button
                type="submit"
                disabled={pending}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-[#171411] shadow-[0_8px_28px_rgba(232,185,106,.16)] transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_12px_32px_rgba(232,185,106,.24)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Signing in..." : `Sign in as ${role}`}
                {!pending && <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <p className="mt-5 border-t border-white/[.08] pt-4 text-xs text-white/45">
              {role === "teacher" ? "Need student access?" : "Are you a teacher?"}{" "}
              <Link href={roleLoginPaths[otherRole]} className="font-semibold text-brand transition-colors hover:text-white">
                Sign in as {otherRole}
              </Link>
            </p>
          </div>
        </section>
        <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[.18em] text-white/25">SkillPath · Learn in motion</p>
      </div>
    </>
  );
}
