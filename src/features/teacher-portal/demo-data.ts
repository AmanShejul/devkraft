export type QuestionDifficulty = "foundation" | "intermediate" | "advanced";
export type AssignmentStatus = "draft" | "published";

export type DraftQuestion = {
  id: string;
  prompt: string;
  answer: string;
  source: string;
  difficulty: QuestionDifficulty;
};

export type TeacherAssignment = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  questions: DraftQuestion[];
  status: AssignmentStatus;
  createdAt: string;
  publishedAt?: string;
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

const ASSIGNMENTS_KEY = "skillpath:demo:teacher-assignments";
const SUBMISSIONS_KEY = "skillpath:demo:assignment-submissions";
const ignoredTerms = new Set([
  "about", "after", "also", "because", "between", "could", "does", "first", "from", "have", "into",
  "information", "more", "most", "organize", "organizes", "other", "related", "should", "some", "than", "that", "their", "there", "these", "they", "this",
  "through", "under", "using", "which", "while", "where", "when", "will", "with", "would",
]);

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function readDemoAssignments(): TeacherAssignment[] {
  return readList<TeacherAssignment>(ASSIGNMENTS_KEY);
}

export function writeDemoAssignment(assignment: TeacherAssignment): TeacherAssignment[] {
  const assignments = readDemoAssignments().filter((item) => item.id !== assignment.id);
  assignments.unshift(assignment);
  window.localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  return assignments;
}

export function readDemoSubmissions(): AssignmentSubmission[] {
  return readList<AssignmentSubmission>(SUBMISSIONS_KEY);
}

export function writeDemoSubmission(submission: AssignmentSubmission): AssignmentSubmission[] {
  const submissions = [submission, ...readDemoSubmissions()];
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submissions;
}

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