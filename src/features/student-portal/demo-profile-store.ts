import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertLocalPersistenceAllowed } from "@/lib/persistence";

export type DemoStudentProfile = {
  id: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
};

type DemoProfileState = { profiles: DemoStudentProfile[] };

const EMPTY_STATE: DemoProfileState = { profiles: [] };
let writeQueue: Promise<void> = Promise.resolve();

function getStatePath(): string {
  return process.env.STUDENT_DEMO_PROFILES_PATH
    ? path.resolve(process.env.STUDENT_DEMO_PROFILES_PATH)
    : path.join(process.cwd(), ".data", "student-portal", "profiles.json");
}

export function normalizeStudentEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readState(): Promise<DemoProfileState> {
  assertLocalPersistenceAllowed("Student profiles", true);
  try {
    const value: unknown = JSON.parse(await readFile(getStatePath(), "utf8"));
    if (!value || typeof value !== "object" || !Array.isArray((value as { profiles?: unknown }).profiles)) return EMPTY_STATE;
    return { profiles: (value as { profiles: DemoStudentProfile[] }).profiles };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return EMPTY_STATE;
    throw error;
  }
}

async function writeState(state: DemoProfileState): Promise<void> {
  const statePath = getStatePath();
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, statePath);
}

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function getDemoStudentProfile(id: string): Promise<DemoStudentProfile | null> {
  return (await readState()).profiles.find((profile) => profile.id === id) ?? null;
}

export async function listDemoStudentProfiles(): Promise<DemoStudentProfile[]> {
  return (await readState()).profiles;
}

export async function touchDemoStudentProfile(id: string): Promise<void> {
  await withWriteLock(async () => {
    const state = await readState();
    const now = new Date().toISOString();
    state.profiles = state.profiles.map((profile) => profile.id === id ? { ...profile, lastActivityAt: now } : profile);
    await writeState(state);
  });
}

export async function findOrCreateDemoStudent(email: string): Promise<{ profile: DemoStudentProfile; created: boolean }> {
  const normalizedEmail = normalizeStudentEmail(email);
  return withWriteLock(async () => {
    const state = await readState();
    const existing = state.profiles.find((profile) => normalizeStudentEmail(profile.email) === normalizedEmail);
    const now = new Date().toISOString();
    if (existing) {
      const profile = { ...existing, lastActivityAt: now };
      state.profiles = state.profiles.map((item) => item.id === existing.id ? profile : item);
      await writeState(state);
      return { profile, created: false };
    }

    const profile = { id: randomUUID(), email: normalizedEmail, createdAt: now, lastActivityAt: now };
    state.profiles.push(profile);
    await writeState(state);
    return { profile, created: true };
  });
}
