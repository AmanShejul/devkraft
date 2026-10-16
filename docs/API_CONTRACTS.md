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

Success returns `ApiResponse<CodeExecutionResult>` with HTTP 200. A queued provider response uses HTTP 202. `CodeExecutionResult` contains the provider's `status`, `stdout`, `stderr`, optional `durationMs`, and provider ID. A provider may set `failureKind` to `compile-error`, `runtime-error`, or `timeout` when it can reliably classify that result. Test results are not included because the app has no configured problem test harness. The API does not infer that an answer passed tests from stdout.

| HTTP | Error code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON`, `INVALID_EXECUTION_REQUEST`, `SOURCE_REQUIRED`, `INVALID_STDIN` | Malformed JSON or required fields are invalid. |
| 413 | `REQUEST_TOO_LARGE`, `SOURCE_TOO_LARGE`, `STDIN_TOO_LARGE` | Request/source/input exceeds its bound. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Request is not `application/json`. |
| 422 | `UNSUPPORTED_LANGUAGE` | Language is not TypeScript, JavaScript, or Python. |
| 502 | `EXECUTION_PROVIDER_ERROR` | Provider failed; internal provider details are not returned. |
| 503 | `EXECUTION_PROVIDER_NOT_CONFIGURED`, `EXECUTION_PROVIDER_UNAVAILABLE` | No adapter is configured or the provider is unavailable. |
| 504 | `EXECUTION_PROVIDER_TIMEOUT` | Provider did not respond within the 12-second server deadline. |

The checked-in provider factory returns `null`, so the current route responds with `EXECUTION_PROVIDER_NOT_CONFIGURED` and never executes source itself. Before enabling a provider, implement a server-only adapter that conforms to `CodeExecutionProvider`, honors the abort signal, and maps only statuses the provider actually returns. Add authenticated access and deployment-appropriate rate/quota controls before connecting paid execution. `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` are placeholders for a future JDoodle adapter; no provider API endpoint or payload is assumed here.

## Mentor hint

`POST /api/mentor/hint`

```json
{ "query": "Why does my loop stop early?", "conceptId": "loops" }
```

Returns retrieved local notes and a separate deterministic heuristic suggestion. `generatedExplanationAvailable` is false. Requests must contain a non-empty query no longer than 2,000 characters.

## Shared domain types

See `src/types/domain.ts` for assessment attempts/results, concept/prerequisite and mastery models, missions, execution requests/results, mentor and likely-mistake explanations, session events/integrity signals, and viva question/evaluation contracts. Teacher summaries use `src/features/teacher-analytics/summary.ts`.
