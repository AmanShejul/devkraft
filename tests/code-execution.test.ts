import { describe, expect, it, vi } from "vitest";
import { handleCodeExecutionRequest, MAX_EXECUTION_REQUEST_BYTES } from "@/features/code-execution";
import { CodeExecutionProviderError, type CodeExecutionProvider } from "@/features/code-execution/contracts";
import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

function postJson(value: string): Request {
  return new Request("http://localhost/api/code/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: value,
  });
}

const validRequest: CodeExecutionRequest = { language: "javascript", sourceCode: "console.log(42)", stdin: "" };

function mockProvider(result: CodeExecutionResult): CodeExecutionProvider {
  return { id: "mock-provider", execute: vi.fn().mockResolvedValue(result) };
}

describe("code execution API handler", () => {
  it("validates a request and maps the provider's real result fields", async () => {
    const result: CodeExecutionResult = {
      status: "completed",
      stdout: "42\n",
      stderr: "",
      durationMs: 8,
      provider: "mock-provider",
    };
    const provider = mockProvider(result);
    const response = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), provider);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, data: result });
    expect(provider.execute).toHaveBeenCalledWith(validRequest, { signal: expect.anything() });
  });

  it("rejects malformed JSON and missing fields", async () => {
    const malformed = await handleCodeExecutionRequest(postJson("{"));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("INVALID_JSON");

    const missingCode = await handleCodeExecutionRequest(postJson(JSON.stringify({ language: "javascript" })));
    expect(missingCode.status).toBe(400);
    expect((await missingCode.json()).error.code).toBe("SOURCE_REQUIRED");

    const missingLanguage = await handleCodeExecutionRequest(postJson(JSON.stringify({ sourceCode: "console.log(1)" })));
    expect(missingLanguage.status).toBe(400);
    expect((await missingLanguage.json()).error.code).toBe("INVALID_EXECUTION_REQUEST");
  });

  it("rejects unsupported languages explicitly", async () => {
    const response = await handleCodeExecutionRequest(postJson(JSON.stringify({ ...validRequest, language: "ruby" })));
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_LANGUAGE");
  });

  it("rejects over-sized bodies and source code", async () => {
    const oversizedBody = await handleCodeExecutionRequest(postJson(JSON.stringify({ sourceCode: "x".repeat(MAX_EXECUTION_REQUEST_BYTES) })));
    expect(oversizedBody.status).toBe(413);
    expect((await oversizedBody.json()).error.code).toBe("REQUEST_TOO_LARGE");

    const oversizedSource = await handleCodeExecutionRequest(postJson(JSON.stringify({ language: "javascript", sourceCode: "x".repeat(20_001) })));
    expect(oversizedSource.status).toBe(413);
    expect((await oversizedSource.json()).error.code).toBe("SOURCE_TOO_LARGE");
  });

  it("requires application/json", async () => {
    const response = await handleCodeExecutionRequest(new Request("http://localhost/api/code/run", { method: "POST", body: "{}" }));
    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("reports an unconfigured provider without fabricating an execution result", async () => {
    const response = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), null);
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("EXECUTION_PROVIDER_NOT_CONFIGURED");
  });

  it("maps provider timeouts, unavailability, and errors to safe API failures", async () => {
    const timeoutProvider: CodeExecutionProvider = {
      id: "slow-provider",
      execute: vi.fn((_request: CodeExecutionRequest, options: { signal: AbortSignal }) => new Promise<CodeExecutionResult>((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new CodeExecutionProviderError("timeout")), { once: true });
      })),
    };
    const timeout = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), timeoutProvider, 5);
    expect(timeout.status).toBe(504);
    expect((await timeout.json()).error.code).toBe("EXECUTION_PROVIDER_TIMEOUT");

    const unavailableProvider: CodeExecutionProvider = {
      id: "offline-provider",
      execute: vi.fn().mockRejectedValue(new CodeExecutionProviderError("unavailable", "private provider detail")),
    };
    const unavailable = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), unavailableProvider);
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.code).toBe("EXECUTION_PROVIDER_UNAVAILABLE");

    const failingProvider: CodeExecutionProvider = {
      id: "failing-provider",
      execute: vi.fn().mockRejectedValue(new CodeExecutionProviderError("provider-error", "secret-bearing detail")),
    };
    const failure = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), failingProvider);
    const failureBody = await failure.json();
    expect(failure.status).toBe(502);
    expect(failureBody.error.code).toBe("EXECUTION_PROVIDER_ERROR");
    expect(failureBody.error.message).not.toContain("secret-bearing");
  });

  it("preserves an actual provider's compile-error classification when supplied", async () => {
    const result: CodeExecutionResult = {
      status: "failed",
      failureKind: "compile-error",
      stdout: "",
      stderr: "Syntax error",
      provider: "mock-provider",
    };
    const response = await handleCodeExecutionRequest(postJson(JSON.stringify(validRequest)), mockProvider(result));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(result);
  });
});
