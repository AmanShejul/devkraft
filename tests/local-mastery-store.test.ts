import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreAssessment } from "@/features/assessments/question-bank";
import { countLocalVivaAttempt, hasLocalVivaAttempt, readLocalMasteryRecord, writeLocalMasteryRecord } from "@/features/assessments/local-mastery-store";
import { selectNextMission } from "@/features/adaptive-learning";
import { LEARNING_MISSIONS } from "@/data/learning";

function makeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("browser mastery persistence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retains the numeric assessment score and BKT concept values across reads", () => {
    vi.stubGlobal("window", { localStorage: makeStorage() });
    const learnerId = "learner-demo-1";
    const result = scoreAssessment([
      { questionId: "variables-1", choiceId: "c" },
      { questionId: "conditionals-1", choiceId: "a" },
      { questionId: "loops-1", choiceId: "b" },
    ]);

    writeLocalMasteryRecord(learnerId, { mastery: result.mastery, assessmentResult: { ...result, persistence: "saved" } });
    const restored = readLocalMasteryRecord(learnerId);

    expect(restored.assessmentResult?.score).toBe(3);
    expect(restored.assessmentResult?.total).toBe(3);
    expect(restored.mastery.map((item) => item.conceptId)).toEqual(["variables", "conditionals", "loops"]);
    expect(restored.mastery.every((item) => item.probability > 0)).toBe(true);
  });

  it("counts a local viva attempt once and selects the weakest unlocked mission", () => {
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const learnerId = "learner-demo-2";
    expect(hasLocalVivaAttempt(learnerId, "countdown")).toBe(false);
    countLocalVivaAttempt(learnerId, "countdown");
    expect(hasLocalVivaAttempt(learnerId, "countdown")).toBe(true);

    const mission = selectNextMission(LEARNING_MISSIONS, {
      variables: 0.8,
      conditionals: 0.7,
      loops: 0.6,
      arrays: 0.2,
      functions: 0.4,
      "array-iteration": 0,
    });
    expect(mission?.mission.id).toBe("array-basics");
  });

  it("preserves saved viva attempt records when reading a local mastery record", () => {
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const learnerId = "learner-demo-3";
    const mastery = [{ conceptId: "variables", probability: 0.7 }];
    writeLocalMasteryRecord(learnerId, { mastery, vivaAttempts: ["countdown"] });

    expect(readLocalMasteryRecord(learnerId).vivaAttempts).toEqual(["countdown"]);
  });
});
