export type ConceptId = string;

export interface Concept {
  id: ConceptId;
  title: string;
  description: string;
  prerequisites: ConceptId[];
}

export interface ConceptMastery {
  conceptId: ConceptId;
  probability: number;
  updatedAt?: string;
}

export interface LearningMission {
  id: string;
  title: string;
  description: string;
  conceptId: ConceptId;
  estimatedMinutes: number;
  difficulty: "starter" | "developing" | "stretch";
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
  conceptId: ConceptId;
}

export interface AssessmentAnswer {
  questionId: string;
  choiceId: string;
}

export interface AssessmentAttempt {
  attemptId: string;
  startedAt: string;
  answers: AssessmentAnswer[];
}

export interface AssessmentQuestionResult {
  questionId: string;
  correct: boolean;
  correctChoiceId: string;
  explanation: string;
}

export interface AssessmentResult {
  attemptId: string;
  score: number;
  total: number;
  completedAt: string;
  persistence: "demo" | "saved";
  answers: AssessmentQuestionResult[];
}

export interface CodeExecutionRequest {
  language: "typescript" | "javascript" | "python";
  sourceCode: string;
  stdin?: string;
}

export interface CodeExecutionResult {
  status: "completed" | "failed" | "queued";
  stdout: string;
  stderr: string;
  durationMs?: number;
  provider: string;
}

export interface MentorHint {
  source: "retrieved-knowledge" | "heuristic" | "generated";
  title: string;
  text: string;
  relatedConceptIds: ConceptId[];
}

export interface LikelyMistakeExplanation {
  category: string;
  evidence: string;
  explanation: string;
  confidence: "low" | "medium";
  source: "heuristic" | "generated";
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  kind: "edit" | "run" | "submit" | "focus-change";
  occurredAt: string;
  payload?: Record<string, string | number | boolean>;
}

export interface IntegritySignal {
  kind: "tab-hidden" | "paste-burst" | "unusual-edit-rate";
  occurredAt: string;
  severity: "info" | "review";
}

export interface VivaQuestion {
  id: string;
  prompt: string;
  conceptId: ConceptId;
}

export interface VivaEvaluation {
  questionId: string;
  score: number;
  feedback: string;
  evaluatedBy: "heuristic" | "generated";
}
