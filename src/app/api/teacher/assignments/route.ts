import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@/types/api";
import { generatedQuestionListSchema, learningStageSchema, questionStatusSchema, visualExplanationSchema, type TeacherQuizSet } from "@/features/teacher-portal/contracts";
import { listTeacherAssignments, saveAssignment } from "@/features/teacher-portal/server-store";
import { getTeacherSession } from "@/lib/auth/teacher-session";

const assignmentSchema = z.object({
  id: z.string().min(1).optional(), topicId: z.string().uuid().optional(), title: z.string().min(1).max(200), subject: z.string().min(1).max(120), topic: z.string().min(1).max(120),
  instructions: z.string().max(2000).default(""), status: questionStatusSchema.default("draft"), learningStage: learningStageSchema.default("diagnostic"), visualExplanation: visualExplanationSchema.nullable().optional(), questions: generatedQuestionListSchema,
  availableFrom: z.string().datetime().optional(), dueAt: z.string().datetime().optional(),
}).strict().superRefine((assignment, context) => {
  if (assignment.status !== "published") return;
  const countValid = assignment.learningStage === "diagnostic"
    ? assignment.questions.length >= 4 && assignment.questions.length <= 5
    : assignment.questions.length >= 6 && assignment.questions.length <= 7;
  if (!countValid) context.addIssue({ code: z.ZodIssueCode.custom, path: ["questions"], message: assignment.learningStage === "diagnostic" ? "Published diagnostics require 4 to 5 questions." : "Published follow-up sets require 6 to 7 questions." });
});

async function teacherId(): Promise<string> {
  const session = await getTeacherSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.id;
}

export async function GET(): Promise<Response> {
  try { return Response.json(apiSuccess(await listTeacherAssignments(await teacherId()))); }
  catch (error) { return Response.json(apiFailure("TEACHER_AUTH_REQUIRED", error instanceof Error ? error.message : "Teacher access is required."), { status: 401 }); }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 }); }
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return Response.json(apiFailure("INVALID_ASSIGNMENT", "Assignment and every question must pass validation."), { status: 400 });
  if (parsed.data.status === "published" && parsed.data.questions.some((question) => question.reviewStatus !== "reviewed" && question.reviewStatus !== "published" || question.generationStatus !== "grounded")) {
    return Response.json(apiFailure("REVIEW_REQUIRED", "Check every question before publishing. Questions needing review cannot be published."), { status: 409 });
  }
  try {
    const ownerId = await teacherId();
    const now = new Date().toISOString();
    const existingAssignments = await listTeacherAssignments(ownerId);
    const existing = parsed.data.id ? existingAssignments.find((item) => item.id === parsed.data.id) : undefined;
    const sameTopic = existingAssignments.find((item) => item.subject.trim().toLowerCase() === parsed.data.subject.trim().toLowerCase()
      && item.topic.trim().toLowerCase() === parsed.data.topic.trim().toLowerCase()
      && item.status !== "archived");
    const assignment: TeacherQuizSet = {
      ...parsed.data,
      id: parsed.data.id ?? randomUUID(),
      topicId: parsed.data.topicId ?? existing?.topicId ?? sameTopic?.topicId ?? randomUUID(),
      ownerId,
      createdAt: existing?.createdAt ?? now,
      publishedAt: parsed.data.status === "published" ? existing?.publishedAt ?? now : undefined,
    };
    await saveAssignment(assignment);
    return Response.json(apiSuccess(assignment));
  } catch (error) { return Response.json(apiFailure("ASSIGNMENT_SAVE_FAILED", error instanceof Error ? error.message : "Assignment could not be saved."), { status: 500 }); }
}
