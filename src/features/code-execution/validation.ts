import type { CodeExecutionRequest } from "@/types/domain";

const LANGUAGES = ["typescript", "javascript", "python"] as const;
const MAX_SOURCE_LENGTH = 20_000;
const MAX_STDIN_LENGTH = 5_000;

export type ValidationResult = { ok: true; data: CodeExecutionRequest } | { ok: false; message: string };

export function validateCodeExecutionRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") return { ok: false, message: "A JSON request body is required." };
  const data = input as Record<string, unknown>;
  if (typeof data.language !== "string" || !LANGUAGES.includes(data.language as (typeof LANGUAGES)[number])) {
    return { ok: false, message: "Choose a supported language." };
  }
  if (typeof data.sourceCode !== "string" || data.sourceCode.trim().length === 0) {
    return { ok: false, message: "Source code cannot be empty." };
  }
  if (data.sourceCode.length > MAX_SOURCE_LENGTH) return { ok: false, message: "Source code exceeds the 20,000 character limit." };
  if (data.stdin !== undefined && (typeof data.stdin !== "string" || data.stdin.length > MAX_STDIN_LENGTH)) {
    return { ok: false, message: "Input must be text under 5,000 characters." };
  }
  return {
    ok: true,
    data: { language: data.language as CodeExecutionRequest["language"], sourceCode: data.sourceCode, ...(typeof data.stdin === "string" ? { stdin: data.stdin } : {}) },
  };
}
