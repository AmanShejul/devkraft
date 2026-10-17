import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTeacherSession: vi.fn(),
  listTeacherAssignments: vi.fn(),
  listTeacherLearningRecords: vi.fn(),
}));

vi.mock("@/lib/auth/teacher-session", () => ({ getTeacherSession: mocks.getTeacherSession }));
vi.mock("@/features/teacher-portal/server-store", () => ({
  listTeacherAssignments: mocks.listTeacherAssignments,
  listTeacherLearningRecords: mocks.listTeacherLearningRecords,
}));

import { GET } from "@/app/api/teacher/analytics/route";

afterEach(() => vi.clearAllMocks());

describe("teacher analytics", () => {
  it("includes question answer details with submitted student responses", async () => {
    mocks.getTeacherSession.mockResolvedValue({ id: "teacher-1" });
    mocks.listTeacherAssignments.mockResolvedValue([{
      id: "assignment-1",
      topicId: "topic-1",
      ownerId: "teacher-1",
      title: "Database basics",
      subject: "Computer science",
      topic: "Relational model",
      instructions: "",
      status: "published",
      learningStage: "diagnostic",
      createdAt: "2025-01-01T00:00:00.000Z",
      questions: [{
        id: "question-1",
        prompt: "What organizes records in the relational model?",
        correctAnswer: "Tables",
        explanation: "The source material describes tables as the record structure.",
        source: { excerpt: "A relational database organizes records into tables." },
      }],
    }]);
    mocks.listTeacherLearningRecords.mockResolvedValue([{
      student: { id: "student-1", email: "student@example.com", createdAt: "", lastActivityAt: "" },
      attempts: [{
        id: "attempt-1",
        assignmentId: "assignment-1",
        learnerId: "student-1",
        submittedAt: "2025-01-02T00:00:00.000Z",
        score: 0,
        total: 1,
        learningStage: "diagnostic",
        responses: [{
          questionId: "question-1",
          response: "Rows",
          correct: false,
          topic: "Relational model",
          difficulty: "foundation",
          conceptId: "tables",
        }],
      }],
      events: [],
    }]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.students[0].attempts[0].responses[0]).toMatchObject({
      prompt: "What organizes records in the relational model?",
      response: "Rows",
      correct: false,
      correctAnswer: "Tables",
      explanation: "The source material describes tables as the record structure.",
      sourceExcerpt: "A relational database organizes records into tables.",
    });
  });
});
