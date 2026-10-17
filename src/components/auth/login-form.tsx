"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="w-full max-w-md">
      <Link href="/" className="text-xs font-semibold text-white/55 transition hover:text-white">← SkillPath home</Link>
      <div className="mt-8 border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{role} workspace</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Enter any email or name and password to continue.</p>

        

        {error && <p role="alert" className="mt-5 text-sm text-[#ffb3aa]">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-white/75">
            Email or name
            <input
              type="text"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="block text-xs font-semibold text-white/75">
            Password
            <span className="relative mt-2 block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 pr-11 text-sm text-ink outline-none focus:border-brand"
              />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/45 hover:text-white">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Signing in..." : `Sign in as ${role}`}
          </button>
        </form>

        {!(role === "student" && demoMode) && <p className="mt-6 border-t border-[var(--line)] pt-5 text-xs text-muted">
          {role === "teacher" ? "Need student access?" : "Are you a teacher?"}{" "}
          <Link href={roleLoginPaths[otherRole]} className="font-semibold text-brand hover:text-brand-dark">
            Sign in as {otherRole}
          </Link>
        </p>}
      </div>
    </div>
  );
}
