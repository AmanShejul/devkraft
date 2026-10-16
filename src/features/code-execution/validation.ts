import type { CodeExecutionRequest } from "@/types/domain";

const LANGUAGES = ["typescript", "javascript", "python"] as const;
export const SUPPORTED_CODE_LANGUAGES = LANGUAGES;
export const MAX_SOURCE_LENGTH = 20_000;
export const MAX_STDIN_LENGTH = 5_000;

export type ValidationIssueCode = "INVALID_EXECUTION_REQUEST" | "UNSUPPORTED_LANGUAGE" | "SOURCE_REQUIRED" | "SOURCE_TOO_LARGE" | "INVALID_STDIN" | "STDIN_TOO_LARGE";
export type ValidationResult =
  | { ok: true; data: CodeExecutionRequest }
  | { ok: false; code: ValidationIssueCode; message: string; status: 400 | 413 | 422 };

export function validateCodeExecutionRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "INVALID_EXECUTION_REQUEST", message: "A JSON object is required.", status: 400 };
  }
  const data = input as Record<string, unknown>;
  if (typeof data.language !== "string") {
    return { ok: false, code: "INVALID_EXECUTION_REQUEST", message: "A language is required.", status: 400 };
  }
  if (!LANGUAGES.includes(data.language as (typeof LANGUAGES)[number])) {
    return { ok: false, code: "UNSUPPORTED_LANGUAGE", message: "Supported languages are TypeScript, JavaScript, and Python.", status: 422 };
  }
  if (typeof data.sourceCode !== "string" || data.sourceCode.trim().length === 0) {
    return { ok: false, code: "SOURCE_REQUIRED", message: "Source code cannot be empty.", status: 400 };
  }
  if (data.sourceCode.length > MAX_SOURCE_LENGTH) {
    return { ok: false, code: "SOURCE_TOO_LARGE", message: `Source code exceeds the ${MAX_SOURCE_LENGTH} character limit.`, status: 413 };
  }
  if (data.stdin !== undefined && typeof data.stdin !== "string") {
    return { ok: false, code: "INVALID_STDIN", message: "Standard input must be text.", status: 400 };
  }
  if (typeof data.stdin === "string" && data.stdin.length > MAX_STDIN_LENGTH) {
    return { ok: false, code: "STDIN_TOO_LARGE", message: `Standard input exceeds the ${MAX_STDIN_LENGTH} character limit.`, status: 413 };
  }
  return {
    ok: true,
    data: { language: data.language as CodeExecutionRequest["language"], sourceCode: data.sourceCode, ...(typeof data.stdin === "string" ? { stdin: data.stdin } : {}) },
  };
}
