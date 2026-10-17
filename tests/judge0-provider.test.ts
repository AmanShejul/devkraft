import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeExecutionProviderError } from "@/features/code-execution/contracts";
import { JUDGE0_LANGUAGE_IDS, Judge0CodeExecutionProvider } from "@/lib/execution/judge0-provider";
import { getCodeExecutionProvider } from "@/lib/execution/provider";
import type { CodeExecutionRequest } from "@/types/domain";

const request: CodeExecutionRequest = { language: "javascript", sourceCode: "console.log(42)", stdin: "" };

afterEach(() => vi.unstubAllEnvs());

describe("Judge0 execution provider", () => {
  it("creates and polls a submission using the server-side token", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "submission-token" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ status: { id: 2, description: "Processing" } }))
      .mockResolvedValueOnce(Response.json({ status: { id: 3, description: "Accepted" }, stdout: "42\n", stderr: null, time: "0.01" }));
    const provider = new Judge0CodeExecutionProvider({ apiUrl: "https://judge0.test", apiKey: "secret" }, fetchMock);

    const result = await provider.execute(request, { signal: new AbortController().signal });
    const createCall = fetchMock.mock.calls[0];
    const createBody = JSON.parse(String(createCall[1]?.body)) as { source_code: string; language_id: number; stdin: string };

    expect(result).toEqual({ status: "completed", stdout: "42\n", stderr: "", durationMs: 10, provider: "judge0" });
    expect(createCall[0]).toBe("https://judge0.test/submissions/?base64_encoded=false&wait=false");
    expect(createCall[1]?.headers).toEqual({ "Content-Type": "application/json", "X-Auth-Token": "secret" });
    expect(createBody).toEqual({ source_code: request.sourceCode, language_id: JUDGE0_LANGUAGE_IDS.javascript, stdin: "" });
    expect(fetchMock.mock.calls[2][0]).toContain("/submissions/submission-token?");
  });

  it("maps Judge0 compilation errors into the shared result contract", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "submission-token" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ status: { id: 6, description: "Compilation Error" }, compile_output: "syntax error" }));
    const provider = new Judge0CodeExecutionProvider({ apiUrl: "https://judge0.test" }, fetchMock);

    await expect(provider.execute({ ...request, language: "typescript" }, { signal: new AbortController().signal })).resolves.toMatchObject({
      status: "failed",
      failureKind: "compile-error",
      stderr: "syntax error",
      provider: "judge0",
    });
  });

  it("sanitizes Judge0 authentication failures", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("private error", { status: 401 }));
    const provider = new Judge0CodeExecutionProvider({ apiUrl: "https://judge0.test", apiKey: "bad" }, fetchMock);

    await expect(provider.execute(request, { signal: new AbortController().signal })).rejects.toMatchObject({ kind: "misconfigured" } satisfies Partial<CodeExecutionProviderError>);
  });

  it("selects Judge0 when its endpoint is configured", () => {
    vi.stubEnv("JUDGE0_API_URL", "https://judge0.test");
    vi.stubEnv("JUDGE0_API_KEY", "test-key");
    vi.stubEnv("JDOODLE_EXECUTION_ENABLED", "false");
    expect(getCodeExecutionProvider()).toMatchObject({ id: "judge0" });
  });
});
