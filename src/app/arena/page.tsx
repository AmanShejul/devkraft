import type { Metadata } from "next";
import { ArrowLeft, CheckCheck, Clock3 } from "lucide-react";
import Link from "next/link";
import { PageIntro, PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { CodeEditor } from "@/components/coding/code-editor";
import { MentorPanel } from "@/components/learning/mentor-panel";

export const metadata: Metadata = { title: "Coding arena" };

export default function ArenaPage() {
  return <PageLayout>
    <Link href="/student" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand"><ArrowLeft size={14} /> Student workspace</Link>
    <PageIntro eyebrow="Coding arena" title="Count it down." description="Practice tracing a loop, then write a function that counts from a starting value down to one." />
    <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
      <aside className="space-y-4">
        <SectionCard>
          <Badge>LOOPS · STARTER</Badge>
          <h2 className="mt-4 text-lg font-bold text-ink">The challenge</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Complete <code className="rounded bg-[#f1f5f2] px-1 py-0.5 text-xs text-ink">countDown</code> so it returns all whole numbers from <code className="rounded bg-[#f1f5f2] px-1 py-0.5 text-xs text-ink">start</code> down to 1.</p>
          <div className="mt-4 rounded-xl bg-[#f5f8f6] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Example</div><pre className="mt-2 text-xs leading-5 text-ink">{`countDown(3) → [3, 2, 1]\ncountDown(1) → [1]`}</pre></div>
          <div className="mt-4 space-y-2 text-xs leading-5 text-muted"><p className="flex items-start gap-2"><CheckCheck size={14} className="mt-0.5 shrink-0 text-brand" /> Start at the input value.</p><p className="flex items-start gap-2"><CheckCheck size={14} className="mt-0.5 shrink-0 text-brand" /> Include 1, then stop.</p><p className="flex items-start gap-2"><Clock3 size={14} className="mt-0.5 shrink-0 text-brand" /> Suggested time: 12 minutes.</p></div>
        </SectionCard>
        <MentorPanel />
      </aside>
      <section aria-label="Code editor and results"><CodeEditor /></section>
    </div>
    <p className="mt-4 rounded-xl border border-[#e6e9df] bg-[#fffaf0] px-4 py-3 text-xs leading-5 text-[#776441]"><strong>Run code</strong> runs the visible sample. <strong>Submit</strong> runs five hidden cases and updates your saved loops mastery. Both require the server-side JDoodle provider to be enabled. Use <strong>Try hostile input</strong> to verify the 12-second timeout.</p>
  </PageLayout>;
}
