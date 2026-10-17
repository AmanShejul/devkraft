"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function StudentSessionActions({ role = "student", email, demoMode }: { role?: "student" | "teacher"; email: string; demoMode: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(role === "student" ? "/api/student/demo-login" : "/api/teacher/demo-login", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not end the demo session.");
      router.replace(`/login/${role}`);
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
      setPending(false);
    }
  }

  return <div className="flex flex-col items-end gap-2">
    <div className="flex flex-wrap items-center justify-end gap-2">
      {demoMode && <span className="border border-brand/30 bg-brand/[.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-brand">Demo mode</span>}
      <span className="text-xs text-muted">{email}</span>
      <button type="button" onClick={() => void signOut()} disabled={pending} className="inline-flex items-center gap-1.5 border border-[var(--line)] px-3 py-2 text-xs font-semibold text-white/75 hover:border-brand disabled:opacity-50"><LogOut size={14} />{pending ? "Signing out" : "Sign out"}</button>
    </div>
    {error && <p role="alert" className="text-xs text-[#ffb3aa]">{error}</p>}
  </div>;
}
