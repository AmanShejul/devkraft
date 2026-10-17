import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@/types/api";
import { LEARNING_MISSIONS } from "@/data/learning";
import { LEARNING_CONFIG } from "@/config/learning";
import { selectNextMission, updateConceptMastery } from "@/features/adaptive-learning";
import { getLearnerMastery, saveLearnerMastery } from "@/features/assessments/mastery-store";
import { getAssignmentForAttempt, saveAttempt, type AttemptRecord } from "@/features/teacher-portal/server-store";
import { scoreQuestions } from "@/features/teacher-portal/scoring";
import { getStudentSession } from "@/lib/auth/student-session";
import { persistenceErrorDetails } from "@/lib/persistence";

const bodySchema = z.object({ idempotencyKey: z.string().min(8).max(120).optional(), answers: z.record(z.string(), z.string()) }).strict();

export async function POST(request: Request, context: { params: Promise<{ assignmentId: string }> }): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json(apiFailure("INVALID_SUBMISSION", "Submit an answer for every question."), { status: 400 });
  const session = await getStudentSession();
  if (!session) return Response.json(apiFailure("STUDENT_AUTH_REQUIRED", "Sign in as a student before submitting work."), { status: 401 });
  const id = session.id;
  const { assignmentId } = await context.params;
  let assignment;
  try { assignment = await getAssignmentForAttempt(assignmentId, id, session.mode === "demo"); } catch (error) {
    const failure = persistenceErrorDetails(error, "ASSIGNMENT_READ_FAILED", error instanceof Error ? error.message : "Assignment could not be loaded.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }
  if (!assignment) return Response.json(apiFailure("ASSIGNMENT_UNAVAILABLE", "This assignment is not currently available."), { status: 404 });
  const answers = parsed.data.answers;
  if (assignment.questions.some((question) => !(question.id in answers))) return Response.json(apiFailure("INCOMPLETE_SUBMISSION", "Answer every question before submitting."), { status: 400 });
  const responses = scoreQuestions(assignment.questions, answers);
  const attempt: AttemptRecord = { id: parsed.data.idempotencyKey ?? randomUUID(), assignmentId, learnerId: id, submittedAt: new Date().toISOString(), score: responses.filter((response) => response.correct).length, total: responses.length, learningStage: assignment.learningStage, responses };
  try {
    const saved = await saveAttempt(attempt, session.mode === "demo");
    const feedbackFor = (savedResponses: AttemptRecord["responses"]) => savedResponses.map((response) => ({ ...response, explanation: assignment.questions.find((question) => question.id === response.questionId)?.explanation ?? "Review the question source with your teacher." }));
    if (!saved.saved) return Response.json(apiSuccess({ duplicate: true, learningStage: saved.attempt.learningStage ?? assignment.learningStage, score: saved.attempt.score, total: saved.attempt.total, responses: saved.attempt.responses, feedback: feedbackFor(saved.attempt.responses) }));
    const current = await getLearnerMastery(id) ?? [];
    const byConcept = new Map(current.map((item) => [item.conceptId, item]));
    for (const response of responses) {
      if (!response.conceptId) continue;
      const previous = byConcept.get(response.conceptId) ?? { conceptId: response.conceptId, probability: LEARNING_CONFIG.bkt.initialMastery };
      byConcept.set(response.conceptId, updateConceptMastery(previous, response.correct, LEARNING_CONFIG.bkt));
    }
    const mastery = [...byConcept.values()];
    await saveLearnerMastery(id, mastery);
    const masteryByConcept = Object.fromEntries(mastery.map((item) => [item.conceptId, item.probability]));
    const next = selectNextMission(LEARNING_MISSIONS, masteryByConcept, LEARNING_CONFIG.masteryThreshold);
    return Response.json(apiSuccess({ duplicate: false, learningStage: attempt.learningStage, score: attempt.score, total: attempt.total, responses, feedback: feedbackFor(responses), mastery, recommendation: next ? { mission: next.mission, reason: `Your latest ${assignment.topic} answers updated ${next.mission.conceptId} mastery; this mission is the least-mastered eligible prerequisite path.` } : null }));
  } catch (error) {
    const failure = persistenceErrorDetails(error, "SUBMISSION_SAVE_FAILED", error instanceof Error ? error.message : "Your attempt could not be saved.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }
}
