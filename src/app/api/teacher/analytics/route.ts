import { listTeacherAssignments, listTeacherLearningRecords } from "@/features/teacher-portal/server-store";
import { LEARNING_CONFIG } from "@/config/learning";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { apiFailure, apiSuccess } from "@/types/api";

async function authenticatedTeacherId(): Promise<string> {
  const session = await getTeacherSession();
  if (!session) throw new Error("Sign in as a teacher to view student records.");
  return session.id;
}

export async function GET(): Promise<Response> {
  let ownerId: string;
  try { ownerId = await authenticatedTeacherId(); } catch (error) {
    return Response.json(apiFailure("TEACHER_AUTH_REQUIRED", error instanceof Error ? error.message : "Teacher access is required."), { status: 401 });
  }

  try {
    const [records, assignments] = await Promise.all([listTeacherLearningRecords(ownerId), listTeacherAssignments(ownerId)]);
    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const students = records.map(({ student, attempts, events }) => {
      const conceptCounts = new Map<string, number>();
      for (const attempt of attempts) for (const response of attempt.responses) {
        if (!response.correct) {
          const concept = response.conceptId || response.topic;
          conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
        }
      }
      const weakConcepts = [...conceptCounts.entries()].map(([conceptId, incorrectResponses]) => ({ conceptId, incorrectResponses })).sort((left, right) => right.incorrectResponses - left.incorrectResponses);
      const diagnostic = attempts.filter((attempt) => attempt.learningStage !== "practice");
      const practice = attempts.filter((attempt) => attempt.learningStage === "practice");
      const diagnosticAverage = diagnostic.length ? Math.round(diagnostic.reduce((total, attempt) => total + attempt.score / attempt.total, 0) / diagnostic.length * 100) : null;
      const practiceAverage = practice.length ? Math.round(practice.reduce((total, attempt) => total + attempt.score / attempt.total, 0) / practice.length * 100) : null;
      const completedTopicIds = new Set(practice.filter((attempt) => attempt.total > 0 && attempt.score / attempt.total >= LEARNING_CONFIG.masteryThreshold).map((attempt) => assignmentById.get(attempt.assignmentId)?.topicId).filter((id): id is string => Boolean(id)));
      const lastActivityAt = student.lastActivityAt;
      return {
        student: { ...student, lastActivityAt },
        attemptCount: attempts.length,
        diagnosticAverage,
        practiceAverage,
        completedTopics: completedTopicIds.size,
        weakConcepts,
        needsHelp: (diagnosticAverage !== null && diagnosticAverage < 60) || weakConcepts.some((concept) => concept.incorrectResponses >= 2),
        events: events.slice(0, 12).map((event) => ({ id: event.id, type: event.type, topicId: event.topicId, assignmentId: event.assignmentId, conceptId: event.conceptId ?? null, occurredAt: event.occurredAt })),
        attempts: attempts.map((attempt) => ({
          id: attempt.id,
          title: assignmentById.get(attempt.assignmentId)?.title ?? "Published topic",
          subject: assignmentById.get(attempt.assignmentId)?.subject ?? "",
          topic: assignmentById.get(attempt.assignmentId)?.topic ?? "",
          learningStage: attempt.learningStage ?? "diagnostic",
          submittedAt: attempt.submittedAt,
          score: attempt.score,
          total: attempt.total,
          responses: attempt.responses.map((response) => ({
            ...response,
            prompt: assignmentById.get(attempt.assignmentId)?.questions.find((question) => question.id === response.questionId)?.prompt ?? "Question unavailable",
          })),
        })),
      };
    });
    const diagnosticAttempts = records.flatMap((record) => record.attempts.filter((attempt) => attempt.learningStage !== "practice"));
    const practiceAttempts = records.flatMap((record) => record.attempts.filter((attempt) => attempt.learningStage === "practice"));
    const average = (items: typeof diagnosticAttempts) => items.length ? Math.round(items.reduce((total, item) => total + item.score / item.total, 0) / items.length * 100) : null;
    return Response.json(apiSuccess({
      students,
      summary: {
        studentCount: students.length,
        activeStudents: students.filter((student) => student.attemptCount > 0).length,
        needsHelpCount: students.filter((student) => student.needsHelp).length,
        publishedTopics: new Set(assignments.filter((assignment) => assignment.status === "published").map((assignment) => assignment.topicId)).size,
        diagnosticAverage: average(diagnosticAttempts),
        practiceAverage: average(practiceAttempts),
      },
    }));
  } catch (error) {
    return Response.json(apiFailure("TEACHER_ANALYTICS_FAILED", error instanceof Error ? error.message : "Student analytics could not be loaded."), { status: 500 });
  }
}