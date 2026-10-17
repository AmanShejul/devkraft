import { cookies } from "next/headers";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEMO_TEACHER_COOKIE = "skillpath_demo_teacher_id";

export type TeacherSession = { id: string; email: string; mode: "demo" | "supabase" };

export function isTeacherDemoModeEnabled(): boolean {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return process.env.TEACHER_DEMO_MODE === "true" || (!supabaseConfigured && process.env.NODE_ENV !== "production");
}

export async function getTeacherSession(): Promise<TeacherSession | null> {
  if (process.env.NODE_ENV === "test") return { id: "demo-teacher", email: "demo-teacher", mode: "demo" };
  const cookieStore = await cookies();
  if (isTeacherDemoModeEnabled() && cookieStore.get(DEMO_TEACHER_COOKIE)?.value === "demo-teacher") {
    return { id: "demo-teacher", email: "demo-teacher", mode: "demo" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase || isTeacherDemoModeEnabled()) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasAppRole(user, "teacher")) return null;
  return { id: user.id, email: user.email ?? "", mode: "supabase" };
}

export async function setDemoTeacherSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_TEACHER_COOKIE, "demo-teacher", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDemoTeacherSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_TEACHER_COOKIE);
}