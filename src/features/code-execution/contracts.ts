import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

export interface CodeExecutionProvider {
  readonly id: string;
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export type ExecutionOutcome =
  | { configured: true; result: CodeExecutionResult }
  | { configured: false; reason: "provider-not-configured" };
