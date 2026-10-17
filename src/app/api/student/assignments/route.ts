import { apiFailure, apiSuccess } from "@/types/api";
import { listPublishedAssignments } from "@/features/teacher-portal/server-store";

export async function GET(): Promise<Response> {
  try {
    const assignments = await listPublishedAssignments();
    return Response.json(apiSuccess(assignments.map((assignment) => ({
      id: assignment.id, title: assignment.title, subject: assignment.subject, topic: assignment.topic,
      instructions: assignment.instructions, availableFrom: assignment.availableFrom, dueAt: assignment.dueAt, visualExplanation: assignment.visualExplanation ?? null,
      questions: assignment.questions.map((question) => ({ id: question.id, type: question.type, prompt: question.prompt, options: question.options, topic: question.topic, difficulty: question.difficulty })),
    }))));
  } catch (error) { return Response.json(apiFailure("ASSIGNMENT_READ_FAILED", error instanceof Error ? error.message : "Assignments could not be loaded."), { status: 500 }); }
}
