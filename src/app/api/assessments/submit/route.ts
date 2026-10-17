import { scoreAssessment } from "@/features/assessments";
import { getLearnerMastery, getOrCreateLearnerId, saveLearnerMastery } from "@/features/assessments/mastery-store";
import { apiFailure, apiSuccess } from "@/types/api";
import type { AssessmentAnswer } from "@/types/domain";
import { persistenceErrorDetails } from "@/lib/persistence";

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

  let learnerId: string;
  let currentMastery;
  try {
    learnerId = await getOrCreateLearnerId();
    currentMastery = await getLearnerMastery(learnerId) ?? [];
  } catch (error) {
    console.error("Learner mastery could not be loaded.", error);
    const failure = persistenceErrorDetails(error, "MASTERY_PERSISTENCE_FAILED", "Your assessment could not load saved mastery.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }

  let result;
  try {
    result = scoreAssessment(answers as AssessmentAnswer[], currentMastery);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Answers could not be scored.";
    return Response.json(apiFailure("INVALID_ANSWERS", message), { status: 400 });
  }

  try {
    await saveLearnerMastery(learnerId, result.mastery);
    return Response.json(apiSuccess({ ...result, persistence: "saved" as const }));
  } catch (error) {
    console.error("Assessment mastery could not be persisted.", error);
    const failure = persistenceErrorDetails(error, "MASTERY_PERSISTENCE_FAILED", "Your assessment was scored, but mastery could not be saved.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }
}
