import { describe, expect, it, vi } from "vitest";
import { CodeExecutionProviderError, type CodeExecutionProvider } from "@/features/code-execution/contracts";
import { parseCountDownTestOutput, runCountDownHiddenTests } from "@/features/code-execution/count-down-tests";
import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";

const marker = "__SKILLPATH_HIDDEN_TESTS__";
const passingCases = [
  { caseId: "start-3", passed: true },
  { caseId: "start-1", passed: true },
  { caseId: "start-5", passed: true },
  { caseId: "start-0", passed: true },
  { caseId: "start-10", passed: true },
];

function providerWithOutput(output: string): CodeExecutionProvider {
  return {
    id: "mock-provider",
    execute: vi.fn().mockResolvedValue({ status: "completed", output, provider: "mock-provider" }),
  };
}

describe("countDown hidden tests", () => {
  it.each([
    ["typescript", "function countDown(start: number): number[] { return []; }"],
    ["javascript", "function countDown(start) { return []; }"],
    ["python", "def count_down(start):\n    return []"],
  ] as const)("builds a hidden-test execution harness for %s", async (language, sourceCode) => {
    const provider = providerWithOutput(`${marker}${JSON.stringify(passingCases)}\n`);
    const request: CodeExecutionRequest = { language, sourceCode };
    const result = await runCountDownHiddenTests(request, provider);

    expect(result).toEqual({
      kind: "hidden-tests",
      result: { cases: passingCases, passed: 5, total: 5, verdict: "passed" },
    });
    const executedRequest = vi.mocked(provider.execute).mock.calls[0][0];
    expect(executedRequest.sourceCode).toContain(sourceCode);
    expect(executedRequest.sourceCode).toContain("start-10");
    expect(executedRequest.sourceCode).toContain(language === "python" ? "count_down(__start)" : "countDown(");
  });

  it("counts failures and rejects malformed or incomplete harness output", () => {
    const failingOutput = `${marker}${JSON.stringify(passingCases.map((item, index) => ({ ...item, passed: index < 3 })))}\n`;
    expect(parseCountDownTestOutput(failingOutput)).toMatchObject({ passed: 3, total: 5, verdict: "failed" });
    expect(parseCountDownTestOutput(`${marker}not-json`)).toBeNull();
    expect(parseCountDownTestOutput(`${marker}[]`)).toBeNull();
  });

  it("reports a bounded timeout for hostile top-level code", async () => {
    const provider: CodeExecutionProvider = {
      id: "slow-provider",
      execute: vi.fn((_request: CodeExecutionRequest, options: { signal: AbortSignal }) => new Promise<CodeExecutionResult>((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new CodeExecutionProviderError("timeout")), { once: true });
      })),
    };
    const request: CodeExecutionRequest = { language: "javascript", sourceCode: "while (true) {}" };

    await expect(runCountDownHiddenTests(request, provider, 5)).resolves.toEqual({ kind: "provider-timeout" });
    expect(vi.mocked(provider.execute).mock.calls[0][0].sourceCode).toContain("while (true) {}");
  });
});
