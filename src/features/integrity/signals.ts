import type { IntegritySignal, SessionEvent } from "@/types/domain";

function numericPayload(event: SessionEvent, key: string): number {
  const value = event.payload?.[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function isHiddenFocusEvent(event: SessionEvent): boolean {
  return event.kind === "focus-change" && event.payload?.hidden === true;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function findUnusualEditRateEvent(events: readonly SessionEvent[]): SessionEvent | undefined {
  const edits = events
    .filter((event) => event.kind === "edit")
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
  const rates: number[] = [];
  for (let index = 1; index < edits.length; index += 1) {
    const elapsedSeconds = (Date.parse(edits[index].occurredAt) - Date.parse(edits[index - 1].occurredAt)) / 1000;
    if (elapsedSeconds > 0) rates.push(numericPayload(edits[index], "charsInserted") / elapsedSeconds);
  }

  const baseline = median(rates);
  if (baseline > 0) {
    let sustainedFastEvents = 0;
    for (let index = 1; index < edits.length; index += 1) {
      const elapsedSeconds = (Date.parse(edits[index].occurredAt) - Date.parse(edits[index - 1].occurredAt)) / 1000;
      const rate = elapsedSeconds > 0 ? numericPayload(edits[index], "charsInserted") / elapsedSeconds : 0;
      sustainedFastEvents = rate > baseline * 1.5 ? sustainedFastEvents + 1 : 0;
      if (sustainedFastEvents >= 3) return edits[index];
    }
  }

  const totalDeletions = edits.reduce((total, event) => total + numericPayload(event, "charsDeleted"), 0);
  const totalInsertions = edits.reduce((total, event) => total + numericPayload(event, "charsInserted"), 0);
  if (totalDeletions !== 0 || totalInsertions <= 100) return undefined;

  let inserted = 0;
  return edits.find((event) => {
    inserted += numericPayload(event, "charsInserted");
    return inserted > 100;
  });
}

/** Derives review evidence without treating any signal as a verdict. */
export function deriveIntegritySignals(events: readonly SessionEvent[]): IntegritySignal[] {
  const signals: IntegritySignal[] = [];
  for (const event of events) {
    if (event.kind === "edit"
      && event.payload?.isPaste === true
      && numericPayload(event, "charsInserted") > 200) {
      signals.push({ kind: "paste-burst", occurredAt: event.occurredAt, severity: "review" });
    }
    if (isHiddenFocusEvent(event)) {
      signals.push({ kind: "tab-hidden", occurredAt: event.occurredAt, severity: "review" });
    }
  }

  const unusualEditEvent = findUnusualEditRateEvent(events);
  if (unusualEditEvent) {
    signals.push({ kind: "unusual-edit-rate", occurredAt: unusualEditEvent.occurredAt, severity: "review" });
  }

  return signals.sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
}
