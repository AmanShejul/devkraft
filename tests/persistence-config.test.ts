import { afterEach, describe, expect, it, vi } from "vitest";
import { getLearnerMastery, claimVivaAttemptOnce } from "@/features/assessments/mastery-store";
import { PersistenceConfigurationError } from "@/lib/persistence";

afterEach(() => vi.unstubAllEnvs());

describe("production persistence guard", () => {
  it("rejects mastery reads when Supabase is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(getLearnerMastery(crypto.randomUUID())).rejects.toBeInstanceOf(PersistenceConfigurationError);
  });

  it("rejects viva claims instead of using local JSON in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(claimVivaAttemptOnce(crypto.randomUUID(), "countdown")).rejects.toMatchObject({ code: "PERSISTENCE_NOT_CONFIGURED" });
  });
});
