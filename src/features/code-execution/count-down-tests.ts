import type { CodeExecutionRequest, CodeExecutionResult } from "@/types/domain";
import { executeCode, DEFAULT_PROVIDER_TIMEOUT_MS } from "./orchestrator";
import type { CodeExecutionProvider, ExecutionOutcome } from "./contracts";

const RESULT_MARKER = "__SKILLPATH_HIDDEN_TESTS__";
const CASE_IDS = ["start-3", "start-1", "start-5", "start-0", "start-10"] as const;

export interface HiddenTestCaseResult {
  caseId: string;
  passed: boolean;
}

export interface CountDownTestResult {
  cases: HiddenTestCaseResult[];
  passed: number;
  total: number;
  verdict: "passed" | "failed";
}

export type CountDownExecutionOutcome =
  | { kind: "hidden-tests"; result: CountDownTestResult }
  | Exclude<ExecutionOutcome, { kind: "result" }>;

function buildCountDownHarness(language: CodeExecutionRequest["language"]): string {
  if (language === "python") {
    return `
import json
__skillpath_cases = [
    ("start-3", 3, [3, 2, 1]),
    ("start-1", 1, [1]),
    ("start-5", 5, [5, 4, 3, 2, 1]),
    ("start-0", 0, []),
    ("start-10", 10, None),
]
__skillpath_results = []
for __case_id, __start, __expected in __skillpath_cases:
    try:
        __actual = count_down(__start)
        __passed = isinstance(__actual, list)
        if __case_id == "start-10":
            __passed = __passed and len(__actual) == 10
        else:
            __passed = __passed and __actual == __expected
        __skillpath_results.append({"caseId": __case_id, "passed": __passed})
    except Exception:
        __skillpath_results.append({"caseId": __case_id, "passed": False})
print("${RESULT_MARKER}" + json.dumps(__skillpath_results, separators=(",", ":")))
`;
  }

  return `
const __skillpathCases = [
  ["start-3", 3, [3, 2, 1]],
  ["start-1", 1, [1]],
  ["start-5", 5, [5, 4, 3, 2, 1]],
  ["start-0", 0, []],
  ["start-10", 10, null],
];
const __skillpathResults = __skillpathCases.map(([caseId, start, expected]) => {
  try {
    const actual = ${language === "typescript" ? "countDown(start as number)" : "countDown(start)"};
    const passed = Array.isArray(actual) && (caseId === "start-10"
      ? actual.length === 10
      : JSON.stringify(actual) === JSON.stringify(expected));
    return { caseId, passed };
  } catch {
    return { caseId, passed: false };
  }
});
console.log("${RESULT_MARKER}" + JSON.stringify(__skillpathResults));
`;
}

function outputOf(result: CodeExecutionResult): string | null {
  if (result.output !== undefined) return result.output;
  if (result.stdout !== undefined) return result.stdout;
  return null;
}

export function parseCountDownTestOutput(output: string): CountDownTestResult | null {
  const resultLine = output
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith(RESULT_MARKER));
  if (!resultLine) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(resultLine.slice(RESULT_MARKER.length)) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== CASE_IDS.length) return null;

  const cases: HiddenTestCaseResult[] = [];
  for (let index = 0; index < CASE_IDS.length; index += 1) {
    const item: unknown = parsed[index];
    if (
      !item
      || typeof item !== "object"
      || (item as Record<string, unknown>).caseId !== CASE_IDS[index]
      || typeof (item as Record<string, unknown>).passed !== "boolean"
    ) {
      return null;
    }
    cases.push({
      caseId: CASE_IDS[index],
      passed: (item as Record<string, boolean | string>).passed as boolean,
    });
  }

  const passed = cases.filter((testCase) => testCase.passed).length;
  return {
    cases,
    passed,
    total: CASE_IDS.length,
    verdict: passed === CASE_IDS.length ? "passed" : "failed",
  };
}

export async function runCountDownHiddenTests(
  request: CodeExecutionRequest,
  provider?: CodeExecutionProvider | null,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<CountDownExecutionOutcome> {
  const harnessedRequest: CodeExecutionRequest = {
    language: request.language,
    sourceCode: `${request.sourceCode}\n${buildCountDownHarness(request.language)}`,
  };
  const outcome = await executeCode(harnessedRequest, provider, timeoutMs);
  if (outcome.kind !== "result") return outcome;
  if (outcome.result.status !== "completed") return { kind: "provider-error" };

  const output = outputOf(outcome.result);
  const result = output === null ? null : parseCountDownTestOutput(output);
  return result ? { kind: "hidden-tests", result } : { kind: "provider-error" };
}
