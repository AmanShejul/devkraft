import { scoreAssessment } from "@/features/assessments";
import { apiFailure, apiSuccess } from "@/types/api";
import type { AssessmentAnswer } from "@/types/domain";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { answers?: unknown }).answers)) {
    return Response.json(apiFailure("INVALID_ANSWERS", "Provide an answers array."), { status: 400 });
  }

  const answers = (body as { answers: unknown[] }).answers;
  if (answers.some((answer) => !answer || typeof answer !== "object"
      || typeof (answer as Record<string, unknown>).questionId !== "string"
      || typeof (answer as Record<string, unknown>).choiceId !== "string")) {
    return Response.json(apiFailure("INVALID_ANSWERS", "Each answer needs a questionId and choiceId."), { status: 400 });
  }

  try {
    const result = scoreAssessment(answers as AssessmentAnswer[]);
    return Response.json(apiSuccess(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Answers could not be scored.";
    return Response.json(apiFailure("INVALID_ANSWERS", message), { status: 400 });
  }
}
