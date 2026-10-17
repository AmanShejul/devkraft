import type { Metadata } from "next";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { MasteryList } from "@/components/student/mastery-list";
import { getLearnerMastery } from "@/features/assessments/mastery-store";
import { requireWorkspaceRole } from "@/lib/auth/require-workspace-role";
import { PublishedAssignments } from "@/components/student/published-assignments";
import { StudentSessionActions } from "@/components/student/student-session-actions";
import { getStudentSession } from "@/lib/auth/student-session";

export const metadata: Metadata = { title: "Student workspace" };

export default async function StudentPage() {
  await requireWorkspaceRole("student");
  const session = await getStudentSession();
  if (!session) return null;
  const savedMastery = await getLearnerMastery(session.id);
  const mastery = savedMastery ?? [];

  return (
    <PageLayout>
      <PageIntro eyebrow="Student workspace" title={`Welcome, ${session.email || "learner"}.`} description="Your published topics, assessments, and progress are tied to this student profile.">
        <StudentSessionActions email={session.email} demoMode={session.mode === "demo"} />
      </PageIntro>
      <div className="space-y-5">
        <PublishedAssignments />
        <MasteryList mastery={mastery} />
        <p className="border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-xs leading-5 text-muted">Progress and recommendations are based on saved assessment responses. Opening a topic alone does not mark it complete.</p>
      </div>
    </PageLayout>
  );
}
