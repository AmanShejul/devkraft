import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/authorization";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/auth/student-session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export async function requireWorkspaceRole(role: AppRole): Promise<void> {
  if (role === "student") {
    const studentSession = await getStudentSession();
    if (!studentSession) redirect("/login/student");
    return;
  }

  const teacherSession = await getTeacherSession();
  if (!teacherSession) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !hasAppRole(user, role)) redirect(`/login/${role}?reason=role`);
    }
    redirect(`/login/${role}`);
  }
}