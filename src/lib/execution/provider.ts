import type { CodeExecutionProvider } from "@/features/code-execution/contracts";
import { JDoodleCodeExecutionProvider } from "./jdoodle-provider";

export function getCodeExecutionProvider(): CodeExecutionProvider | null {
  const clientId = process.env.JDOODLE_CLIENT_ID?.trim();
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET?.trim();
  if (
    process.env.JDOODLE_EXECUTION_ENABLED !== "true"
    || !clientId
    || !clientSecret
  ) {
    return null;
  }

  return new JDoodleCodeExecutionProvider({ clientId, clientSecret });
}
