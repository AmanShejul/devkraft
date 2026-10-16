import type { CodeExecutionRequest } from "@/types/domain";
import { CodeExecutionProviderError, type CodeExecutionProvider, type ExecutionOutcome } from "./contracts";

export const DEFAULT_PROVIDER_TIMEOUT_MS = 12_000;

export async function executeCode(
  request: CodeExecutionRequest,
  provider?: CodeExecutionProvider | null,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<ExecutionOutcome> {
  if (!provider) return { kind: "provider-not-configured" };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new CodeExecutionProviderError("timeout"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      provider.execute(request, { signal: controller.signal }),
      timeout,
    ]);
    return { kind: "result", result };
  } catch (error) {
    if (error instanceof CodeExecutionProviderError) {
      if (error.kind === "timeout") return { kind: "provider-timeout" };
      if (error.kind === "unavailable") return { kind: "provider-unavailable" };
      if (error.kind === "misconfigured") return { kind: "provider-misconfigured" };
      if (error.kind === "quota-exhausted") return { kind: "provider-quota-exhausted" };
    }
    return { kind: "provider-error" };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
