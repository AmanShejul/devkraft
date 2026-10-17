import type { AssessmentResult, ConceptMastery } from "@/types/domain";

export interface LocalMasteryRecord {
  mastery: ConceptMastery[];
  assessmentResult?: AssessmentResult;
  vivaAttempts?: string[];
}

function storageKey(learnerId: string): string {
  if (!learnerId.trim()) throw new TypeError("A learner id is required to access local mastery.");
  return `skillpath:mastery:${learnerId}`;
}

function isConceptMastery(value: unknown): value is ConceptMastery {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.conceptId === "string"
    && typeof item.probability === "number"
    && Number.isFinite(item.probability)
    && item.probability >= 0
    && item.probability <= 1
    && (item.updatedAt === undefined || typeof item.updatedAt === "string");
}

function isAssessmentResult(value: unknown): value is AssessmentResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.attemptId === "string"
    && typeof result.score === "number"
    && typeof result.total === "number"
    && typeof result.completedAt === "string"
    && (result.persistence === "demo" || result.persistence === "saved")
    && Array.isArray(result.answers)
    && Array.isArray(result.mastery)
    && result.mastery.every(isConceptMastery);
}

export function readLocalMasteryRecord(learnerId: string): LocalMasteryRecord {
  const raw = window.localStorage.getItem(storageKey(learnerId));
  if (!raw) return { mastery: [] };
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Record<string, unknown>).mastery)) {
    throw new Error("Saved browser mastery has an invalid format.");
  }
  const record = parsed as Record<string, unknown>;
  const mastery = record.mastery;
  if (!Array.isArray(mastery) || !mastery.every(isConceptMastery)) throw new Error("Saved browser mastery has an invalid format.");

  const vivaAttempts = record.vivaAttempts;
  if (vivaAttempts !== undefined && (!Array.isArray(vivaAttempts) || !vivaAttempts.every((attempt) => typeof attempt === "string"))) {
    throw new Error("Saved browser mastery has an invalid format.");
  }

  return {
    mastery,
    ...(isAssessmentResult(record.assessmentResult) ? { assessmentResult: record.assessmentResult } : {}),
    ...(vivaAttempts ? { vivaAttempts: vivaAttempts as string[] } : {}),
  };
}

export function writeLocalMasteryRecord(learnerId: string, record: LocalMasteryRecord): void {
  if (!record.mastery.every(isConceptMastery)) throw new TypeError("Invalid browser mastery values.");
  if (record.vivaAttempts?.some((attempt) => typeof attempt !== "string")) throw new TypeError("Invalid browser viva attempt records.");
  window.localStorage.setItem(storageKey(learnerId), JSON.stringify(record));
}

export function localVivaAttemptKey(learnerId: string, missionId: string): string {
  return `${storageKey(learnerId)}:viva:${missionId}`;
}

export function hasLocalVivaAttempt(learnerId: string, missionId: string): boolean {
  return window.localStorage.getItem(localVivaAttemptKey(learnerId, missionId)) === "counted";
}

export function countLocalVivaAttempt(learnerId: string, missionId: string): void {
  window.localStorage.setItem(localVivaAttemptKey(learnerId, missionId), "counted");
}

export function getOrCreateBrowserLearnerId(): string {
  const key = "skillpath:learner-id";
  const stored = window.localStorage.getItem(key);
  if (stored?.trim()) return stored;
  const learnerId = window.crypto.randomUUID();
  window.localStorage.setItem(key, learnerId);
  return learnerId;
}
