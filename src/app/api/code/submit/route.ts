import { runCountDownHiddenTests } from "@/features/code-execution";
import { updateMissionMasteryFromSubmission } from "@/features/code-execution/mastery";
import { getOrCreateLearnerId, getLearnerMastery, saveLearnerMastery } from "@/features/assessments/mastery-store";
import { apiFailure, apiSuccess } from "@/types/api";
import type { ConceptMastery } from "@/types/domain";
import { readBoundedJson } from "@/features/code-execution/handler";
import { validateCodeExecutionRequest } from "@/features/code-execution/validation";
import { getCodeExecutionProvider } from "@/lib/execution/provider";
import { persistenceErrorDetails } from "@/lib/persistence";

function executionFailure(kind: string): Response {
  switch (kind) {
    case "provider-not-configured":
      return Response.json(apiFailure("EXECUTION_PROVIDER_NOT_CONFIGURED", "Code execution is disabled. Configure Judge0 with JUDGE0_API_URL (and JUDGE0_API_KEY when required), or configure JDoodle server credentials."), { status: 503 });
    case "provider-misconfigured":
      return Response.json(apiFailure("EXECUTION_PROVIDER_MISCONFIGURED", "The execution provider is not configured correctly on the server."), { status: 503 });
    case "provider-quota-exhausted":
      return Response.json(apiFailure("EXECUTION_PROVIDER_QUOTA_EXHAUSTED", "The execution provider has reached its available run quota."), { status: 503 });
    case "provider-timeout":
      return Response.json(apiFailure("EXECUTION_PROVIDER_TIMEOUT", "The execution provider did not respond before the 12-second timeout."), { status: 504 });
    case "provider-unavailable":
      return Response.json(apiFailure("EXECUTION_PROVIDER_UNAVAILABLE", "The execution provider is temporarily unavailable."), { status: 503 });
    default:
      return Response.json(apiFailure("EXECUTION_PROVIDER_ERROR", "The execution provider could not run the hidden tests."), { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return Response.json(parsed.error, { status: parsed.status });

  const validation = validateCodeExecutionRequest(parsed.data);
  if (!validation.ok) {
    return Response.json(apiFailure(validation.code, validation.message), { status: validation.status });
  }

  const execution = await runCountDownHiddenTests(validation.data, getCodeExecutionProvider());
  if (execution.kind !== "hidden-tests") return executionFailure(execution.kind);

  const { result } = execution;
  let learnerId: string;
  let currentMastery: ConceptMastery[];
  try {
    learnerId = await getOrCreateLearnerId();
    currentMastery = await getLearnerMastery(learnerId) ?? [];
  } catch (error) {
    console.error("Could not load mastery for code submission.", error);
    const failure = persistenceErrorDetails(error, "MASTERY_PERSISTENCE_FAILED", "Hidden tests ran, but saved mastery could not be loaded.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }

  const mastery = updateMissionMasteryFromSubmission(currentMastery, result.passed / result.total >= 0.6);
  try {
    await saveLearnerMastery(learnerId, mastery);
  } catch (error) {
    console.error("Could not save mastery for code submission.", error);
    const failure = persistenceErrorDetails(error, "MASTERY_PERSISTENCE_FAILED", "Hidden tests ran, but mastery could not be saved.");
    return Response.json(apiFailure(failure.code, failure.message), { status: failure.status });
  }

  return Response.json(apiSuccess({ ...result, mastery }));
}
