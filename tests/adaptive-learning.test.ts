import { describe, expect, it } from "vitest";
import { getUnmetPrerequisites, isConceptEligible } from "@/features/adaptive-learning/concept-graph";
import { updateMastery } from "@/features/adaptive-learning/bkt";
import { selectNextMission } from "@/features/adaptive-learning/missions";
import { LEARNING_CONFIG } from "@/config/learning";
import { DEMO_MISSIONS } from "@/data/demo-learning";
import { scoreAssessment } from "@/features/assessments";

describe("concept prerequisites", () => {
  it("reports unmet prerequisites and opens a concept when they are mastered", () => {
    expect(getUnmetPrerequisites("array-iteration", { arrays: 0.8, loops: 0.4 })).toEqual(["loops"]);
    expect(isConceptEligible("array-iteration", { arrays: 0.8, loops: 0.7 })).toBe(true);
    expect(isConceptEligible("loops", { variables: 0.8, conditionals: 0.64 })).toBe(false);
    expect(isConceptEligible("unknown", {})).toBe(false);
  });
});

describe("BKT mastery updates", () => {
  it("increases mastery after a correct response and decreases it after an incorrect one", () => {
    const prior = 0.5;
    expect(updateMastery(prior, true, LEARNING_CONFIG.bkt)).toBeGreaterThan(prior);
    expect(updateMastery(prior, false, LEARNING_CONFIG.bkt)).toBeLessThan(prior);
  });

  it("rejects invalid probability inputs", () => {
    expect(() => updateMastery(1.2, true, LEARNING_CONFIG.bkt)).toThrow(RangeError);
  });

  it("updates assessment mastery in opposite directions for correct and incorrect attempts", () => {
    const correctAttempt = scoreAssessment([
      { questionId: "variables-1", choiceId: "c" },
      { questionId: "conditionals-1", choiceId: "a" },
      { questionId: "loops-1", choiceId: "b" },
    ]);
    const incorrectAttempt = scoreAssessment([
      { questionId: "variables-1", choiceId: "a" },
      { questionId: "conditionals-1", choiceId: "b" },
      { questionId: "loops-1", choiceId: "a" },
    ], correctAttempt.mastery);

    for (const conceptId of ["variables", "conditionals", "loops"]) {
      const afterCorrect = correctAttempt.mastery.find((item) => item.conceptId === conceptId)!.probability;
      const afterIncorrect = incorrectAttempt.mastery.find((item) => item.conceptId === conceptId)!.probability;
      expect(afterCorrect).toBeGreaterThan(LEARNING_CONFIG.bkt.initialMastery);
      expect(afterIncorrect).toBeLessThan(afterCorrect);
    }
  });
});

describe("mission selector", () => {
  it("chooses a mission for an eligible weak concept and follows unmet prerequisites", () => {
    const mastery = { variables: 0.9, conditionals: 0.75, loops: 0.3, arrays: 0.54, functions: 0.8, "array-iteration": 0.1 };
    expect(selectNextMission(DEMO_MISSIONS, mastery)?.mission.id).toBe("loop-count");
    expect(selectNextMission(DEMO_MISSIONS, { ...mastery, loops: 0.75, functions: 0.8 })?.mission.id).toBe("array-basics");
    expect(selectNextMission(DEMO_MISSIONS, { variables: 0.2 })?.mission.conceptId).toBe("variables");
  });

  it("returns null when there are no missions", () => {
    expect(selectNextMission([], {})).toBeNull();
  });
});
