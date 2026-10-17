"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AppRole } from "@/lib/auth/authorization";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ApiResponse } from "@/types/api";

const workspacePaths: Record<AppRole, string> = {
  student: "/student",
  teacher: "/teacher",
};

const roleLoginPaths: Record<AppRole, string> = {
  student: "/login/student",
  teacher: "/login/teacher",
};

export function LoginForm({ role, roleMismatch = false, demoMode = false }: { role: AppRole; roleMismatch?: boolean; demoMode?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(roleMismatch ? "This account does not have access to this workspace." : "");
  const [pending, setPending] = useState(false);
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const otherRole = role === "student" ? "teacher" : "student";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    if (role === "student" && demoMode) {
      try {
        const response = await fetch("/api/student/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const payload = await response.json() as ApiResponse<{ profile: { email: string }; created: boolean; demoMode: true }>;
        if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Student demo access could not be created." : payload.error.message);
        setPassword("");
        router.replace(workspacePaths.student);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Student demo access could not be created.");
        setPending(false);
      }
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      if (role === "teacher" && email.trim() && password.length > 0) {
        try {
          const response = await fetch("/api/teacher/demo-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
          const payload = await response.json() as ApiResponse<{ email: string; demoMode: true }>;
          if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Teacher demo access could not be created." : payload.error.message);
          setPassword("");
          router.replace("/teacher");
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Teacher demo access could not be created.");
          setPending(false);
        }
        return;
      }
      setError("Enter an email and password to continue.");
      setPending(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Unable to sign in. Check your details and try again.");
      setPending(false);
      return;
    }

    if (!hasAppRole(data.user, role)) {
      await supabase.auth.signOut();
      setError(`This account is not assigned the ${role} role. Contact your administrator.`);
      setPending(false);
      return;
    }

    router.replace(workspacePaths[role]);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="text-xs font-semibold text-white/55 transition hover:text-white">← SkillPath home</Link>
      <div className="mt-8 border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{role} workspace</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Use the {role} account assigned to you.</p>

        {role === "student" && demoMode ? <div className="mt-5 border border-brand/25 bg-brand/[.05] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-brand">Demo access</p>
          <p className="mt-1 text-xs leading-5 text-muted">Enter any email or name and any password to continue. No registration is required and passwords are not stored.</p>
        </div> : !supabaseConfigured && (
          <p className="mt-5 border-l-2 border-brand px-3 py-2 text-xs leading-5 text-muted">
            {role === "teacher" ? "Local teacher access is available while authentication is being configured. Set the Supabase URL and anon key to enforce account roles." : "Authentication is not configured yet. Set the Supabase URL and anon key to enable sign-in."}
          </p>
        )}

        {error && <p role="alert" className="mt-5 text-sm text-[#ffb3aa]">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-white/75">
            {role === "student" && demoMode ? "Email or name" : "Email"}
            <input
              type={role === "student" && demoMode ? "text" : "email"}
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
            disabled={pending || (!supabaseConfigured && role === "student" && !demoMode)}
            className="w-full bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Signing in..." : supabaseConfigured || role !== "teacher" ? `Sign in as ${role}` : "Enter teacher workspace"}
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
