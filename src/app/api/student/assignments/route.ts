import { apiFailure, apiSuccess } from "@/types/api";
import { listPublishedAssignments } from "@/features/teacher-portal/server-store";
import { getStudentSession } from "@/lib/auth/student-session";
import { persistenceErrorDetails } from "@/lib/persistence";

export async function GET(): Promise<Response> {
  try {
    const session = await getStudentSession();
    if (!session) return Response.json(apiFailure("STUDENT_AUTH_REQUIRED", "Sign in as a student to view published topics."), { status: 401 });
    const assignments = await listPublishedAssignments(session.mode === "demo");
    return Response.json(apiSuccess(assignments.map((assignment) => ({
      id: assignment.id, topicId: assignment.topicId, learningStage: assignment.learningStage, title: assignment.title, subject: assignment.subject, topic: assignment.topic,
      availableFrom: assignment.availableFrom, dueAt: assignment.dueAt, visualExplanation: assignment.visualExplanation ?? null,
      questions: assignment.questions.map((question) => ({ id: question.id, type: question.type, prompt: question.prompt, options: question.options, topic: question.topic, difficulty: question.difficulty, conceptId: question.conceptId })),
    }))));
  } catch (error) {
    const failure = persistenceErrorDetails(error, "ASSIGNMENT_READ_FAILED", error instanceof Error ? error.message : "Assignments could not be loaded.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }
}
