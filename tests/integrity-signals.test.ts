import { describe, expect, it } from "vitest";
import { deriveIntegritySignals } from "@/features/integrity/signals";
import type { SessionEvent } from "@/types/domain";

function makeEvent(
  id: string,
  kind: SessionEvent["kind"],
  second: number,
  payload?: SessionEvent["payload"],
): SessionEvent {
  return {
    id,
    sessionId: "session-1",
    kind,
    occurredAt: new Date(Date.UTC(2026, 0, 1) + second * 1000).toISOString(),
    ...(payload ? { payload } : {}),
  };
}

describe("integrity signal detection", () => {
  it("flags a single paste that inserts more than 200 characters at its event time", () => {
    const event = makeEvent("paste", "edit", 3, { charsInserted: 201, charsDeleted: 2, isPaste: true });
    expect(deriveIntegritySignals([event])).toEqual([
      { kind: "paste-burst", occurredAt: event.occurredAt, severity: "review" },
    ]);
  });

  it("flags a hidden-tab focus event at its event time", () => {
    const event = makeEvent("hidden", "focus-change", 4, { hidden: true });
    expect(deriveIntegritySignals([event])).toEqual([
      { kind: "tab-hidden", occurredAt: event.occurredAt, severity: "review" },
    ]);
    expect(deriveIntegritySignals([makeEvent("visible", "focus-change", 4, { hidden: false })])).toEqual([]);
  });

  it("flags sustained typing above the session median and long insertion without corrections", () => {
    const ordinaryEdits = Array.from({ length: 8 }, (_, index) =>
      makeEvent(`ordinary-${index}`, "edit", index, { charsInserted: 4, charsDeleted: 1, isPaste: false }));
    const fastEdits = Array.from({ length: 3 }, (_, index) =>
      makeEvent(`fast-${index}`, "edit", 8 + index * 0.5, { charsInserted: 8, charsDeleted: 1, isPaste: false }));

    const fastSignals = deriveIntegritySignals([...ordinaryEdits, ...fastEdits]);
    expect(fastSignals).toContainEqual({
      kind: "unusual-edit-rate",
      occurredAt: fastEdits[2].occurredAt,
      severity: "review",
    });

    const longNoCorrectionSession = Array.from({ length: 3 }, (_, index) =>
      makeEvent(`long-${index}`, "edit", index, { charsInserted: 40, charsDeleted: 0, isPaste: false }));
    expect(deriveIntegritySignals(longNoCorrectionSession)).toContainEqual({
      kind: "unusual-edit-rate",
      occurredAt: longNoCorrectionSession[2].occurredAt,
      severity: "review",
    });
  });

  it("does not flag a normal typed session with a steady rate and corrections", () => {
    const events = Array.from({ length: 12 }, (_, index) =>
      makeEvent(`typed-${index}`, "edit", index, { charsInserted: 5, charsDeleted: 1, isPaste: false }));
    expect(deriveIntegritySignals(events)).toEqual([]);
  });
});
