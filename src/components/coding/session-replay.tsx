"use client";

import { useState } from "react";
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

  return <section aria-label="Session replay" className="rounded-2xl border border-[#262626] bg-[#090909] p-5 shadow-card sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">Session timeline</h2>
        <p className="mt-1 text-xs text-muted">Attempt {sessionId.slice(0, 8)} · {events.length} events</p>
      </div>
      <button type="button" onClick={onStartNewAttempt} className="rounded-full border border-[#dfe8e3] px-3 py-1.5 text-xs font-bold text-ink hover:bg-[#f6f9f7]">New attempt</button>
    </div>

    <div className="mt-4 rounded-xl bg-[#f5f8f6] p-3 text-xs leading-5 text-muted">
      <strong className="text-ink">Trainer note:</strong> Signals are evidence, not verdicts.
    </div>

    {signals.length > 0 && <div aria-label="Integrity signals" className="mt-4 space-y-2">
      {signals.map((signal) => <button
        key={`${signal.kind}-${signal.occurredAt}`}
        type="button"
        onClick={() => jumpToSignal(signal)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e4c987] bg-[#fffaf0] px-3 py-2 text-left text-xs text-[#776441] hover:bg-[#fff4d9]"
      >
        <span><strong>Flagged for review:</strong> {signalLabel(signal.kind)}</span>
        <time dateTime={signal.occurredAt} className="shrink-0">{formatTimestamp(signal.occurredAt)}</time>
      </button>)}
    </div>}

    {events.length > 0 ? <>
      <label htmlFor="timeline-scrubber" className="mt-5 block text-xs font-bold text-ink">Replay position</label>
      <input
        id="timeline-scrubber"
        aria-label="Replay position"
        type="range"
        min={0}
        max={events.length - 1}
        value={activeIndex}
        onChange={(event) => setSelectedIndex(Number(event.target.value))}
        className="mt-2 w-full accent-[#177c68]"
      />
      {selectedEvent && <p className="mt-2 text-xs text-muted"><time dateTime={selectedEvent.occurredAt}>{formatTimestamp(selectedEvent.occurredAt)}</time> · {eventDescription(selectedEvent)}</p>}
      <ol className="mt-4 max-h-56 space-y-1.5 overflow-auto">
        {events.map((event, index) => <li key={event.id}>
          <button
            type="button"
            aria-current={index === activeIndex ? "step" : undefined}
            onClick={() => setSelectedIndex(index)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs ${index === activeIndex ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-[#f5f8f6]"}`}
          >
            <time dateTime={event.occurredAt} className="shrink-0 tabular-nums">{formatTimestamp(event.occurredAt)}</time>
            <span>{eventDescription(event)}</span>
          </button>
        </li>)}
      </ol>
    </> : <p className="mt-4 text-sm text-muted">Edit code or run an action to begin this attempt’s timeline.</p>}
  </section>;
}
