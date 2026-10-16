import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { AssessmentPanel } from "@/components/assessments/assessment-panel";
import { getPublicQuestions } from "@/features/assessments";

export const metadata: Metadata = { title: "Assessment check-in" };

export default function AssessmentPage() {
  return <PageLayout>
    <PageIntro eyebrow="Practice check-in" title="Start with what you know." description="A short, low-pressure check-in on core programming ideas." >
      <span className="hidden size-12 place-items-center rounded-2xl bg-brand-soft text-brand sm:grid"><ClipboardCheck size={22} /></span>
    </PageIntro>
    <AssessmentPanel initialQuestions={getPublicQuestions()} />
  </PageLayout>;
}
