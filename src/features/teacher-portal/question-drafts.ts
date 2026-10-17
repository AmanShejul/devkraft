import type { VisualExplanation } from "./contracts";

export type QuestionDifficulty = "foundation" | "intermediate" | "advanced";
export type AssignmentStatus = "draft" | "published";
export type LearningStage = "diagnostic" | "practice";

export type DraftQuestion = {
  id: string;
  prompt: string;
  answer: string;
  source: string;
  difficulty: QuestionDifficulty;
  conceptId?: string | null;
  options?: string[];
  explanation?: string;
  sourceDocumentId?: string;
  sourcePage?: number | null;
  reviewStatus?: "draft" | "reviewed" | "published";
  generationStatus?: "grounded" | "needs-review";
};

export type TeacherAssignment = {
  id: string;
  topicId: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  questions: DraftQuestion[];
  status: AssignmentStatus;
  learningStage: LearningStage;
  createdAt: string;
  publishedAt?: string;
  sourceFiles?: string[];
  visualExplanation?: VisualExplanation | null;
};

export type SubmissionResult = {
  questionId: string;
  correct: boolean;
  response: string;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  learner: string;
  results: SubmissionResult[];
  submittedAt: string;
};

export const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ["foundation", "intermediate", "advanced"];

const ignoredTerms = new Set([
  "about", "after", "also", "because", "between", "could", "does", "first", "from", "have", "into",
  "information", "more", "most", "organize", "organizes", "other", "related", "should", "some", "than", "that", "their", "there", "these", "they", "this",
  "through", "under", "using", "which", "while", "where", "when", "will", "with", "would",
]);

export function generateDraftQuestions(content: string): DraftQuestion[] {
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);

  return sentences.flatMap((sentence, index) => {
    const candidates = (sentence.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? [])
      .filter((word) => word.length >= 5 && !ignoredTerms.has(word.toLowerCase()));
    const answer = candidates[candidates.length - 1];
    if (!answer) return [];

    const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prompt = sentence.replace(new RegExp(`\\b${escapedAnswer}\\b`, "i"), "________");
    return [{
      id: `question-${index + 1}`,
      prompt: `Complete the statement: ${prompt}`,
      answer,
      source: sentence,
      difficulty: "foundation" as const,
    }];
  }).slice(0, 8);
}

/** Applies a teacher's simple, local direction to editable drafts without changing their answer keys. */
export function personalizeDraftQuestions(
  questions: DraftQuestion[],
  direction: string,
  difficulty: QuestionDifficulty,
): DraftQuestion[] {
  const trimmedDirection = direction.trim();
  return questions.map((question) => ({
    ...question,
    difficulty,
    prompt: trimmedDirection
      ? `${trimmedDirection}: ${question.prompt.replace(/^\[[^\]]+\]:\s*/, "")}`
      : question.prompt,
  }));
}

export function normalizeResponse(response: string): string {
  return response.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getRecommendedDifficulty(
  subject: string,
  topic: string,
  assignments: TeacherAssignment[],
  submissions: AssignmentSubmission[],
  learner: string,
): QuestionDifficulty {
  const matchingAssignmentIds = new Set(assignments
    .filter((assignment) => assignment.subject === subject && assignment.topic === topic)
    .map((assignment) => assignment.id));
  const latestSubmission = submissions
    .filter((submission) => submission.learner.trim().toLowerCase() === learner.trim().toLowerCase()
      && matchingAssignmentIds.has(submission.assignmentId))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))[0];

  if (!latestSubmission || latestSubmission.results.length === 0) return "foundation";
  const score = latestSubmission.results.filter((result) => result.correct).length / latestSubmission.results.length;
  if (score >= 0.8) return "advanced";
  if (score >= 0.6) return "intermediate";
  return "foundation";
}

export function selectQuestionsForDifficulty(
  questions: DraftQuestion[],
  requestedDifficulty: QuestionDifficulty,
): DraftQuestion[] {
  const availableDifficulties = Array.from(new Set(questions.map((question) => question.difficulty)));
  if (availableDifficulties.length === 0) return [];

  const requestedIndex = QUESTION_DIFFICULTIES.indexOf(requestedDifficulty);
  const selectedDifficulty = availableDifficulties
    .sort((left, right) => Math.abs(QUESTION_DIFFICULTIES.indexOf(left) - requestedIndex)
      - Math.abs(QUESTION_DIFFICULTIES.indexOf(right) - requestedIndex))[0];

  return questions.filter((question) => question.difficulty === selectedDifficulty);
}
