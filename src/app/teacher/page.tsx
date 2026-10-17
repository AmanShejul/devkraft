import type { Metadata } from "next";
import { FilePlus2, Sparkles } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { AssignmentStudio } from "@/components/teacher/assignment-studio";
import { IntegrityReviewQueue } from "@/components/teacher/integrity-review-queue";
import { requireWorkspaceRole } from "@/lib/auth/require-workspace-role";

export const metadata: Metadata = { title: "Teacher workspace" };

export default async function TeacherPage() {
  await requireWorkspaceRole("teacher");

  return <PageLayout>
    <PageIntro eyebrow="Teacher workspace / Command center" title="Design the next lesson." description="Create thoughtful question sets, check the references, and move your learners forward with clarity.">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">WORKSPACE READY</Badge>
        <Badge tone="gray">WAITING FOR LEARNER ACTIVITY</Badge>
      </div>
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

      <div className="grid gap-5 sm:grid-cols-3">
        {["Learners", "On learning path", "Average progress"].map((label) => <SectionCard key={label} className="p-5">
          <p className="text-xs font-semibold text-muted">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">—</p>
          <p className="mt-1 text-xs text-muted">No learner data yet</p>
        </SectionCard>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <SectionCard>
          <h2 className="text-lg font-bold text-ink">Concepts to revisit</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Concept patterns will appear after learners complete published work.</p>
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-raised)] p-5 text-sm leading-6 text-muted">There are no learner signals to review yet.</div>
        </SectionCard>
        <SectionCard className="h-full">
          <h2 className="text-lg font-bold text-ink">Student progress</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Learner rows will appear when authorized student activity is saved.</p>
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-raised)] p-5 text-sm leading-6 text-muted">No student records are available yet.</div>
        </SectionCard>
      </div>

      <SectionCard className="border-brand/15 bg-[linear-gradient(135deg,rgba(232,185,106,.07),rgba(31,36,41,.72))] shadow-none">
        <div className="flex items-start gap-3">
          <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><FilePlus2 size={16} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-brand">Suggested intervention</p><h2 className="mt-1 text-lg font-bold text-ink">Interventions will appear after activity.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Publish an assignment and collect learner responses to unlock evidence-based teaching suggestions.</p></div>
        </div>
      </SectionCard>
    </div>
  </PageLayout>;
}
