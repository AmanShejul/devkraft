# API contracts

All routes return the shared envelope:

```ts
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } };
```

## Assessment questions

`GET /api/assessments/questions` returns `ApiResponse<AssessmentQuestion[]>`. It omits correct choice IDs and answer explanations.

## Assessment submission

`POST /api/assessments/submit`

```json
{ "answers": [{ "questionId": "variables-1", "choiceId": "c" }] }
```

The server validates the complete answer set and scores it against the private question bank. A success returns `AssessmentResult` with a `persistence: "demo"` marker. Invalid JSON or answers return HTTP 400. Results are not saved.

## Code execution

`POST /api/code/run`

```json
{ "language": "typescript", "sourceCode": "console.log(1)", "stdin": "" }
```

`problemId` is not required by the current app. Supported language identifiers are `typescript`, `javascript`, and `python`. Requests must use `application/json` and are limited to 32 KiB total, 20,000 source characters, and 5,000 standard-input characters.

With the checked-in configuration, a valid request currently receives this response; it is an unavailable state, not a simulated run:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
```

```json
{
  "ok": false,
  "error": {
    "code": "EXECUTION_PROVIDER_NOT_CONFIGURED",
    "message": "No code-execution provider is configured on the server."
  }
}
```

The backend includes a JDoodle adapter for `POST https://api.jdoodle.com/v1/execute`. It maps the app languages to pinned JDoodle language/version pairs: TypeScript 5.9.3 (`typescript`, index `1`), JavaScript on Node.js 25.8.1 (`nodejs`, index `7`), and Python 3.14.3 (`python3`, index `6`). These indices are positions in JDoodle's language list; verify the official [language reference](https://www.jdoodle.com/docs/api/languages) before changing a pin. JDoodle's documented REST request and response fields are in its [REST reference](https://www.jdoodle.com/docs/api/rest).

`CodeExecutionResult` supports either a combined `output` string or distinct `stdout`/`stderr` streams. The editor validates this shared contract and displays `output` as returned when present; it does not split combined text into streams. JDoodle returns combined output, so its adapter populates only `output`. It does not classify compiler diagnostics, runtime errors, or program timeouts from that text. For JDoodle, `status: "completed"` means the provider returned a final response; it does not mean the code compiled, passed tests, or was correct. The adapter does not set `failureKind` or `durationMs`, and this API does not return test results. An empty output string is a valid result and is shown as “Provider returned no output.”

Successful synchronous execution returns `ApiResponse<CodeExecutionResult>` with HTTP 200. A different provider may return a queued result with HTTP 202. The JDoodle response body is limited to 64 KiB by this application; an oversized or malformed upstream response produces a sanitized provider error. The 12-second SkillPath deadline is an upstream request deadline, distinct from JDoodle's program-timeout diagnostic in combined output.

| HTTP | Error code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON`, `INVALID_EXECUTION_REQUEST`, `SOURCE_REQUIRED`, `INVALID_STDIN` | Malformed JSON or required fields are invalid. |
| 413 | `REQUEST_TOO_LARGE`, `SOURCE_TOO_LARGE`, `STDIN_TOO_LARGE` | Request/source/input exceeds its bound. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Request is not `application/json`. |
| 422 | `UNSUPPORTED_LANGUAGE` | Language is not TypeScript, JavaScript, or Python. |
| 502 | `EXECUTION_PROVIDER_ERROR` | Provider response was malformed/oversized or the provider returned an unexpected failure; internal details are not returned. |
| 503 | `EXECUTION_PROVIDER_NOT_CONFIGURED`, `EXECUTION_PROVIDER_UNAVAILABLE`, `EXECUTION_PROVIDER_MISCONFIGURED`, `EXECUTION_PROVIDER_QUOTA_EXHAUSTED` | No adapter is available, the provider is unavailable, credentials were rejected, or the provider account exhausted its credits. |
| 504 | `EXECUTION_PROVIDER_TIMEOUT` | Provider did not respond within the 12-second server deadline. |

The adapter reads `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` only on the server and forwards the provider signal to fetch. The configured-provider factory intentionally still returns `null`: the current route has no authenticated access check or distributed rate limiter, so credentials must not enable billable public execution yet. No code runs in this app. Before enabling the factory, implement Supabase session authorization and deployment-appropriate distributed rate/quota controls. JDoodle documents HTTP 401 for rejected credentials and HTTP 429 for exhausted daily credits; SkillPath maps these to sanitized 503 errors. See JDoodle's [error and timeout guidance](https://www.jdoodle.com/docs/api/errors) and [credit policy](https://www.jdoodle.com/docs/api/credits).

## Mentor hint

`POST /api/mentor/hint`

```json
{ "query": "Why does my loop stop early?", "conceptId": "loops" }
```

Returns retrieved local notes and a separate deterministic heuristic suggestion. `generatedExplanationAvailable` is false. Requests must contain a non-empty query no longer than 2,000 characters.

## Shared domain types

See `src/types/domain.ts` for assessment attempts/results, concept/prerequisite and mastery models, missions, execution requests/results, mentor and likely-mistake explanations, session events/integrity signals, and viva question/evaluation contracts. Teacher summaries use `src/features/teacher-analytics/summary.ts`.
