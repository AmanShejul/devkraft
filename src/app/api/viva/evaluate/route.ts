import {
  claimVivaAttemptOnce,
  getOrCreateLearnerId,
  getLearnerMastery,
  releaseVivaAttemptClaim,
  saveLearnerMastery,
} from "@/features/assessments/mastery-store";
import { evaluateVivaAnswers, updateVivaMastery } from "@/features/viva/viva";
import { apiFailure, apiSuccess } from "@/types/api";
import type { ConceptMastery, VivaEvaluation } from "@/types/domain";
import { generateVivaQuestions } from "@/features/viva/viva";
import { readBoundedJson } from "@/features/code-execution/handler";
import { validateCodeExecutionRequest } from "@/features/code-execution/validation";

interface VivaEvaluateRequest {
  language: "typescript" | "javascript" | "python";
  sourceCode: string;
  answers: { questionId: string; answer: string }[];
}

function parseVivaRequest(value: unknown): VivaEvaluateRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const source = validateCodeExecutionRequest({
    language: candidate.language,
    sourceCode: candidate.sourceCode,
  });
  if (!source.ok || !Array.isArray(candidate.answers) || candidate.answers.length !== 3) return null;
  if (!candidate.answers.every((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
    const item = answer as Record<string, unknown>;
    return typeof item.questionId === "string"
      && typeof item.answer === "string"
      && item.answer.trim().length > 0
      && item.answer.length <= 2_000;
  })) return null;
  const questions = generateVivaQuestions(source.data.sourceCode);
  if (questions.length !== 3) return null;
  const expectedQuestionIds = new Set(questions.map((question) => question.id));
  const receivedQuestionIds = candidate.answers.map((answer) => (answer as Record<string, unknown>).questionId);
  if (
    new Set(receivedQuestionIds).size !== questions.length
    || receivedQuestionIds.some((questionId) => typeof questionId !== "string" || !expectedQuestionIds.has(questionId))
  ) return null;

  return {
    language: source.data.language,
    sourceCode: source.data.sourceCode,
    answers: candidate.answers as VivaEvaluateRequest["answers"],
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return Response.json(parsed.error, { status: parsed.status });

  const input = parseVivaRequest(parsed.data);
  if (!input) {
    return Response.json(apiFailure("INVALID_VIVA_REQUEST", "Provide valid source code and one non-empty answer for each viva question (up to 2,000 characters each)."), { status: 400 });
  }

  let evaluations: VivaEvaluation[];
  try {
    evaluations = evaluateVivaAnswers(input.sourceCode, input.answers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The viva answers could not be evaluated.";
    return Response.json(apiFailure("INVALID_VIVA_SOURCE", message), { status: 400 });
  }

  let learnerId: string;
  let currentMastery: ConceptMastery[];
  try {
    learnerId = await getOrCreateLearnerId();
    currentMastery = await getLearnerMastery(learnerId) ?? [];
  } catch (error) {
    console.error("Could not load mastery for viva evaluation.", error);
    return Response.json(apiFailure("MASTERY_PERSISTENCE_FAILED", "Viva answers were evaluated, but saved mastery could not be loaded."), { status: 500 });
  }

  let claimed: boolean;
  try {
    claimed = await claimVivaAttemptOnce(learnerId, "countdown");
  } catch (error) {
    console.error("Could not record viva attempt.", error);
    return Response.json(apiFailure("MASTERY_PERSISTENCE_FAILED", "Viva answers were evaluated, but the counted attempt could not be recorded."), { status: 500 });
  }

  const update = updateVivaMastery(currentMastery, evaluations, new Date(), !claimed);
  if (!claimed) {
    return Response.json(apiSuccess({
      ...update,
      message: "This learner's viva attempt for the countdown mission was already counted; mastery was not updated again.",
      evaluations,
    }));
  }

  try {
    await saveLearnerMastery(learnerId, update.mastery);
  } catch (error) {
    console.error("Could not save mastery for viva evaluation.", error);
    try {
      await releaseVivaAttemptClaim(learnerId, "countdown");
    } catch (releaseError) {
      console.error("Could not release the failed viva attempt claim.", releaseError);
    }
    return Response.json(apiFailure("MASTERY_PERSISTENCE_FAILED", "Viva answers were evaluated, but mastery could not be saved."), { status: 500 });
  }

  return Response.json(apiSuccess({ evaluations, ...update }));
}
