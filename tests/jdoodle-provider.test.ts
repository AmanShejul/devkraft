import { afterEach, describe, expect, it, vi } from "vitest";
import {
  JDoodleCodeExecutionProvider,
  JDOODLE_EXECUTION_ENDPOINT,
  JDOODLE_LANGUAGE_VERSIONS,
  MAX_JDOODLE_RESPONSE_BYTES,
} from "@/lib/execution/jdoodle-provider";
import { getCodeExecutionProvider } from "@/lib/execution/provider";
import { CodeExecutionProviderError } from "@/features/code-execution/contracts";
import type { CodeExecutionRequest } from "@/types/domain";

const credentials = { clientId: "test-client-id", clientSecret: "test-client-secret" };
const request: CodeExecutionRequest = {
  language: "typescript",
  sourceCode: "console.log(42)",
  stdin: "",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function provider(fetchImpl: typeof fetch) {
  return new JDoodleCodeExecutionProvider(credentials, fetchImpl);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("JDoodle execution provider", () => {
  it.each([
    ["typescript", "typescript", "1"],
    ["javascript", "nodejs", "7"],
    ["python", "python3", "6"],
  ] as const)("maps %s to the pinned documented runtime", async (appLanguage, apiLanguage, versionIndex) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      output: "provider output\n",
      statusCode: 200,
      memory: "123456",
      cpuTime: "0.02",
    }));
    const codeRequest: CodeExecutionRequest = { ...request, language: appLanguage };
    const result = await provider(fetchMock).execute(codeRequest, { signal: new AbortController().signal });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(JDOODLE_EXECUTION_ENDPOINT);
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      ...credentials,
      script: codeRequest.sourceCode,
      language: apiLanguage,
      versionIndex,
      stdin: "",
    });
    expect(result).toEqual({
      status: "completed",
      output: "provider output\n",
      provider: "jdoodle",
    });
    expect(result).not.toHaveProperty("stdout");
    expect(result).not.toHaveProperty("stderr");
    expect(result).not.toHaveProperty("failureKind");
    expect(result).not.toHaveProperty("durationMs");
  });

  it("keeps combined compiler or timeout diagnostics as unclassified output", async () => {
    const output = "SyntaxError: diagnostic text; timeout is mentioned here";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ output, statusCode: 200 }));
    const result = await provider(fetchMock).execute(request, { signal: new AbortController().signal });

    expect(result).toEqual({ status: "completed", output, provider: "jdoodle" });
  });

  it("omits stdin when the app request does not provide it", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ output: "", statusCode: 200 }));
    const withoutStdin: CodeExecutionRequest = { language: request.language, sourceCode: request.sourceCode };
    await provider(fetchMock).execute(withoutStdin, { signal: new AbortController().signal });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("stdin");
  });

  it.each([
    [401, "misconfigured"],
    [429, "quota-exhausted"],
    [500, "unavailable"],
  ] as const)("sanitizes upstream HTTP %s", async (status, kind) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("raw private provider error", { status }));
    const error = await provider(fetchMock).execute(request, { signal: new AbortController().signal }).catch((value: unknown) => value);

    expect(error).toMatchObject({ kind, message: kind });
    expect(String(error)).not.toContain("raw private provider error");
  });

  it("maps other upstream client errors to a sanitized provider error", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("private body", { status: 400 }));
    await expect(provider(fetchMock).execute(request, { signal: new AbortController().signal }))
      .rejects.toMatchObject({ kind: "provider-error", message: "provider-error" });
  });

  it("maps network errors to unavailable without returning their details", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("secret-bearing network detail"));
    const error = await provider(fetchMock).execute(request, { signal: new AbortController().signal }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(CodeExecutionProviderError);
    expect(error).toMatchObject({ kind: "unavailable", message: "unavailable" });
    expect(String(error)).not.toContain("secret-bearing");
  });

  it("forwards aborts and reports the aborted request as a timeout", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const pending = provider(fetchMock).execute(request, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: "timeout", message: "timeout" });
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it.each([
    ["invalid JSON", "not-json"],
    ["missing output", JSON.stringify({ statusCode: 200 })],
    ["wrong output type", JSON.stringify({ statusCode: 200, output: 42 })],
    ["wrong request status", JSON.stringify({ statusCode: 500, output: "not a run result" })],
    ["provider error field", JSON.stringify({ statusCode: 401, error: "private body" })],
  ])("rejects %s as a sanitized provider error", async (_case, body) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
    const error = await provider(fetchMock).execute(request, { signal: new AbortController().signal }).catch((value: unknown) => value);

    expect(error).toMatchObject({ kind: "provider-error", message: "provider-error" });
    expect(String(error)).not.toContain("private body");
  });

  it("rejects provider responses larger than the application limit", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      output: "x".repeat(MAX_JDOODLE_RESPONSE_BYTES),
      statusCode: 200,
    }));
    await expect(provider(fetchMock).execute(request, { signal: new AbortController().signal }))
      .rejects.toMatchObject({ kind: "provider-error" });
  });

  it("uses only the current documented language IDs and version indices", () => {
    expect(JDOODLE_LANGUAGE_VERSIONS).toEqual({
      typescript: { language: "typescript", versionIndex: "1", version: "5.9.3" },
      javascript: { language: "nodejs", versionIndex: "7", version: "25.8.1" },
      python: { language: "python3", versionIndex: "6", version: "3.14.3" },
    });
  });

  it("keeps execution disabled unless the explicit server environment flag is enabled", () => {
    vi.stubEnv("JDOODLE_CLIENT_ID", credentials.clientId);
    vi.stubEnv("JDOODLE_CLIENT_SECRET", credentials.clientSecret);
    vi.stubEnv("JDOODLE_EXECUTION_ENABLED", "false");
    expect(getCodeExecutionProvider()).toBeNull();

    vi.stubEnv("JDOODLE_EXECUTION_ENABLED", "true");
    expect(getCodeExecutionProvider()).toMatchObject({ id: "jdoodle" });
  });

  it("requires server-side credentials even when execution is enabled", () => {
    vi.stubEnv("JDOODLE_EXECUTION_ENABLED", "true");
    vi.stubEnv("JDOODLE_CLIENT_ID", "");
    vi.stubEnv("JDOODLE_CLIENT_SECRET", "");
    expect(getCodeExecutionProvider()).toBeNull();
  });
});
