import type { SessionEvent } from "@/types/domain";

export const SESSION_STORAGE_KEY = "skillpath:arena-session";
export const SESSION_HISTORY_STORAGE_KEY = "skillpath:arena-sessions";

export interface StoredArenaSession {
  sessionId: string;
  events: SessionEvent[];
}

export function isStoredArenaSession(value: unknown): value is StoredArenaSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { sessionId?: unknown; events?: unknown };
  return typeof candidate.sessionId === "string"
    && Array.isArray(candidate.events)
    && candidate.events.every((event) => {
      if (!event || typeof event !== "object") return false;
      const item = event as Record<string, unknown>;
      return typeof item.id === "string"
        && item.sessionId === candidate.sessionId
        && (item.kind === "edit" || item.kind === "run" || item.kind === "submit" || item.kind === "focus-change")
        && typeof item.occurredAt === "string";
    });
}

export function readStoredArenaSessions(): StoredArenaSession[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredArenaSession) : [];
  } catch {
    return [];
  }
}
