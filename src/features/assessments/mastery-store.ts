import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import type { ConceptMastery } from "@/types/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LEARNER_COOKIE = "skillpath_learner_id";
const LEARNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isConceptMasteryArray(value: unknown): value is ConceptMastery[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const mastery = item as Record<string, unknown>;
    return typeof mastery.conceptId === "string"
      && typeof mastery.probability === "number"
      && Number.isFinite(mastery.probability)
      && mastery.probability >= 0
      && mastery.probability <= 1
      && (mastery.updatedAt === undefined || typeof mastery.updatedAt === "string");
  });
}

export async function getCurrentLearnerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const learnerId = cookieStore.get(LEARNER_COOKIE)?.value;
  return learnerId && LEARNER_ID_PATTERN.test(learnerId) ? learnerId : null;
}

export async function getOrCreateLearnerId(): Promise<string> {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(LEARNER_COOKIE)?.value;
  if (existingId && LEARNER_ID_PATTERN.test(existingId)) return existingId;

  const learnerId = randomUUID();
  cookieStore.set(LEARNER_COOKIE, learnerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return learnerId;
}

function masteryFilePath(learnerId: string): string {
  if (!LEARNER_ID_PATTERN.test(learnerId)) throw new TypeError("Invalid learner id.");
  return path.join(process.cwd(), ".data", "learner-mastery", `${learnerId}.json`);
}

async function readFileMastery(learnerId: string): Promise<ConceptMastery[] | null> {
  try {
    const content = await readFile(masteryFilePath(learnerId), "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!isConceptMasteryArray(parsed)) throw new Error("Stored learner mastery data is invalid.");
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function getLearnerMastery(learnerId: string): Promise<ConceptMastery[] | null> {
  const supabase = await createSupabaseServerClient(learnerId);
  if (!supabase) return readFileMastery(learnerId);

  const { data, error } = await supabase
    .from("learner_mastery")
    .select("mastery")
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) throw new Error(`Could not read learner mastery: ${error.message}`);
  if (!data) return null;
  if (!isConceptMasteryArray(data.mastery)) throw new Error("Stored learner mastery data is invalid.");
  return data.mastery;
}

export async function saveLearnerMastery(learnerId: string, mastery: readonly ConceptMastery[]): Promise<void> {
  if (!isConceptMasteryArray(mastery)) throw new TypeError("Invalid learner mastery data.");
  const supabase = await createSupabaseServerClient(learnerId);
  if (supabase) {
    const { error } = await supabase
      .from("learner_mastery")
      .upsert({ learner_id: learnerId, mastery, updated_at: new Date().toISOString() }, { onConflict: "learner_id" });
    if (error) throw new Error(`Could not save learner mastery: ${error.message}`);
    return;
  }

  const filePath = masteryFilePath(learnerId);
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(mastery, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, filePath);
}
