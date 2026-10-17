import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findOrCreateDemoStudent } from "@/features/student-portal/demo-profile-store";
import { isStudentDemoModeEnabled } from "@/lib/auth/student-session";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "skillpath-student-demo-"));
  vi.stubEnv("STUDENT_DEMO_PROFILES_PATH", path.join(directory, "profiles.json"));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe("demo student profiles", () => {
  it("keeps the student login as a demo gate when Supabase is not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(isStudentDemoModeEnabled()).toBe(true);
  });

  it("reuses an existing profile for the same normalized email without storing a password", async () => {
    const first = await findOrCreateDemoStudent("  Student@Example.com ");
    const second = await findOrCreateDemoStudent("student@example.COM");
    const stored = JSON.parse(await readFile(path.join(directory, "profiles.json"), "utf8")) as { profiles: Array<Record<string, unknown>> };

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.profile.id).toBe(first.profile.id);
    expect(stored.profiles).toHaveLength(1);
    expect(stored.profiles[0]).not.toHaveProperty("password");
  });

  it("keeps profiles and progress identities separate for different emails", async () => {
    const first = await findOrCreateDemoStudent("first");
    const second = await findOrCreateDemoStudent("second");

    expect(second.profile.id).not.toBe(first.profile.id);
  });
});
