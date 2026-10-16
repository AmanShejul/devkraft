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
  mastery: ConceptMastery[];
}

export interface CodeExecutionRequest {
  language: "typescript" | "javascript" | "python";
  sourceCode: string;
  stdin?: string;
}

interface CodeExecutionResultBase {
  status: "completed" | "failed" | "queued";
  provider: string;
  /** Only include this classification when the provider supplies it reliably. */
  failureKind?: "compile-error" | "runtime-error" | "timeout";
  /** Only include this duration when the provider supplies it reliably. */
  durationMs?: number;
}

/**
 * Providers may return one combined output or distinct stdout/stderr streams.
 * Do not split a combined output into fabricated channels.
 */
export type CodeExecutionResult = CodeExecutionResultBase & (
  | {
      output: string;
      stdout?: never;
      stderr?: never;
    }
  | {
      output?: never;
      stdout: string;
      stderr: string;
    }
);

/** Runtime validation for provider results and responses received by the UI. */
export function isCodeExecutionResult(value: unknown): value is CodeExecutionResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const result = value as Record<string, unknown>;
  if (
    (result.status !== "completed" && result.status !== "failed" && result.status !== "queued")
    || typeof result.provider !== "string"
    || result.provider.trim().length === 0
  ) {
    return false;
  }

  if (
    result.failureKind !== undefined
    && result.failureKind !== "compile-error"
    && result.failureKind !== "runtime-error"
    && result.failureKind !== "timeout"
  ) {
    return false;
  }
  if (
    result.durationMs !== undefined
    && (typeof result.durationMs !== "number" || !Number.isFinite(result.durationMs) || result.durationMs < 0)
  ) {
    return false;
  }

  if (result.output !== undefined) {
    return typeof result.output === "string"
      && result.stdout === undefined
      && result.stderr === undefined;
  }

  return typeof result.stdout === "string" && typeof result.stderr === "string";
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
