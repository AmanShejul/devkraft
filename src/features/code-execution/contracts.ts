import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

export interface CodeExecutionProvider {
  readonly id: string;
  execute(request: CodeExecutionRequest, options: { signal: AbortSignal }): Promise<CodeExecutionResult>;
}

export type CodeExecutionProviderErrorKind = "timeout" | "unavailable" | "provider-error";

/** Adapters use this error for safe, provider-independent failure classification. */
export class CodeExecutionProviderError extends Error {
  constructor(readonly kind: CodeExecutionProviderErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "CodeExecutionProviderError";
  }
}

export type ExecutionOutcome =
  | { kind: "result"; result: CodeExecutionResult }
  | { kind: "provider-not-configured" }
  | { kind: "provider-timeout" }
  | { kind: "provider-unavailable" }
  | { kind: "provider-error" };
