import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFailure, apiSuccess } from "@/types/api";
import { generatedQuestionListSchema, questionStatusSchema, visualExplanationSchema, type TeacherQuizSet } from "@/features/teacher-portal/contracts";
import { listTeacherAssignments, saveAssignment } from "@/features/teacher-portal/server-store";

const assignmentSchema = z.object({
  id: z.string().min(1).optional(), title: z.string().min(1).max(200), subject: z.string().min(1).max(120), topic: z.string().min(1).max(120),
  instructions: z.string().max(2000).default(""), status: questionStatusSchema.default("draft"), visualExplanation: visualExplanationSchema.nullable().optional(), questions: generatedQuestionListSchema,
  availableFrom: z.string().datetime().optional(), dueAt: z.string().datetime().optional(),
}).strict();

async function teacherId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return "demo-teacher";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!Array.isArray(user.app_metadata?.roles) || !user.app_metadata.roles.includes("teacher")) throw new Error("FORBIDDEN");
  return user.id;
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
    const assignment: TeacherQuizSet = { ...parsed.data, id: parsed.data.id ?? randomUUID(), ownerId, createdAt: now, publishedAt: parsed.data.status === "published" ? now : undefined };
    await saveAssignment(assignment);
    return Response.json(apiSuccess(assignment));
  } catch (error) { return Response.json(apiFailure("ASSIGNMENT_SAVE_FAILED", error instanceof Error ? error.message : "Assignment could not be saved."), { status: 500 }); }
}
