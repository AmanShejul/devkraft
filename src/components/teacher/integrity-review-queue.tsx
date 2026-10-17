"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Flag, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { SessionReplay } from "@/components/coding/session-replay";
import { deriveIntegritySignals } from "@/features/integrity/signals";
import { createSampleReviewSessions, type ReviewSession } from "@/features/integrity/review-samples";
import { isStoredArenaSession, readStoredArenaSessions, SESSION_STORAGE_KEY, type StoredArenaSession } from "@/features/integrity/session-storage";
import type { IntegritySignal } from "@/types/domain";

interface ReviewRow {
  key: string;
  session: ReviewSession;
  signal: IntegritySignal;
}

function signalLabel(kind: IntegritySignal["kind"]): string {
  switch (kind) {
    case "paste-burst": return "Large paste";
    case "tab-hidden": return "Tab hidden";
    case "unusual-edit-rate": return "Unusual edit pattern";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function readLocalSessions(): ReviewSession[] {
  const stored: StoredArenaSession[] = [...readStoredArenaSessions()];
  try {
    const current: unknown = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? "null");
    if (isStoredArenaSession(current) && !stored.some((session) => session.sessionId === current.sessionId)) stored.unshift(current);
  } catch {
    // A malformed local session is ignored; the teacher queue remains usable.
  }
  return stored.map((session) => ({ sessionId: session.sessionId, learnerName: "Current learner", events: session.events, isSample: false }));
}

export function IntegrityReviewQueue() {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setSessions([...createSampleReviewSessions(), ...readLocalSessions()]);
    refresh();
    window.addEventListener("storage", refresh);
    const interval = window.setInterval(refresh, 1_500);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(interval);
    };
  }, []);

  const rows = useMemo<ReviewRow[]>(() => sessions.flatMap((session) => deriveIntegritySignals(session.events).map((signal) => ({
    key: `${session.sessionId}-${signal.kind}-${signal.occurredAt}`,
    session,
    signal,
  }))).sort((left, right) => Date.parse(right.signal.occurredAt) - Date.parse(left.signal.occurredAt)), [sessions]);

  return <SectionCard className="overflow-hidden border-[#b35c53]/25 bg-[linear-gradient(145deg,rgba(59,33,31,.22),rgba(17,22,25,.96))] p-0">
    <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 px-5 py-6 sm:px-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#b35c53]/35 bg-[#3b211f]/70 text-[#ffb3aa]"><ShieldAlert size={18} /></span>
        <div><p className="eyebrow text-[#ffb3aa]">Integrity review</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-ink">Flagged for review</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review session evidence in context and jump directly to the moment that created the signal.</p></div>
      </div>
      <Badge tone="gray">LOCAL REVIEW QUEUE</Badge>
    </div>
    <div className="mx-5 mt-5 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs leading-5 text-muted sm:mx-7"><strong className="text-ink">Trainer note:</strong> Signals are evidence, not verdicts.</div>

    {rows.length === 0 ? <p className="px-5 py-8 text-sm text-muted sm:px-7">No sessions flagged for review yet.</p> : <div className="divide-y divide-white/10 px-5 py-2 sm:px-7">
      {rows.map((row) => {
        const isOpen = openKey === row.key;
        return <div key={row.key} className="py-3">
          <button type="button" onClick={() => setOpenKey(isOpen ? null : row.key)} aria-expanded={isOpen} className="group flex w-full flex-wrap items-center gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.035]">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#3b211f]/70 text-[#ffb3aa]"><Flag size={15} /></span>
            <span className="min-w-[150px] flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{row.session.learnerName}</strong><Badge tone="gray">{row.session.isSample ? "SAMPLE DATA" : "LOCAL SESSION"}</Badge></span><span className="mt-1 block font-mono text-[11px] text-muted">Session {row.session.sessionId.slice(0, 8)}</span></span>
            <span className="min-w-[150px] text-xs font-semibold text-[#f0c0b8]">{signalLabel(row.signal.kind)}</span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${row.signal.severity === "review" ? "border-[#b35c53]/45 bg-[#3b211f]/70 text-[#ffb3aa]" : "border-white/10 bg-white/[.04] text-white/55"}`}>{row.signal.severity}</span>
            <time dateTime={row.signal.occurredAt} className="w-full text-[11px] tabular-nums text-white/40 sm:w-auto">{formatTimestamp(row.signal.occurredAt)}</time>
            <ChevronDown size={16} className={`shrink-0 text-white/35 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          {isOpen && <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-2 sm:p-3"><SessionReplay key={row.key} sessionId={row.session.sessionId} events={row.session.events} initialTimestamp={row.signal.occurredAt} onStartNewAttempt={() => setOpenKey(null)} /></div>}
        </div>;
      })}
    </div>}
  </SectionCard>;
}
