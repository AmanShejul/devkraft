import { z } from "zod";
import { listPublishedAssignments } from "@/features/teacher-portal/server-store";
import { saveDemoStudentEvent } from "@/features/student-portal/events";
import { getStudentSession } from "@/lib/auth/student-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiFailure, apiSuccess } from "@/types/api";
import { persistenceErrorDetails } from "@/lib/persistence";

const eventSchema = z.object({
  assignmentId: z.string().min(1),
  topicId: z.string().uuid(),
  type: z.enum(["topic_opened", "diagnostic_completed", "explanation_viewed", "concept_revisited", "practice_completed", "topic_completed"]),
  conceptId: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();

export async function POST(request: Request): Promise<Response> {
  const session = await getStudentSession();
  if (!session) return Response.json(apiFailure("STUDENT_AUTH_REQUIRED", "Sign in as a student before recording learning activity."), { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return Response.json(apiFailure("INVALID_EVENT", "The learning activity was not valid."), { status: 400 });

  try {
    const assignments = await listPublishedAssignments(session.mode === "demo");
    const assignment = assignments.find((item) => item.id === parsed.data.assignmentId && item.topicId === parsed.data.topicId);
    if (!assignment) return Response.json(apiFailure("TOPIC_UNAVAILABLE", "This published topic is no longer available."), { status: 404 });

    const event = { learnerId: session.id, assignmentId: assignment.id, topicId: assignment.topicId, type: parsed.data.type, conceptId: parsed.data.conceptId, metadata: parsed.data.metadata };
    if (session.mode === "demo") {
      const stored = await saveDemoStudentEvent(event);
      return Response.json(apiSuccess({ id: stored.id, occurredAt: stored.occurredAt }));
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) return Response.json(apiFailure("STORAGE_UNAVAILABLE", "Learning activity storage is unavailable."), { status: 503 });
    const { data, error } = await supabase.from("student_learning_events").insert({
      id: crypto.randomUUID(), learner_id: session.id, quiz_set_id: assignment.id, topic_id: assignment.topicId,
      event_type: parsed.data.type, concept_id: parsed.data.conceptId ?? null, metadata: parsed.data.metadata ?? {},
    }).select("id, occurred_at").single();
    if (error) throw new Error(`Could not save learning event: ${error.message}`);
    return Response.json(apiSuccess({ id: data.id, occurredAt: data.occurred_at }));
  } catch (error) {
    const failure = persistenceErrorDetails(error, "LEARNING_EVENT_SAVE_FAILED", error instanceof Error ? error.message : "Learning activity could not be saved.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }
}
