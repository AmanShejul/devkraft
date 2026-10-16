import { describe, expect, it } from "vitest";
import { updateMissionMasteryFromSubmission } from "@/features/code-execution/mastery";

describe("countDown mission mastery", () => {
  it("updates loops mastery for a passing submission without requiring a viva", () => {
    const current = [{ conceptId: "loops", probability: 0.5 }];
    const mastery = updateMissionMasteryFromSubmission(current, true, new Date("2026-01-01T00:00:00Z"));

    expect(mastery.find((item) => item.conceptId === "loops")?.probability).toBeGreaterThan(0.5);
  });

  it("moves loops mastery down for a non-passing submission", () => {
    const mastery = updateMissionMasteryFromSubmission(
      [{ conceptId: "loops", probability: 0.5 }],
      false,
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(mastery.find((item) => item.conceptId === "loops")?.probability).toBeLessThan(0.5);
  });
});
