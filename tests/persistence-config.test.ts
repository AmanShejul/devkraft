import { afterEach, describe, expect, it, vi } from "vitest";
import { getLearnerMastery } from "@/features/assessments/mastery-store";
import { assertLocalPersistenceAllowed, PersistenceConfigurationError } from "@/lib/persistence";

afterEach(() => vi.unstubAllEnvs());

describe("production persistence guard", () => {
  it("allows the intentional student demo fallback when Supabase is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(getLearnerMastery(crypto.randomUUID())).resolves.toBeNull();
  });

  it("rejects local persistence when Supabase is configured but unavailable to the request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    expect(() => assertLocalPersistenceAllowed("Learner mastery")).toThrowError(PersistenceConfigurationError);
  });
});
