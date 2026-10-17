import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLearnerMastery } from "@/features/assessments/mastery-store";
import { listLearnerAttempts, listPublishedAssignments } from "@/features/teacher-portal/server-store";
import { listDemoStudentEvents } from "@/features/student-portal/events";
import { getStudentSession } from "@/lib/auth/student-session";
import { LEARNING_CONFIG } from "@/config/learning";
import { apiFailure, apiSuccess } from "@/types/api";

export async function GET(): Promise<Response> {
  const session = await getStudentSession();
  if (!session) return Response.json(apiFailure("STUDENT_AUTH_REQUIRED", "Sign in as a student to view your progress."), { status: 401 });

  try {
    const assignments = await listPublishedAssignments(session.mode === "demo");
    const attempts = await listLearnerAttempts(session.id, session.mode === "demo");
    const mastery = await getLearnerMastery(session.id) ?? [];
    let events = [] as Awaited<ReturnType<typeof listDemoStudentEvents>>;
    let lastActivityAt = session.lastActivityAt ?? null;

    if (session.mode === "demo") {
      events = await listDemoStudentEvents(session.id);
      lastActivityAt = events[0]?.occurredAt ?? attempts[0]?.submittedAt ?? session.lastActivityAt ?? null;
    } else {
      const supabase = await createSupabaseServerClient();
      if (!supabase) throw new Error("Authenticated storage is unavailable.");
      const profile = { id: session.id, email: session.email, last_activity_at: new Date().toISOString() };
      const { error: profileError } = await supabase.from("student_profiles").upsert(profile, { onConflict: "id" });
      if (profileError) throw new Error(`Could not save student profile: ${profileError.message}`);
      const { data, error } = await supabase.from("student_learning_events").select("id,learner_id,quiz_set_id,topic_id,event_type,concept_id,occurred_at,metadata").eq("learner_id", session.id).order("occurred_at", { ascending: false }).limit(100);
      if (error) throw new Error(`Could not read learning activity: ${error.message}`);
      events = (data ?? []).map((event) => ({ id: String(event.id), learnerId: String(event.learner_id), assignmentId: String(event.quiz_set_id), topicId: String(event.topic_id), type: event.event_type as typeof events[number]["type"], conceptId: typeof event.concept_id === "string" ? event.concept_id : undefined, occurredAt: String(event.occurred_at), metadata: event.metadata as Record<string, string | number | boolean> }));
      lastActivityAt = events[0]?.occurredAt ?? attempts[0]?.submittedAt ?? null;
    }

    const topics = [...new Map(assignments.map((assignment) => [assignment.topicId, assignment])).values()].map((topicAssignment) => {
      const topicAssignments = assignments.filter((assignment) => assignment.topicId === topicAssignment.topicId);
      const assignmentIds = new Set(topicAssignments.map((assignment) => assignment.id));
      const topicAttempts = attempts.filter((attempt) => assignmentIds.has(attempt.assignmentId));
      const diagnosticAttempts = topicAttempts.filter((attempt) => attempt.learningStage === "diagnostic");
      const practiceAttempts = topicAttempts.filter((attempt) => attempt.learningStage === "practice");
      const score = (attempt: typeof topicAttempts[number]) => attempt.total > 0 ? attempt.score / attempt.total : 0;
      const completed = practiceAttempts.some((attempt) => score(attempt) >= LEARNING_CONFIG.masteryThreshold);
      const weakConceptCounts = new Map<string, number>();
      for (const attempt of topicAttempts) for (const response of attempt.responses) {
        if (!response.correct) {
          const concept = response.conceptId || response.topic || topicAssignment.topic;
          weakConceptCounts.set(concept, (weakConceptCounts.get(concept) ?? 0) + 1);
        }
      }
      const weakConcepts = [...weakConceptCounts.entries()].sort((left, right) => right[1] - left[1]).map(([conceptId, incorrectResponses]) => ({ conceptId, incorrectResponses }));
      return {
        topicId: topicAssignment.topicId,
        subject: topicAssignment.subject,
        topic: topicAssignment.topic,
        title: topicAssignment.title,
        diagnosticAssignmentId: topicAssignments.find((assignment) => assignment.learningStage === "diagnostic")?.id ?? null,
        practiceAssignmentIds: topicAssignments.filter((assignment) => assignment.learningStage === "practice").map((assignment) => assignment.id),
        diagnosticAttempts: diagnosticAttempts.length,
        practiceAttempts: practiceAttempts.length,
        latestScore: topicAttempts[0] ? { score: topicAttempts[0].score, total: topicAttempts[0].total, stage: topicAttempts[0].learningStage ?? "diagnostic" } : null,
        started: events.some((event) => event.topicId === topicAssignment.topicId && event.type === "topic_opened") || topicAttempts.length > 0,
        completed,
        weakConcepts,
        lastActivityAt: topicAttempts[0]?.submittedAt ?? events.find((event) => event.topicId === topicAssignment.topicId)?.occurredAt ?? null,
      };
    });
    const diagnosticAttempts = attempts.filter((attempt) => attempt.learningStage === "diagnostic");
    const practiceAttempts = attempts.filter((attempt) => attempt.learningStage === "practice");
    const average = (items: typeof attempts) => items.length === 0 ? null : Math.round(items.reduce((sum, item) => sum + (item.total ? item.score / item.total : 0), 0) / items.length * 100);
    const activity = [
      ...attempts.map((attempt) => ({ id: attempt.id, type: "assessment" as const, assignmentId: attempt.assignmentId, learningStage: attempt.learningStage ?? "diagnostic", score: attempt.score, total: attempt.total, occurredAt: attempt.submittedAt })),
      ...events.map((event) => ({ id: event.id, type: event.type, assignmentId: event.assignmentId, topicId: event.topicId, conceptId: event.conceptId ?? null, occurredAt: event.occurredAt })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 12);
    const nextTopic = topics.find((topic) => !topic.completed);

    return Response.json(apiSuccess({
      profile: { id: session.id, email: session.email, mode: session.mode, lastActivityAt },
      summary: {
        availableTopics: topics.length,
        startedTopics: topics.filter((topic) => topic.started).length,
        completedTopics: topics.filter((topic) => topic.completed).length,
        completionPercent: topics.length ? Math.round(topics.filter((topic) => topic.completed).length / topics.length * 100) : 0,
        diagnosticAverage: average(diagnosticAttempts),
        practiceAverage: average(practiceAttempts),
      },
      topics,
      mastery,
      weakConcepts: topics.flatMap((topic) => topic.weakConcepts.map((concept) => ({ ...concept, topicId: topic.topicId, topic: topic.topic, subject: topic.subject }))).sort((left, right) => right.incorrectResponses - left.incorrectResponses),
      recentActivity: activity,
      recommendedNext: nextTopic ? { topicId: nextTopic.topicId, topic: nextTopic.topic, subject: nextTopic.subject, stage: nextTopic.diagnosticAttempts === 0 ? "diagnostic" : "practice" } : null,
    }));
  } catch (error) {
    return Response.json(apiFailure("STUDENT_PROGRESS_READ_FAILED", error instanceof Error ? error.message : "Student progress could not be loaded."), { status: 500 });
  }
}