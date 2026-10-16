import type { CodeExecutionProvider } from "@/features/code-execution/contracts";

/** No provider is enabled until its server adapter and credentials are configured. */
export function getCodeExecutionProvider(): CodeExecutionProvider | null {
  return null;
}
