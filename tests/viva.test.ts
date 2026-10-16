import { describe, expect, it } from "vitest";
import { evaluateVivaAnswers, generateVivaQuestions, prepareVivaForSubmit, updateVivaMastery } from "@/features/viva/viva";

const solution = `function countDown(initial: number): number[] {
  const counted: number[] = [];
  for (let cursor = initial; cursor >= 1; cursor -= 1) {
    counted.push(cursor);
  }
  return counted;
}`;

describe("solution-based viva", () => {
  it("generates questions with the submitted condition, parameter, return, and collection identifiers", () => {
    const questions = generateVivaQuestions(solution);

    expect(questions).toHaveLength(3);
    expect(questions.map((question) => question.prompt)).toEqual([
      "Your code checks `cursor >= 1` in its loop. What does that condition test before each iteration, and when does the loop stop?",
      "When `initial` is 1, what does the `return counted` path return?",
      "What does your `counted` collection hold when the function finishes?",
    ]);
  });

  it("makes the viva prompts reachable on Submit without requiring an execution result", () => {
    const viva = prepareVivaForSubmit(solution);

    expect(viva.questions).toHaveLength(3);
    expect(viva.message).toBe("");
  });

  it("evaluates explanations and quotes behavior from the submitted code", () => {
    const evaluations = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: "It checks cursor >= 1 and stops when cursor is below 1." },
      { questionId: "return-path", answer: "It returns the one-item array [1]." },
      { questionId: "accumulator-role", answer: "counted stores each number from initial down to 1." },
    ]);

    expect(evaluations.map((evaluation) => evaluation.score)).toEqual([1, 1, 1]);
    expect(evaluations.every((evaluation) => evaluation.evaluatedBy === "heuristic")).toBe(true);
    expect(evaluations[0].feedback).toContain("`cursor >= 1`");
    expect(evaluations[1].feedback).toContain("`return counted`");
    expect(evaluations[2].feedback).toContain("`counted`");
  });

  it("returns low scores and code-specific corrective feedback for unsupported explanations", () => {
    const evaluations = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: "It loops for a while." },
      { questionId: "return-path", answer: "It returns a string." },
      { questionId: "accumulator-role", answer: "The variable is useful." },
    ]);

    expect(evaluations.map((evaluation) => evaluation.score)).toEqual([0, 0, 0]);
    expect(evaluations[0].feedback).toContain("`cursor >= 1`");
    expect(evaluations[1].feedback).toContain("`return counted`");
    expect(evaluations[2].feedback).toContain("`counted`");
  });

  it("accepts paraphrased correct explanations but rejects partial, contradictory, and empty answers", () => {
    const paraphrased = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: "It keeps looping as long as the cursor is at least one, then stops when it reaches zero." },
      { questionId: "return-path", answer: "When initial equals one, the returned list contains exactly the number 1." },
      { questionId: "accumulator-role", answer: "The list accumulates every value from the initial number down through 1." },
    ]);
    const partial = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: "It checks the cursor before each iteration." },
      { questionId: "return-path", answer: "It returns 1." },
      { questionId: "accumulator-role", answer: "It holds the answer." },
    ]);
    const wrong = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: "It stops at one before including it." },
      { questionId: "return-path", answer: "It returns an array containing 2." },
      { questionId: "accumulator-role", answer: "It stores only the final answer, 1." },
    ]);
    const empty = evaluateVivaAnswers(solution, [
      { questionId: "loop-condition", answer: " \n " },
      { questionId: "return-path", answer: "\t " },
      { questionId: "accumulator-role", answer: "" },
    ]);

    expect(paraphrased.every((evaluation) => evaluation.score >= 0.6)).toBe(true);
    expect(partial.every((evaluation) => evaluation.score < 0.6)).toBe(true);
    expect(wrong.every((evaluation) => evaluation.score < 0.6)).toBe(true);
    expect(empty.every((evaluation) => evaluation.score < 0.6)).toBe(true);
  });

  it("parses Python loop, parameter, and return identifiers", () => {
    const python = `def count_down(first):
    values = []
    number = first
    while number >= 1:
        values.append(number)
        number -= 1
    return values`;
    const prompts = generateVivaQuestions(python).map((question) => question.prompt);

    expect(prompts[0]).toContain("`number >= 1`");
    expect(prompts[1]).toContain("`first` is 1");
    expect(prompts[2]).toContain("`values`");
  });

  it("feeds viva understanding into the loops BKT update", () => {
    const priorMastery = [{ conceptId: "loops", probability: 0.5 }];
    const highUnderstanding = updateVivaMastery(priorMastery, [
      { questionId: "loop-condition", score: 1, feedback: "understood", evaluatedBy: "heuristic" },
      { questionId: "return-path", score: 1, feedback: "understood", evaluatedBy: "heuristic" },
      { questionId: "accumulator-role", score: 0, feedback: "review", evaluatedBy: "heuristic" },
    ]);
    const lowUnderstanding = updateVivaMastery(priorMastery, [
      { questionId: "loop-condition", score: 0, feedback: "review", evaluatedBy: "heuristic" },
      { questionId: "return-path", score: 0, feedback: "review", evaluatedBy: "heuristic" },
      { questionId: "accumulator-role", score: 0, feedback: "review", evaluatedBy: "heuristic" },
    ]);

    expect(highUnderstanding.understandingScore).toBeCloseTo(2 / 3);
    expect(highUnderstanding.mastery.find((item) => item.conceptId === "loops")?.probability)
      .toBeGreaterThan(priorMastery[0].probability);
    expect(lowUnderstanding.mastery.find((item) => item.conceptId === "loops")?.probability)
      .toBeLessThan(priorMastery[0].probability);
  });

  it("does not apply another BKT update after this mission's viva was counted", () => {
    const previous = [{ conceptId: "loops", probability: 0.5 }];
    const duplicate = updateVivaMastery(previous, [
      { questionId: "loop-condition", score: 1, feedback: "understood", evaluatedBy: "heuristic" },
    ], new Date("2026-01-01T00:00:00Z"), true);

    expect(duplicate.masteryCounted).toBe(false);
    expect(duplicate.mastery).toEqual(previous);
  });
});
