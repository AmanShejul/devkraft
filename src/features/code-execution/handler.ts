import type { ApiFailure } from "@/types/api";
import { apiFailure, apiSuccess } from "@/types/api";
import { isCodeExecutionResult } from "@/types/domain";
import type { CodeExecutionProvider } from "./contracts";
import { executeCode, DEFAULT_PROVIDER_TIMEOUT_MS } from "./orchestrator";
import { validateCodeExecutionRequest } from "./validation";

export const MAX_EXECUTION_REQUEST_BYTES = 32 * 1024;

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413 | 415; error: ApiFailure };

export async function readBoundedJson(request: Request): Promise<JsonBodyResult> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 415, error: apiFailure("UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.") };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EXECUTION_REQUEST_BYTES) {
    return { ok: false, status: 413, error: apiFailure("REQUEST_TOO_LARGE", "Execution request exceeds the 32 KiB limit.") };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400, error: apiFailure("INVALID_JSON", "A JSON request body is required.") };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let text: string;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_EXECUTION_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: apiFailure("REQUEST_TOO_LARGE", "Execution request exceeds the 32 KiB limit.") };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, status: 400, error: apiFailure("INVALID_JSON", "Request body must be valid UTF-8 JSON.") };
  } finally {
    reader.releaseLock();
  }

  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: apiFailure("INVALID_JSON", "Request body must be valid JSON.") };
  }
}

/** Shared handler keeps HTTP mapping testable while Next route code remains thin. */
export async function handleCodeExecutionRequest(
  request: Request,
  provider?: CodeExecutionProvider | null,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return Response.json(parsed.error, { status: parsed.status });

  const validation = validateCodeExecutionRequest(parsed.data);
  if (!validation.ok) {
    return Response.json(apiFailure(validation.code, validation.message), { status: validation.status });
  }

  const outcome = await executeCode(validation.data, provider, timeoutMs);
  switch (outcome.kind) {
    case "result":
      if (!isCodeExecutionResult(outcome.result)) {
        return Response.json(apiFailure("EXECUTION_PROVIDER_ERROR", "The execution provider returned an invalid result."), { status: 502 });
      }
      return Response.json(apiSuccess(outcome.result), { status: outcome.result.status === "queued" ? 202 : 200 });
    case "provider-not-configured":
      return Response.json(apiFailure("EXECUTION_PROVIDER_NOT_CONFIGURED", "Code execution is disabled. Configure Judge0 with JUDGE0_API_URL (and JUDGE0_API_KEY when required), or configure JDoodle server credentials."), { status: 503 });
    case "provider-misconfigured":
      return Response.json(apiFailure("EXECUTION_PROVIDER_MISCONFIGURED", "The execution provider is not configured correctly on the server."), { status: 503 });
    case "provider-quota-exhausted":
      return Response.json(apiFailure("EXECUTION_PROVIDER_QUOTA_EXHAUSTED", "The execution provider has reached its available run quota."), { status: 503 });
    case "provider-timeout":
      return Response.json(apiFailure("EXECUTION_PROVIDER_TIMEOUT", "The execution provider did not respond before the server timeout."), { status: 504 });
    case "provider-unavailable":
      return Response.json(apiFailure("EXECUTION_PROVIDER_UNAVAILABLE", "The execution provider is temporarily unavailable."), { status: 503 });
    case "provider-error":
      return Response.json(apiFailure("EXECUTION_PROVIDER_ERROR", "The execution provider could not process this request."), { status: 502 });
  }
}
