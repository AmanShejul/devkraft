import type { CodeExecutionProvider } from "@/features/code-execution/contracts";
import { JDoodleCodeExecutionProvider } from "./jdoodle-provider";

/**
 * Deliberately remains false until the route enforces authenticated access and
 * deployment-backed distributed rate limits. Credentials alone must not enable
 * billable execution on the currently public route.
 */
const BILLABLE_EXECUTION_ACCESS_CONTROLS_READY = false;

export function getCodeExecutionProvider(): CodeExecutionProvider | null {
  const clientId = process.env.JDOODLE_CLIENT_ID?.trim();
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !BILLABLE_EXECUTION_ACCESS_CONTROLS_READY) return null;

  return new JDoodleCodeExecutionProvider({ clientId, clientSecret });
}
