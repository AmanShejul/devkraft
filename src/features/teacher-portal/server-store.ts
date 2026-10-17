import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { assertLocalPersistenceAllowed } from "@/lib/persistence";
import { visualExplanationSchema, type GeneratedQuestion, type TeacherDocument, type TeacherQuizSet } from "./contracts";
import { listDemoStudentProfiles } from "@/features/student-portal/demo-profile-store";
import { listDemoStudentEvents, type StudentLearningEvent } from "@/features/student-portal/events";

interface AttemptRecord {
  id: string;
  assignmentId: string;
  learnerId: string;
  submittedAt: string;
  score: number;
  total: number;
  learningStage?: "diagnostic" | "practice";
  responses: Array<{ questionId: string; response: string; correct: boolean; topic: string; difficulty: string; conceptId: string | null }>;
}

interface DemoState {
  documents: TeacherDocument[];
  assignments: TeacherQuizSet[];
  attempts: AttemptRecord[];
}

const EMPTY_STATE: DemoState = { documents: [], assignments: [], attempts: [] };
const statePath = path.join(process.cwd(), ".data", "teacher-portal", "state.json");

async function readDemoState(): Promise<DemoState> {
  assertLocalPersistenceAllowed("Teacher and student records");
  try {
    const parsed: unknown = JSON.parse(await readFile(statePath, "utf8"));
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_STATE };
    const state = parsed as Partial<DemoState>;
    return {
      documents: Array.isArray(state.documents) ? state.documents : [],
      assignments: Array.isArray(state.assignments) ? state.assignments.map((assignment) => ({
        ...assignment,
        topicId: assignment.topicId ?? assignment.id,
        learningStage: assignment.learningStage ?? "diagnostic",
      })) : [],
      attempts: Array.isArray(state.attempts) ? state.attempts : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return { ...EMPTY_STATE };
    throw error;
  }
}

async function writeDemoState(state: DemoState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, statePath);
}

async function supabaseFor(ownerId?: string) {
  return createSupabaseServerClient(ownerId);
}

export async function saveDocument(document: TeacherDocument): Promise<void> {
  const supabase = await supabaseFor(document.ownerId);
  if (!supabase) {
    const state = await readDemoState();
    state.documents = [document, ...state.documents.filter((item) => item.id !== document.id)];
    await writeDemoState(state);
    return;
  }
  const { error } = await supabase.from("teacher_documents").upsert({
    id: document.id,
    owner_id: document.ownerId,
    name: document.name,
    mime_type: document.mimeType,
    status: document.status,
    failure_reason: document.failureReason ?? null,
    created_at: document.createdAt,
  });
  if (error) throw new Error(`Could not save document: ${error.message}`);
  const { error: chunkError } = await supabase.from("teacher_document_chunks").upsert(document.chunks.map((chunk) => ({
    id: chunk.chunkId,
    document_id: document.id,
    owner_id: document.ownerId,
    content: chunk.content,
    page_number: chunk.page,
    topic: chunk.topic,
    concepts: chunk.concepts,
    created_at: document.createdAt,
  })));
  if (chunkError) throw new Error(`Could not save document chunks: ${chunkError.message}`);
}

function rowToQuestion(row: Record<string, unknown>): GeneratedQuestion {
  return {
    id: String(row.id),
    type: row.question_type === "short-answer" ? "short-answer" : "mcq",
    prompt: String(row.prompt),
    options: Array.isArray(row.options) ? row.options.map(String) : undefined,
    correctAnswer: String(row.correct_answer ?? ""),
    explanation: String(row.explanation),
    subject: String(row.subject),
    topic: String(row.topic),
    conceptId: typeof row.concept_id === "string" ? row.concept_id : null,
    difficulty: row.difficulty as GeneratedQuestion["difficulty"],
    source: {
      documentId: String(row.source_document_id),
      documentName: String(row.source_document_name ?? "Teacher document"),
      page: typeof row.source_page === "number" ? row.source_page : null,
      excerpt: String(row.source_excerpt),
    },
    generationStatus: row.generation_status === "needs-review" ? "needs-review" : "grounded",
    reviewStatus: row.review_status === "published" ? "published" : row.review_status === "reviewed" ? "reviewed" : "draft",
  };
}

function parseVisualExplanation(value: unknown): TeacherQuizSet["visualExplanation"] {
  const parsed = visualExplanationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function saveAssignment(assignment: TeacherQuizSet): Promise<void> {
  const supabase = await supabaseFor(assignment.ownerId);
  if (!supabase) {
    const state = await readDemoState();
    state.assignments = [assignment, ...state.assignments.filter((item) => item.id !== assignment.id)];
    await writeDemoState(state);
    return;
  }
  const { error } = await supabase.from("quiz_sets").upsert({
    id: assignment.id,
    topic_id: assignment.topicId,
    owner_id: assignment.ownerId,
    title: assignment.title,
    subject: assignment.subject,
    topic: assignment.topic,
    instructions: assignment.instructions,
    status: assignment.status,
    learning_stage: assignment.learningStage,
    available_from: assignment.availableFrom ?? null,
    due_at: assignment.dueAt ?? null,
    published_at: assignment.publishedAt ?? null,
    visual_explanation: assignment.visualExplanation ?? null,
    created_at: assignment.createdAt,
  });
  if (error) throw new Error(`Could not save quiz set: ${error.message}`);
  const { error: questionsError } = await supabase.from("quiz_questions").upsert(assignment.questions.map((question) => ({
    id: question.id,
    quiz_set_id: assignment.id,
    owner_id: assignment.ownerId,
    question_type: question.type,
    prompt: question.prompt,
    options: question.options ?? null,
    explanation: question.explanation,
    subject: question.subject,
    topic: question.topic,
    concept_id: question.conceptId,
    difficulty: question.difficulty,
    source_document_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(question.source.documentId) ? question.source.documentId : null,
    source_document_name: question.source.documentName,
    source_page: question.source.page,
    source_excerpt: question.source.excerpt,
    generation_status: question.generationStatus,
    review_status: question.reviewStatus,
    updated_at: new Date().toISOString(),
  })));
  if (questionsError) throw new Error(`Could not save quiz questions: ${questionsError.message}`);
  const { error: answersError } = await supabase.from("quiz_question_answers").upsert(assignment.questions.map((question) => ({
    question_id: question.id,
    owner_id: assignment.ownerId,
    correct_answer: question.correctAnswer,
  })));
  if (answersError) throw new Error(`Could not save quiz answer keys: ${answersError.message}`);
}

export async function listTeacherAssignments(ownerId: string): Promise<TeacherQuizSet[]> {
  const supabase = await supabaseFor(ownerId);
  if (!supabase) return (await readDemoState()).assignments.filter((assignment) => assignment.ownerId === ownerId);
  const { data, error } = await supabase.from("quiz_sets").select("*, quiz_questions(*)").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read quiz sets: ${error.message}`);
  const questionIds = (data ?? []).flatMap((row) => Array.isArray((row as Record<string, unknown>).quiz_questions) ? ((row as Record<string, unknown>).quiz_questions as Array<Record<string, unknown>>).map((question) => String(question.id)) : []);
  const { data: answers, error: answersError } = questionIds.length > 0
    ? await supabase.from("quiz_question_answers").select("question_id, correct_answer").in("question_id", questionIds)
    : { data: [], error: null };
  if (answersError) throw new Error(`Could not read quiz answer keys: ${answersError.message}`);
  const answerById = new Map((answers ?? []).map((answer) => [String(answer.question_id), String(answer.correct_answer)]));
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id), topicId: String(record.topic_id ?? record.id), ownerId: String(record.owner_id), title: String(record.title), subject: String(record.subject), topic: String(record.topic), instructions: String(record.instructions ?? ""), status: record.status as TeacherQuizSet["status"], learningStage: record.learning_stage === "practice" ? "practice" : "diagnostic", createdAt: String(record.created_at), visualExplanation: parseVisualExplanation(record.visual_explanation),
      publishedAt: typeof record.published_at === "string" ? record.published_at : undefined,
      questions: Array.isArray(record.quiz_questions) ? record.quiz_questions.map((item) => ({ ...rowToQuestion(item as Record<string, unknown>), correctAnswer: answerById.get(String((item as Record<string, unknown>).id)) ?? "" })) : [],
    };
  });
}

export async function listPublishedAssignments(demoMode = false): Promise<TeacherQuizSet[]> {
  const supabase = demoMode ? createSupabaseAdminClient() : await supabaseFor();
  if (demoMode && process.env.NEXT_PUBLIC_SUPABASE_URL && !supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for demo students to read published topics when Supabase is configured.");
  }
  const now = new Date().toISOString();
  if (!supabase) {
    const state = await readDemoState();
    return state.assignments.filter((assignment) => assignment.status === "published" && (!assignment.availableFrom || assignment.availableFrom <= now) && (!assignment.dueAt || assignment.dueAt >= now));
  }
  const { data, error } = await supabase.from("quiz_sets").select("*, quiz_questions(*)").eq("status", "published").or(`available_from.is.null,available_from.lte.${now}`).or(`due_at.is.null,due_at.gte.${now}`).order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read published assignments: ${error.message}`);
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id), topicId: String(record.topic_id ?? record.id), ownerId: String(record.owner_id), title: String(record.title), subject: String(record.subject), topic: String(record.topic), instructions: String(record.instructions ?? ""), status: "published", learningStage: record.learning_stage === "practice" ? "practice" : "diagnostic", createdAt: String(record.created_at), visualExplanation: parseVisualExplanation(record.visual_explanation),
      publishedAt: typeof record.published_at === "string" ? record.published_at : undefined,
      // Do not select quiz_question_answers here. This is the student-safe path.
      questions: Array.isArray(record.quiz_questions) ? record.quiz_questions.map((item) => rowToQuestion(item as Record<string, unknown>)) : [],
    };
  });
}

export async function getAssignmentForAttempt(assignmentId: string, learnerId: string, demoMode = false): Promise<TeacherQuizSet | null> {
  const assignment = (await listPublishedAssignments(demoMode)).find((item) => item.id === assignmentId) ?? null;
  if (!assignment) return null;
  if (demoMode) {
    const admin = createSupabaseAdminClient();
    if (!admin) return assignment;
    const { data: rows, error: questionError } = await admin.from("quiz_questions").select("*").eq("quiz_set_id", assignmentId).eq("review_status", "published");
    if (questionError) throw new Error(`Could not load grading questions: ${questionError.message}`);
    const ids = (rows ?? []).map((row) => String(row.id));
    const { data: keys, error: keyError } = await admin.from("quiz_question_answers").select("question_id, correct_answer").in("question_id", ids);
    if (keyError) throw new Error(`Could not load grading answer keys: ${keyError.message}`);
    const keyById = new Map((keys ?? []).map((key) => [String(key.question_id), String(key.correct_answer)]));
    return { ...assignment, questions: (rows ?? []).map((row) => ({ ...rowToQuestion(row as Record<string, unknown>), correctAnswer: keyById.get(String(row.id)) ?? "" })) };
  }
  const supabase = await supabaseFor(learnerId);
  if (!supabase) return assignment;
  // The database policy is the final authorization boundary. This check keeps the
  // API from accidentally returning a draft if a query is changed later.
  const { data, error } = await supabase.from("quiz_sets").select("id").eq("id", assignmentId).eq("status", "published").maybeSingle();
  if (error) throw new Error(`Could not authorize assignment: ${error.message}`);
  if (!data) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side quiz grading.");
  const { data: rows, error: questionError } = await admin.from("quiz_questions").select("*").eq("quiz_set_id", assignmentId).eq("review_status", "published");
  if (questionError) throw new Error(`Could not load grading questions: ${questionError.message}`);
  const ids = (rows ?? []).map((row) => String(row.id));
  const { data: keys, error: keyError } = await admin.from("quiz_question_answers").select("question_id, correct_answer").in("question_id", ids);
  if (keyError) throw new Error(`Could not load grading answer keys: ${keyError.message}`);
  const keyById = new Map((keys ?? []).map((key) => [String(key.question_id), String(key.correct_answer)]));
  return { ...assignment, questions: (rows ?? []).map((row) => ({ ...rowToQuestion(row as Record<string, unknown>), correctAnswer: keyById.get(String(row.id)) ?? "" })) };
}

export async function saveAttempt(attempt: AttemptRecord, demoMode = false): Promise<{ saved: boolean; attempt: AttemptRecord }> {
  const supabase = demoMode ? null : await supabaseFor(attempt.learnerId);
  if (!supabase) {
    const state = await readDemoState();
    const duplicate = state.attempts.find((item) => item.id === attempt.id);
    if (duplicate) return { saved: false, attempt: duplicate };
    state.attempts.unshift(attempt);
    await writeDemoState(state);
    return { saved: true, attempt };
  }
  const { data, error } = await supabase.from("quiz_attempts").upsert({
    id: attempt.id,
    quiz_set_id: attempt.assignmentId,
    learner_id: attempt.learnerId,
    learning_stage: attempt.learningStage ?? "diagnostic",
    submitted_at: attempt.submittedAt,
    score: attempt.score,
    total: attempt.total,
  }, { onConflict: "id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw new Error(`Could not save quiz attempt: ${error.message}`);
  if (!data) return { saved: false, attempt };
  const { error: responseError } = await supabase.from("quiz_responses").upsert(attempt.responses.map((response) => ({ attempt_id: attempt.id, question_id: response.questionId, response: response.response, is_correct: response.correct, topic: response.topic, difficulty: response.difficulty, concept_id: response.conceptId })));
  if (responseError) throw new Error(`Could not save quiz responses: ${responseError.message}`);
  return { saved: true, attempt };
}

export async function listTeacherLearningRecords(ownerId: string): Promise<Array<{ student: { id: string; email: string; createdAt: string; lastActivityAt: string }; attempts: AttemptRecord[]; events: StudentLearningEvent[] }>> {
  const profiles = await listDemoStudentProfiles();
  const supabase = await supabaseFor(ownerId);
  if (!supabase) {
    const state = await readDemoState();
    const assignments = state.assignments.filter((assignment) => assignment.ownerId === ownerId);
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    const events = await listDemoStudentEvents();
    return profiles.flatMap((profile) => {
      const attempts = state.attempts.filter((attempt) => attempt.learnerId === profile.id && assignmentIds.has(attempt.assignmentId));
      const studentEvents = events.filter((event) => event.learnerId === profile.id && assignmentIds.has(event.assignmentId));
      if (attempts.length === 0 && studentEvents.length === 0) return [];
      const lastActivityAt = [profile.lastActivityAt, attempts[0]?.submittedAt ?? "", studentEvents[0]?.occurredAt ?? ""].sort().at(-1) ?? profile.lastActivityAt;
      return [{ student: { ...profile, lastActivityAt }, attempts: attempts.map((attempt) => ({ ...attempt, learningStage: attempt.learningStage ?? "diagnostic" as const })).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)), events: studentEvents }];
    });
  }

  const { data: quizRows, error: quizError } = await supabase.from("quiz_sets").select("id").eq("owner_id", ownerId);
  if (quizError) throw new Error(`Could not read teacher topics: ${quizError.message}`);
  const quizIds = (quizRows ?? []).map((row) => String(row.id));
  if (quizIds.length === 0) return [];
  const { data: attemptRows, error: attemptError } = await supabase.from("quiz_attempts").select("*").in("quiz_set_id", quizIds).order("submitted_at", { ascending: false });
  if (attemptError) throw new Error(`Could not read teacher attempts: ${attemptError.message}`);
  const { data: eventRows, error: eventError } = await supabase.from("student_learning_events").select("*").in("quiz_set_id", quizIds).order("occurred_at", { ascending: false });
  if (eventError) throw new Error(`Could not read student learning events: ${eventError.message}`);
  const learnerIds = [...new Set([...(attemptRows ?? []).map((row) => String(row.learner_id)), ...(eventRows ?? []).map((row) => String(row.learner_id))])];
  const attemptIds = (attemptRows ?? []).map((row) => String(row.id));
  const [{ data: responseRows, error: responseError }, { data: profileRows, error: profileError }] = await Promise.all([
    attemptIds.length ? supabase.from("quiz_responses").select("*").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
    learnerIds.length ? supabase.from("student_profiles").select("id,email,created_at,last_activity_at").in("id", learnerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (responseError) throw new Error(`Could not read teacher responses: ${responseError.message}`);
  if (profileError) throw new Error(`Could not read teacher student profiles: ${profileError.message}`);
  const responsesByAttempt = new Map<string, AttemptRecord["responses"]>();
  for (const row of responseRows ?? []) {
    const attemptId = String(row.attempt_id);
    const response = { questionId: String(row.question_id), response: String(row.response), correct: Boolean(row.is_correct), topic: String(row.topic), difficulty: String(row.difficulty), conceptId: typeof row.concept_id === "string" ? row.concept_id : null };
    responsesByAttempt.set(attemptId, [...(responsesByAttempt.get(attemptId) ?? []), response]);
  }
  const attempts: AttemptRecord[] = (attemptRows ?? []).map((row) => ({
    id: String(row.id), assignmentId: String(row.quiz_set_id), learnerId: String(row.learner_id), submittedAt: String(row.submitted_at),
    score: Number(row.score), total: Number(row.total), learningStage: row.learning_stage === "practice" ? "practice" as const : "diagnostic" as const,
    responses: responsesByAttempt.get(String(row.id)) ?? [],
  }));
  const profileById = new Map((profileRows ?? []).map((row) => [String(row.id), { id: String(row.id), email: String(row.email), createdAt: String(row.created_at), lastActivityAt: String(row.last_activity_at) }]));
  const events: StudentLearningEvent[] = (eventRows ?? []).map((row) => ({
    id: String(row.id), learnerId: String(row.learner_id), assignmentId: String(row.quiz_set_id), topicId: String(row.topic_id),
    type: row.event_type as StudentLearningEvent["type"], conceptId: typeof row.concept_id === "string" ? row.concept_id : undefined,
    occurredAt: String(row.occurred_at), metadata: row.metadata as StudentLearningEvent["metadata"],
  }));
  const records: Array<{ student: { id: string; email: string; createdAt: string; lastActivityAt: string }; attempts: AttemptRecord[]; events: StudentLearningEvent[] }> = learnerIds.map((learnerId) => {
    const studentAttempts = attempts.filter((attempt) => attempt.learnerId === learnerId);
    const studentEvents = events.filter((event) => event.learnerId === learnerId);
    const profile = profileById.get(learnerId) ?? { id: learnerId, email: "Student account", createdAt: "", lastActivityAt: "" };
    const lastActivityAt = [profile.lastActivityAt, studentAttempts[0]?.submittedAt ?? "", studentEvents[0]?.occurredAt ?? ""].sort().at(-1) ?? profile.lastActivityAt;
    return { student: { ...profile, lastActivityAt }, attempts: studentAttempts, events: studentEvents };
  }).filter((record) => record.attempts.length > 0 || record.events.length > 0);

  if (process.env.NODE_ENV !== "production" && process.env.STUDENT_DEMO_MODE === "true") {
    const local = await readDemoState();
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const localAttempts = local.attempts.filter((attempt) => quizIds.includes(attempt.assignmentId));
    const localEvents = (await listDemoStudentEvents()).filter((event) => quizIds.includes(event.assignmentId));
    const localStudentIds = new Set([...localAttempts.map((attempt) => attempt.learnerId), ...localEvents.map((event) => event.learnerId)]);
    for (const learnerId of localStudentIds) {
      const student = profilesById.get(learnerId);
      if (!student) continue;
      records.push({
        student,
        attempts: localAttempts.filter((attempt) => attempt.learnerId === learnerId).map((attempt) => ({ ...attempt, learningStage: attempt.learningStage ?? "diagnostic" })),
        events: localEvents.filter((event) => event.learnerId === learnerId),
      });
    }
  }
  return records;
}

function rowToAttempt(row: Record<string, unknown>, responses: Array<Record<string, unknown>>): AttemptRecord {
  return {
    id: String(row.id),
    assignmentId: String(row.quiz_set_id),
    learnerId: String(row.learner_id),
    submittedAt: String(row.submitted_at),
    score: Number(row.score),
    total: Number(row.total),
    learningStage: row.learning_stage === "practice" ? "practice" : "diagnostic",
    responses: responses.map((response) => ({
      questionId: String(response.question_id),
      response: String(response.response),
      correct: Boolean(response.is_correct),
      topic: String(response.topic),
      difficulty: String(response.difficulty),
      conceptId: typeof response.concept_id === "string" ? response.concept_id : null,
    })),
  };
}

export async function listLearnerAttempts(learnerId: string, demoMode = false): Promise<AttemptRecord[]> {
  const supabase = demoMode ? null : await supabaseFor(learnerId);
  if (!supabase) return (await readDemoState()).attempts.filter((attempt) => attempt.learnerId === learnerId).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  const { data: attempts, error } = await supabase.from("quiz_attempts").select("*").eq("learner_id", learnerId).order("submitted_at", { ascending: false });
  if (error) throw new Error(`Could not read student attempts: ${error.message}`);
  const attemptIds = (attempts ?? []).map((attempt) => String(attempt.id));
  const { data: responses, error: responseError } = attemptIds.length > 0
    ? await supabase.from("quiz_responses").select("*").in("attempt_id", attemptIds)
    : { data: [], error: null };
  if (responseError) throw new Error(`Could not read student responses: ${responseError.message}`);
  const responsesByAttempt = new Map<string, Array<Record<string, unknown>>>();
  for (const response of responses ?? []) {
    const attemptId = String(response.attempt_id);
    responsesByAttempt.set(attemptId, [...(responsesByAttempt.get(attemptId) ?? []), response as Record<string, unknown>]);
  }
  return (attempts ?? []).map((attempt) => rowToAttempt(attempt as Record<string, unknown>, responsesByAttempt.get(String(attempt.id)) ?? []));
}

export async function listTeacherAttempts(ownerId: string): Promise<{ attempts: AttemptRecord[]; profiles: Array<{ id: string; email: string; createdAt: string; lastActivityAt: string }> }> {
  const supabase = await supabaseFor(ownerId);
  if (!supabase) {
    const state = await readDemoState();
    const assignmentIds = new Set(state.assignments.filter((assignment) => assignment.ownerId === ownerId).map((assignment) => assignment.id));
    const profiles = await listDemoStudentProfiles();
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const attempts = state.attempts.filter((attempt) => assignmentIds.has(attempt.assignmentId) && profileById.has(attempt.learnerId)).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
    return { attempts, profiles: profiles.filter((profile) => attempts.some((attempt) => attempt.learnerId === profile.id)) };
  }

  const { data: quizzes, error: quizError } = await supabase.from("quiz_sets").select("id").eq("owner_id", ownerId);
  if (quizError) throw new Error(`Could not read teacher quiz sets: ${quizError.message}`);
  const quizIds = (quizzes ?? []).map((quiz) => String(quiz.id));
  if (quizIds.length === 0) return { attempts: [], profiles: [] };
  const { data: attemptRows, error: attemptError } = await supabase.from("quiz_attempts").select("*").in("quiz_set_id", quizIds).order("submitted_at", { ascending: false });
  if (attemptError) throw new Error(`Could not read teacher attempts: ${attemptError.message}`);
  const attemptIds = (attemptRows ?? []).map((attempt) => String(attempt.id));
  const learnerIds = [...new Set((attemptRows ?? []).map((attempt) => String(attempt.learner_id)))];
  const [{ data: responseRows, error: responseError }, { data: profileRows, error: profileError }] = await Promise.all([
    attemptIds.length > 0 ? supabase.from("quiz_responses").select("*").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
    learnerIds.length > 0 ? supabase.from("student_profiles").select("id,email,created_at,last_activity_at").in("id", learnerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (responseError) throw new Error(`Could not read teacher responses: ${responseError.message}`);
  if (profileError) throw new Error(`Could not read teacher student profiles: ${profileError.message}`);
  const responsesByAttempt = new Map<string, Array<Record<string, unknown>>>();
  for (const response of responseRows ?? []) {
    const attemptId = String(response.attempt_id);
    responsesByAttempt.set(attemptId, [...(responsesByAttempt.get(attemptId) ?? []), response as Record<string, unknown>]);
  }
  const attempts = (attemptRows ?? []).map((attempt) => rowToAttempt(attempt as Record<string, unknown>, responsesByAttempt.get(String(attempt.id)) ?? []));
  const profiles = (profileRows ?? []).map((profile) => ({ id: String(profile.id), email: String(profile.email), createdAt: String(profile.created_at), lastActivityAt: String(profile.last_activity_at) }));
  if (process.env.NODE_ENV !== "production" && process.env.STUDENT_DEMO_MODE === "true") {
    const local = await readDemoState();
    const demoProfiles = await listDemoStudentProfiles();
    const demoAttempts = local.attempts.filter((attempt) => quizIds.includes(attempt.assignmentId));
    attempts.push(...demoAttempts);
    profiles.push(...demoProfiles.filter((profile) => demoAttempts.some((attempt) => attempt.learnerId === profile.id)));
  }
  return { attempts: attempts.sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)), profiles };
}

export type { AttemptRecord };
