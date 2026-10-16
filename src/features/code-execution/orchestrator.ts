import type { CodeExecutionRequest } from "@/types/domain";
import type { CodeExecutionProvider, ExecutionOutcome } from "./contracts";

export async function executeCode(
  request: CodeExecutionRequest,
  provider?: CodeExecutionProvider | null,
): Promise<ExecutionOutcome> {
  if (!provider) return { configured: false, reason: "provider-not-configured" };
  return { configured: true, result: await provider.execute(request) };
}
