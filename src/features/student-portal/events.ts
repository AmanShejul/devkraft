import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertLocalPersistenceAllowed } from "@/lib/persistence";

export type LearningEventType = "topic_opened" | "diagnostic_completed" | "explanation_viewed" | "concept_revisited" | "practice_completed" | "topic_completed";

export type StudentLearningEvent = {
  id: string;
  learnerId: string;
  assignmentId: string;
  topicId: string;
  type: LearningEventType;
  conceptId?: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean>;
};

const eventsPath = path.join(process.cwd(), ".data", "student-portal", "events.json");

export async function listDemoStudentEvents(learnerId?: string): Promise<StudentLearningEvent[]> {
  assertLocalPersistenceAllowed("Student learning events", true);
  try {
    const parsed: unknown = JSON.parse(await readFile(eventsPath, "utf8"));
    if (!Array.isArray(parsed)) return [];
    const events = parsed as StudentLearningEvent[];
    return learnerId ? events.filter((event) => event.learnerId === learnerId) : events;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveDemoStudentEvent(event: Omit<StudentLearningEvent, "id" | "occurredAt">): Promise<StudentLearningEvent> {
  const events = await listDemoStudentEvents();
  const stored = { ...event, id: randomUUID(), occurredAt: new Date().toISOString() };
  events.unshift(stored);
  await mkdir(path.dirname(eventsPath), { recursive: true });
  const temporaryPath = `${eventsPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(events, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, eventsPath);
  return stored;
}
