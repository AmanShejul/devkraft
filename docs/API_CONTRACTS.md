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

Supported language identifiers are `typescript`, `javascript`, and `python`. Source and input lengths are bounded. The current route returns HTTP 503 with `EXECUTION_PROVIDER_NOT_CONFIGURED`; it does not run source code. Once configured, successes will return `CodeExecutionResult` from the provider adapter.

## Mentor hint

`POST /api/mentor/hint`

```json
{ "query": "Why does my loop stop early?", "conceptId": "loops" }
```

Returns retrieved local notes and a separate deterministic heuristic suggestion. `generatedExplanationAvailable` is false. Requests must contain a non-empty query no longer than 2,000 characters.

## Shared domain types

See `src/types/domain.ts` for assessment attempts/results, concept/prerequisite and mastery models, missions, execution requests/results, mentor and likely-mistake explanations, session events/integrity signals, and viva question/evaluation contracts. Teacher summaries use `src/features/teacher-analytics/summary.ts`.
