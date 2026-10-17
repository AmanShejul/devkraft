import { cookies } from "next/headers";

const DEMO_STUDENT_COOKIE = "skillpath_demo_student_id";
const LEARNER_COOKIE = "skillpath_learner_id";
const studentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudentSession = {
  id: string;
  email: string;
  mode: "demo";
  createdAt?: string;
  lastActivityAt?: string;
};

export function isStudentDemoModeEnabled(): boolean {
  return true;
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(DEMO_STUDENT_COOKIE)?.value;
  if (!id || !studentIdPattern.test(id)) return null;
  return { id, email: "demo-student", mode: "demo" };
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
  return studentIdPattern.test(id);
}
