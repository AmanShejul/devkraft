import { describe, expect, it } from "vitest";
import {
  generateDraftQuestions,
  getRecommendedDifficulty,
  normalizeResponse,
  selectQuestionsForDifficulty,
  type TeacherAssignment,
} from "@/features/teacher-portal/demo-data";

describe("teacher question drafts", () => {
  it("creates editable cloze questions grounded in source sentences", () => {
    const drafts = generateDraftQuestions(
      "A relational database organizes information into related tables. Primary keys uniquely identify each record.",
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      prompt: "Complete the statement: A relational database organizes information into related ________.",
      answer: "tables",
      source: "A relational database organizes information into related tables.",
      difficulty: "foundation",
    });
  });

  it("ignores fragments that are too short to form useful drafts", () => {
    expect(generateDraftQuestions("Keys are good." )).toEqual([]);
  });

  it("normalizes case and punctuation when scoring a response", () => {
    expect(normalizeResponse("  Primary-KEY! ")).toBe("primary key");
  });

  it("recommends the next level from the learner's latest result on the same topic", () => {
    const assignment = {
      id: "db-basics",
      subject: "DBMS",
      topic: "keys",
    } as TeacherAssignment;
    const assignments = [assignment];
    const submissions = [{
      id: "attempt-1",
      assignmentId: "db-basics",
      learner: "student-7",
      results: [{ questionId: "q1", correct: true, response: "" }, { questionId: "q2", correct: true, response: "" }],
      submittedAt: "2026-10-17T10:00:00.000Z",
    }];

    expect(getRecommendedDifficulty("DBMS", "keys", assignments, submissions, "STUDENT-7")).toBe("advanced");
    expect(getRecommendedDifficulty("DBMS", "normalization", assignments, submissions, "student-7")).toBe("foundation");
  });

  it("falls back to the closest difficulty available in a teacher's question set", () => {
    const questions = [
      { id: "q1", prompt: "One", answer: "one", source: "One", difficulty: "foundation" as const },
      { id: "q2", prompt: "Two", answer: "two", source: "Two", difficulty: "foundation" as const },
    ];

    expect(selectQuestionsForDifficulty(questions, "advanced")).toEqual(questions);
  });
});