import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/authorization";
import { getStudentSession } from "@/lib/auth/student-session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export async function requireWorkspaceRole(role: AppRole): Promise<void> {
  if (role === "student") {
    const studentSession = await getStudentSession();
    if (!studentSession) redirect("/login/student");
    return;
  }

  const teacherSession = await getTeacherSession();
  if (!teacherSession) redirect(`/login/${role}`);
}
