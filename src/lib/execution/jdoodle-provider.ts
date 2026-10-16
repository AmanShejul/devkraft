import type { CodeExecutionProvider, CodeExecutionProviderErrorKind } from "@/features/code-execution/contracts";
import { CodeExecutionProviderError } from "@/features/code-execution/contracts";
import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

export const JDOODLE_EXECUTION_ENDPOINT = "https://api.jdoodle.com/v1/execute";
export const MAX_JDOODLE_RESPONSE_BYTES = 64 * 1024;

export interface JDoodleCredentials {
  clientId: string;
  clientSecret: string;
}

export const JDOODLE_LANGUAGE_VERSIONS: Record<
  CodeExecutionRequest["language"],
  { language: string; versionIndex: string; version: string }
> = {
  typescript: { language: "typescript", versionIndex: "1", version: "5.9.3" },
  javascript: { language: "nodejs", versionIndex: "7", version: "25.8.1" },
  python: { language: "python3", versionIndex: "6", version: "3.14.3" },
};

function providerError(kind: CodeExecutionProviderErrorKind): CodeExecutionProviderError {
  // Keep provider details out of errors that may cross the API boundary.
  return new CodeExecutionProviderError(kind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBoundedBody(response: Response, signal: AbortSignal): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number.isFinite(Number(declaredLength)) && Number(declaredLength) > MAX_JDOODLE_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw providerError("provider-error");
  }

  const reader = response.body?.getReader();
  if (!reader) throw providerError("provider-error");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JDOODLE_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw providerError("provider-error");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof CodeExecutionProviderError) throw error;
    throw providerError(signal.aborted ? "timeout" : "unavailable");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw providerError("provider-error");
  }
}

export class JDoodleCodeExecutionProvider implements CodeExecutionProvider {
  readonly id = "jdoodle";

  constructor(
    private readonly credentials: JDoodleCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async execute(
    request: CodeExecutionRequest,
    options: { signal: AbortSignal },
  ): Promise<CodeExecutionResult> {
    const language = JDOODLE_LANGUAGE_VERSIONS[request.language];
    const payload = {
      clientId: this.credentials.clientId,
      clientSecret: this.credentials.clientSecret,
      script: request.sourceCode,
      language: language.language,
      versionIndex: language.versionIndex,
      ...(request.stdin === undefined ? {} : { stdin: request.stdin }),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(JDOODLE_EXECUTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: options.signal,
      });
    } catch {
      throw providerError(options.signal.aborted ? "timeout" : "unavailable");
    }

    if (response.status === 401) {
      await response.body?.cancel().catch(() => undefined);
      throw providerError("misconfigured");
    }
    if (response.status === 429) {
      await response.body?.cancel().catch(() => undefined);
      throw providerError("quota-exhausted");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw providerError(response.status >= 500 ? "unavailable" : "provider-error");
    }

    const responseText = await readBoundedBody(response, options.signal);
    let body: unknown;
    try {
      body = JSON.parse(responseText) as unknown;
    } catch {
      throw providerError("provider-error");
    }

    if (
      !isRecord(body)
      || body.statusCode !== 200
      || typeof body.output !== "string"
      || Object.hasOwn(body, "error")
    ) {
      throw providerError("provider-error");
    }

    return {
      status: "completed",
      output: body.output,
      provider: this.id,
    };
  }
}
