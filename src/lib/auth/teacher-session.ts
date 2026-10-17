import { cookies } from "next/headers";

const DEMO_TEACHER_COOKIE = "skillpath_demo_teacher_id";

export type TeacherSession = { id: string; email: string; mode: "demo" };

export function isTeacherDemoModeEnabled(): boolean {
  return true;
}

export async function getTeacherSession(): Promise<TeacherSession | null> {
  if (process.env.NODE_ENV === "test") return { id: "demo-teacher", email: "demo-teacher", mode: "demo" };
  const cookieStore = await cookies();
  if (isTeacherDemoModeEnabled() && cookieStore.get(DEMO_TEACHER_COOKIE)?.value === "demo-teacher") {
    return { id: "demo-teacher", email: "demo-teacher", mode: "demo" };
  }

  return null;
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
