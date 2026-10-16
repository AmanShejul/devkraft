"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { IntegritySignal, SessionEvent } from "@/types/domain";
import { deriveIntegritySignals } from "@/features/integrity/signals";

interface SessionReplayProps {
  sessionId: string;
  events: readonly SessionEvent[];
  onStartNewAttempt: () => void;
}

function eventDescription(event: SessionEvent): string {
  switch (event.kind) {
    case "edit": {
      const inserted = event.payload?.charsInserted ?? 0;
      const deleted = event.payload?.charsDeleted ?? 0;
      return `Edited code (+${inserted}, -${deleted} characters${event.payload?.isPaste === true ? ", paste" : ""})`;
    }
    case "run":
      return "Ran visible sample";
    case "submit":
      return event.payload?.hostileInput === true ? "Submitted hostile-input timeout check" : "Submitted hidden tests";
    case "focus-change":
      return event.payload?.hidden === true ? "Tab moved out of view" : "Tab returned to view";
  }
}

function signalLabel(kind: IntegritySignal["kind"]): string {
  switch (kind) {
    case "paste-burst": return "Large paste";
    case "tab-hidden": return "Tab hidden";
    case "unusual-edit-rate": return "Unusual edit pattern";
  }
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toLocaleTimeString();
}

export function SessionReplay({ sessionId, events, onStartNewAttempt }: SessionReplayProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const signals = deriveIntegritySignals(events);
  const activeIndex = selectedIndex === null
    ? Math.max(0, events.length - 1)
    : Math.min(selectedIndex, Math.max(0, events.length - 1));
  const selectedEvent = events[activeIndex];

  function jumpToSignal(signal: IntegritySignal) {
    const matchingIndex = events.findIndex((event) => event.occurredAt === signal.occurredAt);
    if (matchingIndex >= 0) setSelectedIndex(matchingIndex);
  }

  return <section aria-label="Session replay" className="noise-overlay rounded-2xl border border-white/10 bg-[#12171a] p-5 shadow-card sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">Session timeline</h2>
        <p className="mt-1 text-xs text-muted">Attempt {sessionId.slice(0, 8)} · {events.length} events</p>
      </div>
      <button type="button" onClick={onStartNewAttempt} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-ink hover:bg-[var(--panel-raised)]">New attempt</button>
    </div>

    <div className="mt-4 rounded-xl bg-[var(--panel-raised)] p-3 text-xs leading-5 text-muted">
      <strong className="text-ink">Trainer note:</strong> Signals are evidence, not verdicts.
    </div>

    {signals.length > 0 && <div aria-label="Integrity signals" className="mt-4 space-y-2">
      {signals.map((signal) => <button
        key={`${signal.kind}-${signal.occurredAt}`}
        type="button"
        onClick={() => jumpToSignal(signal)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#b35c53]/45 bg-[#3b211f]/70 px-3 py-2 text-left text-xs text-[#f0c0b8] hover:bg-[#4a2724]"
      >
        <span><strong>Flagged for review:</strong> {signalLabel(signal.kind)} <span className="ml-2 text-[10px] text-[#ffb3aa]">Jump to moment</span></span>
        <time dateTime={signal.occurredAt} className="shrink-0">{formatTimestamp(signal.occurredAt)}</time>
      </button>)}
    </div>}

    {events.length > 0 ? <>
      <label htmlFor="timeline-scrubber" className="mt-5 block text-xs font-bold text-ink">Replay position</label>
      <div className="relative mt-3 h-5">
        <div className="absolute inset-x-0 top-2 h-px bg-white/15" aria-hidden="true" />
        {events.map((event, index) => <motion.button key={event.id} type="button" aria-label={`Jump to ${event.kind} event ${index + 1}`} onClick={() => setSelectedIndex(index)} className={`absolute top-0 size-4 -translate-x-1/2 rounded-full border-2 border-[#12171a] ${event.kind === "run" ? "bg-brand" : event.kind === "submit" ? "bg-[#67c9a2]" : event.kind === "focus-change" ? "bg-[#d66a5d]" : "bg-white/40"} ${index === activeIndex ? "ring-2 ring-brand/40" : ""}`} style={{ left: `${events.length === 1 ? 0 : (index / (events.length - 1)) * 100}%` }} />)}
      </div>
      <input
        id="timeline-scrubber"
        aria-label="Replay position"
        type="range"
        min={0}
        max={events.length - 1}
        value={activeIndex}
        onChange={(event) => setSelectedIndex(Number(event.target.value))}
        className="sr-only"
      />
      {selectedEvent && <p className="mt-2 text-xs text-muted"><time dateTime={selectedEvent.occurredAt}>{formatTimestamp(selectedEvent.occurredAt)}</time> · {eventDescription(selectedEvent)}</p>}
      <ol className="mt-4 max-h-56 space-y-1.5 overflow-auto">
        {events.map((event, index) => <li key={event.id}>
          <button
            type="button"
            aria-current={index === activeIndex ? "step" : undefined}
            onClick={() => setSelectedIndex(index)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs ${index === activeIndex ? "bg-brand-soft text-ink" : "text-muted hover:bg-[var(--panel-raised)]"}`}
          >
            <time dateTime={event.occurredAt} className="shrink-0 tabular-nums">{formatTimestamp(event.occurredAt)}</time>
            <span>{eventDescription(event)}</span>
          </button>
        </li>)}
      </ol>
    </> : <p className="mt-4 text-sm text-muted">Edit code or run an action to begin this attempt’s timeline.</p>}
  </section>;
}
