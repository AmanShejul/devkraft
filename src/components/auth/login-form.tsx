"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AppRole } from "@/lib/auth/authorization";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  const [error, setError] = useState(roleMismatch ? "This account does not have access to this workspace." : "");
  const [pending, setPending] = useState(false);
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const otherRole = role === "student" ? "teacher" : "student";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Sign-in is unavailable until Supabase is configured.");
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

        {!supabaseConfigured && (
          <p className="mt-5 border-l-2 border-brand px-3 py-2 text-xs leading-5 text-muted">
            Authentication is not configured yet. Set the Supabase URL and anon key to enable sign-in; demo workspaces remain available.
          </p>
        )}

        {error && <p role="alert" className="mt-5 text-sm text-[#ffb3aa]">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-white/75">
            Email
            <input
              type="email"
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
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full border border-[var(--line)] bg-[#0b0d0f] px-3 py-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !supabaseConfigured}
            className="w-full bg-brand px-4 py-3 text-sm font-bold text-[#171411] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Signing in..." : `Sign in as ${role}`}
          </button>
        </form>

        <p className="mt-6 border-t border-[var(--line)] pt-5 text-xs text-muted">
          {role === "teacher" ? "Need student access?" : "Are you a teacher?"}{" "}
          <Link href={roleLoginPaths[otherRole]} className="font-semibold text-brand hover:text-brand-dark">
            Sign in as {otherRole}
          </Link>
        </p>
      </div>
    </div>
  );
}