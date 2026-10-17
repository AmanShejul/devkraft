import { cookies } from "next/headers";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDemoStudentProfile } from "@/features/student-portal/demo-profile-store";

const DEMO_STUDENT_COOKIE = "skillpath_demo_student_id";
const LEARNER_COOKIE = "skillpath_learner_id";
const studentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudentSession = {
  id: string;
  email: string;
  mode: "demo" | "supabase";
  createdAt?: string;
  lastActivityAt?: string;
};

export function isStudentDemoModeEnabled(): boolean {
  return true;
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const cookieStore = await cookies();
  if (isStudentDemoModeEnabled()) {
    const id = cookieStore.get(DEMO_STUDENT_COOKIE)?.value;
    if (!id || !studentIdPattern.test(id)) return null;
    const profile = await getDemoStudentProfile(id);
    return profile ? { id: profile.id, email: profile.email, mode: "demo", createdAt: profile.createdAt, lastActivityAt: profile.lastActivityAt } : null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasAppRole(user, "student")) return null;
  return { id: user.id, email: user.email ?? "", mode: "supabase", createdAt: user.created_at };
}

export async function setDemoStudentSession(id: string): Promise<void> {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
  cookieStore.set(DEMO_STUDENT_COOKIE, id, options);
  cookieStore.set(LEARNER_COOKIE, id, options);
}

export async function clearDemoStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_STUDENT_COOKIE);
  cookieStore.delete(LEARNER_COOKIE);
}

export async function isDemoStudentIdentity(id: string): Promise<boolean> {
  if (!isStudentDemoModeEnabled()) return false;
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_STUDENT_COOKIE)?.value !== id) return false;
  return (await getDemoStudentProfile(id)) !== null;
}
