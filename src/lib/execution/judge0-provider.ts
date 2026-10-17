import type { CodeExecutionProvider, CodeExecutionProviderErrorKind } from "@/features/code-execution/contracts";
import { CodeExecutionProviderError } from "@/features/code-execution/contracts";
import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

export const MAX_JUDGE0_RESPONSE_BYTES = 64 * 1024;
const POLL_INTERVAL_MS = 300;
const MAX_POLL_TIME_MS = 11_000;

export const JUDGE0_LANGUAGE_IDS: Record<CodeExecutionRequest["language"], number> = {
  javascript: 63,
  python: 71,
  typescript: 74,
};

export interface Judge0Credentials {
  apiUrl: string;
  apiKey?: string;
}

type Judge0Payload = {
  token?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  compile_output?: unknown;
  message?: unknown;
  time?: unknown;
  status?: { id?: unknown; description?: unknown };
};

function providerError(kind: CodeExecutionProviderErrorKind): CodeExecutionProviderError {
  return new CodeExecutionProviderError(kind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number.isFinite(Number(declaredLength)) && Number(declaredLength) > MAX_JUDGE0_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw providerError("provider-error");
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    throw providerError(signal.aborted ? "timeout" : "unavailable");
  }
  if (text.length > MAX_JUDGE0_RESPONSE_BYTES) throw providerError("provider-error");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw providerError("provider-error");
  }
}

function responseError(status: number): CodeExecutionProviderError {
  if (status === 401 || status === 403) return providerError("misconfigured");
  if (status === 429) return providerError("quota-exhausted");
  if (status === 503) return providerError("unavailable");
  if (status >= 500) return providerError("unavailable");
  return providerError("provider-error");
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(providerError("timeout"));
    };
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function statusId(payload: Judge0Payload): number | null {
  return typeof payload.status?.id === "number" ? payload.status.id : null;
}

function textField(payload: Judge0Payload, field: keyof Pick<Judge0Payload, "stdout" | "stderr" | "compile_output" | "message">): string {
  return typeof payload[field] === "string" ? payload[field] : "";
}

function toResult(payload: Judge0Payload): CodeExecutionResult {
  const id = statusId(payload);
  const stdout = textField(payload, "stdout");
  const stderr = [textField(payload, "stderr"), textField(payload, "compile_output"), textField(payload, "message")].filter(Boolean).join("\n");
  const durationSeconds = typeof payload.time === "number" ? payload.time : typeof payload.time === "string" ? Number(payload.time) : NaN;
  const durationMs = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds * 1000 : undefined;

  if (id === 3) return { status: "completed", stdout, stderr, ...(durationMs === undefined ? {} : { durationMs }), provider: "judge0" };
  if (id === 5) return { status: "failed", stdout, stderr, failureKind: "timeout", ...(durationMs === undefined ? {} : { durationMs }), provider: "judge0" };
  if (id === 6) return { status: "failed", stdout, stderr, failureKind: "compile-error", ...(durationMs === undefined ? {} : { durationMs }), provider: "judge0" };
  return { status: "failed", stdout, stderr, failureKind: "runtime-error", ...(durationMs === undefined ? {} : { durationMs }), provider: "judge0" };
}

export class Judge0CodeExecutionProvider implements CodeExecutionProvider {
  readonly id = "judge0";
  private readonly baseUrl: string;

  constructor(
    private readonly credentials: Judge0Credentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = credentials.apiUrl.replace(/\/+$/, "");
  }

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(this.credentials.apiKey ? { "X-Auth-Token": this.credentials.apiKey } : {}),
    };
  }

  private async request(url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, signal });
    } catch {
      throw providerError(signal.aborted ? "timeout" : "unavailable");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw responseError(response.status);
    }
    return readResponse(response, signal);
  }

  async execute(request: CodeExecutionRequest, options: { signal: AbortSignal }): Promise<CodeExecutionResult> {
    const created = await this.request(`${this.baseUrl}/submissions/?base64_encoded=false&wait=false`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        source_code: request.sourceCode,
        language_id: JUDGE0_LANGUAGE_IDS[request.language],
        ...(request.stdin === undefined ? {} : { stdin: request.stdin }),
      }),
    }, options.signal);
    if (!isRecord(created) || typeof created.token !== "string" || created.token.length === 0) throw providerError("provider-error");

    const deadline = Date.now() + MAX_POLL_TIME_MS;
    while (Date.now() < deadline) {
      const result = await this.request(`${this.baseUrl}/submissions/${encodeURIComponent(created.token)}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time`, {
        method: "GET",
        headers: this.headers(),
      }, options.signal);
      if (!isRecord(result)) throw providerError("provider-error");
      const payload = result as Judge0Payload;
      const id = statusId(payload);
      if (id === 1 || id === 2) {
        await delay(POLL_INTERVAL_MS, options.signal);
        continue;
      }
      if (id === null) throw providerError("provider-error");
      return toResult(payload);
    }
    throw providerError("timeout");
  }
}
