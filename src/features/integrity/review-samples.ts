import { DEMO_CLASS } from "@/data/demo-class";
import type { SessionEvent } from "@/types/domain";

export interface ReviewSession {
  sessionId: string;
  learnerName: string;
  events: SessionEvent[];
  isSample: boolean;
}

function event(sessionId: string, id: string, kind: SessionEvent["kind"], occurredAt: string, payload?: SessionEvent["payload"]): SessionEvent {
  return { id, sessionId, kind, occurredAt, ...(payload ? { payload } : {}) };
}

export function createSampleReviewSessions(now = Date.now()): ReviewSession[] {
  const time = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const pasteSessionId = "sample-paste-7a3f";
  const tabSessionId = "sample-tab-2c91";
  const editSessionId = "sample-edit-5e18";

  return [
    {
      sessionId: pasteSessionId,
      learnerName: DEMO_CLASS[0].name,
      isSample: true,
      events: [
        event(pasteSessionId, "paste-1", "edit", time(12), { charsInserted: 18, charsDeleted: 0, isPaste: false }),
        event(pasteSessionId, "paste-2", "edit", time(10), { charsInserted: 420, charsDeleted: 0, isPaste: true }),
        event(pasteSessionId, "paste-3", "run", time(8)),
      ],
    },
    {
      sessionId: tabSessionId,
      learnerName: DEMO_CLASS[1].name,
      isSample: true,
      events: [
        event(tabSessionId, "tab-1", "edit", time(95), { charsInserted: 24, charsDeleted: 0, isPaste: false }),
        event(tabSessionId, "tab-2", "focus-change", time(92), { hidden: true }),
        event(tabSessionId, "tab-3", "focus-change", time(88), { hidden: false }),
        event(tabSessionId, "tab-4", "submit", time(84)),
      ],
    },
    {
      sessionId: editSessionId,
      learnerName: DEMO_CLASS[2].name,
      isSample: true,
      events: [
        event(editSessionId, "edit-1", "edit", time(1_480), { charsInserted: 32, charsDeleted: 0, isPaste: false }),
        event(editSessionId, "edit-2", "edit", time(1_479), { charsInserted: 38, charsDeleted: 0, isPaste: false }),
        event(editSessionId, "edit-3", "edit", time(1_478), { charsInserted: 42, charsDeleted: 0, isPaste: false }),
        event(editSessionId, "edit-4", "run", time(1_475)),
      ],
    },
  ];
}
