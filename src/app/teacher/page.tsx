import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { SectionCard } from "@/components/ui/section-card";
import { AssignmentStudio } from "@/components/teacher/assignment-studio";
import { TeacherAnalytics } from "@/components/teacher/teacher-analytics";
import { StudentSessionActions } from "@/components/student/student-session-actions";
import { IntegrityReviewQueue } from "@/components/teacher/integrity-review-queue";
import { requireWorkspaceRole } from "@/lib/auth/require-workspace-role";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export const metadata: Metadata = { title: "Teacher workspace" };

export default async function TeacherPage() {
  await requireWorkspaceRole("teacher");
  const session = await getTeacherSession();
  if (!session) return null;

  return <PageLayout>
    <PageIntro eyebrow="Teacher workspace / Command center" title="Design the next lesson." description="Create thoughtful question sets, check the references, and move your learners forward with clarity.">
      <StudentSessionActions role="teacher" email={session.email} demoMode={session.mode === "demo"} />
    </PageIntro>
    <div className="space-y-6">
      <SectionCard className="relative isolate overflow-hidden border-brand/20 bg-[radial-gradient(circle_at_86%_20%,rgba(232,185,106,.16),transparent_32%),linear-gradient(135deg,rgba(31,36,41,.96),rgba(12,15,18,.98))] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-brand"><Sparkles size={15} /><span className="text-[10px] font-bold uppercase tracking-[.18em]">Lesson builder</span></div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-ink sm:text-3xl">Turn your notes into a focused learning moment.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Upload course material, get a helpful first draft, then keep the final call with you.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[330px]">
            {[{ step: "01", label: "Add content" }, { step: "02", label: "Review Qs" }, { step: "03", label: "Publish" }].map((item) => <div key={item.step} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"><span className="text-[10px] font-bold text-brand">{item.step}</span><p className="mt-2 text-[11px] font-semibold leading-4 text-white/75">{item.label}</p></div>)}
          </div>
        </div>
      </SectionCard>

      <AssignmentStudio />
      <IntegrityReviewQueue />
      <section id="student-progress" className="scroll-mt-6 space-y-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Student results and analysis</h2>
          <p className="mt-1 text-sm text-muted">Review submitted scores, question-by-question answers, explanations, and concepts to revisit.</p>
        </div>
        <TeacherAnalytics />
      </section>
    </div>
  </PageLayout>;
}
