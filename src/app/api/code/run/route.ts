import { executeCode, validateCodeExecutionRequest } from "@/features/code-execution";
import { getCodeExecutionProvider } from "@/lib/execution/provider";
import { apiFailure, apiSuccess } from "@/types/api";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 });
  }

  const validation = validateCodeExecutionRequest(body);
  if (!validation.ok) {
    return Response.json(apiFailure("INVALID_EXECUTION_REQUEST", validation.message), { status: 400 });
  }

  const outcome = await executeCode(validation.data, getCodeExecutionProvider());
  if (!outcome.configured) {
    return Response.json(apiFailure(
      "EXECUTION_PROVIDER_NOT_CONFIGURED",
      "Execution provider not configured. Add server-side JDoodle credentials and a verified provider adapter before running code.",
    ), { status: 503 });
  }

  return Response.json(apiSuccess(outcome.result));
}
