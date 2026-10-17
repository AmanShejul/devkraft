import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { AssessmentPanel } from "@/components/assessments/assessment-panel";
import { getPublicQuestions } from "@/features/assessments";
import { getStudentSession } from "@/lib/auth/student-session";

export const metadata: Metadata = { title: "Assessment check-in" };

export default async function AssessmentPage() {
  const session = await getStudentSession();
  return <PageLayout>
    <PageIntro eyebrow="Practice check-in" title="Start with what you know." description="A short, low-pressure check-in on core programming ideas." >
      <span className="hidden size-12 place-items-center rounded-2xl bg-brand-soft text-brand sm:grid"><ClipboardCheck size={22} /></span>
    </PageIntro>
    <AssessmentPanel initialQuestions={getPublicQuestions()} learnerId={session?.id} />
  </PageLayout>;
}
