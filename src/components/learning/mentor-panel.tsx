"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, LoaderCircle, MessageCircleQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { ApiResponse } from "@/types/api";
import type { MentorHint } from "@/types/domain";

interface MentorResponse {
  retrievedKnowledge: MentorHint[];
  heuristicSuggestion: MentorHint;
  generatedExplanationAvailable: false;
}

export function MentorPanel() {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<MentorResponse | null>(null);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/mentor/hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const payload = await response.json() as ApiResponse<MentorResponse>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Could not prepare a hint." : payload.error.message);
      setAnswer(payload.data);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Could not prepare a hint.");
    } finally {
      setPending(false);
    }
  }

  return <SectionCard>
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#fff3d7] text-[#a87513]"><MessageCircleQuestion size={19} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-ink">Study hint</h2><Badge tone="gray">DETERMINISTIC</Badge></div><p className="mt-1 text-xs leading-5 text-muted">Searches local concept notes and offers a rule-based way to investigate.</p></div></div>
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={ask}><label htmlFor="mentor-query" className="sr-only">What are you working on?</label><input id="mentor-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={2000} required placeholder="e.g. Why does my loop stop early?" className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel-raised)] px-3.5 py-3 text-sm text-ink placeholder:text-muted" /><button disabled={pending} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-[#171411] hover:bg-brand-dark disabled:opacity-60">{pending ? <LoaderCircle size={15} className="animate-spin" /> : <>Get a hint <ArrowUpRight size={15} /></>}</button></form>
    {error && <p role="alert" className="mt-3 text-xs text-[#a34436]">{error}</p>}
    {answer && <div className="mt-5 space-y-3">
      {answer.retrievedKnowledge.length > 0 ? answer.retrievedKnowledge.map((hint) => <div key={hint.title} className="rounded-xl border border-[var(--line)] bg-[var(--panel-raised)] p-4"><div className="flex items-center gap-2 text-xs font-bold text-ink"><BookOpen size={14} className="text-brand" /> Retrieved knowledge · {hint.title}</div><p className="mt-2 text-sm leading-6 text-muted">{hint.text}</p></div>) : <p className="rounded-xl bg-[var(--panel-raised)] p-4 text-xs leading-5 text-muted">No matching concept note was found. The heuristic below is based on general tracing practice.</p>}
      <div className="rounded-xl border border-[#725b36] bg-[#292318] p-4"><div className="text-xs font-bold text-[#e8b96a]">Heuristic suggestion</div><p className="mt-2 text-sm leading-6 text-[#d6c8aa]">{answer.heuristicSuggestion.text}</p></div>
      <p className="text-[11px] text-muted">No generated explanation is connected. These notes and suggestions are deterministic.</p>
    </div>}
  </SectionCard>;
}
