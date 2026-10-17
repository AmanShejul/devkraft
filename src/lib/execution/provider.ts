import type { CodeExecutionProvider } from "@/features/code-execution/contracts";
import { JDoodleCodeExecutionProvider } from "./jdoodle-provider";
import { Judge0CodeExecutionProvider } from "./judge0-provider";

export function getCodeExecutionProvider(): CodeExecutionProvider | null {
  const judge0Url = process.env.JUDGE0_API_URL?.trim();
  const judge0ApiKey = process.env.JUDGE0_API_KEY?.trim();
  if (judge0Url) return new Judge0CodeExecutionProvider({ apiUrl: judge0Url, ...(judge0ApiKey ? { apiKey: judge0ApiKey } : {}) });

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
