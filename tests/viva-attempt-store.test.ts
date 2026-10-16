import { afterEach, describe, expect, it, vi } from "vitest";
import { claimVivaAttemptOnce, releaseVivaAttemptClaim } from "@/features/assessments/mastery-store";

describe("viva attempt persistence", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("atomically grants only one local mastery claim per learner and mission", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const learnerId = crypto.randomUUID();
    const missionId = `test-${crypto.randomUUID()}`;

    try {
      await expect(claimVivaAttemptOnce(learnerId, missionId)).resolves.toBe(true);
      await expect(claimVivaAttemptOnce(learnerId, missionId)).resolves.toBe(false);
    } finally {
      await releaseVivaAttemptClaim(learnerId, missionId);
    }
  });
});
