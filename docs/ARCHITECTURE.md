# SkillPath architecture

SkillPath uses a Next.js App Router application with TypeScript. UI lives under `src/app` and `src/components`; business logic is in framework independent feature modules. Route handlers validate requests, call feature logic, and return the shared API envelope from `src/types/api.ts`.

## Implemented structure

```text
src/
  app/
    api/assessments/{questions,submit}/route.ts
    api/code/{run,submit}/route.ts
    api/viva/evaluate/route.ts
    api/mentor/hint/route.ts
    {arena,assessment,student,teacher}/page.tsx
    globals.css  layout.tsx  page.tsx
  components/
    assessments/  auth/  coding/  layout/  learning/  student/  teacher/  ui/
  config/learning.ts
  data/concepts/notes.json  learning.ts
  features/
    adaptive-learning/  ai-mentor/  assessments/  code-execution/
    rag/  teacher-analytics/  teacher-portal/
  lib/
    auth/  execution/  supabase/
  types/{api,domain}.ts
tests/adaptive-learning.test.ts
supabase/migrations/  # learner mastery persistence
docs/
```

## Boundaries

- `features/adaptive-learning` owns the prerequisite graph, BKT update, and deterministic mission choice. It does not import React. The BKT parameters are illustrative and are not a validated learning model.
- `features/assessments` owns the private answer key, scoring, per-answer BKT updates, and mastery persistence. The question endpoint returns only prompts and choices. Assessment mastery is keyed by an anonymous HTTP-only learner cookie and stored in Supabase or the ignored local `.data/` directory.
- `features/code-execution` owns bounded request parsing, validation, provider interface, timeout/error mapping, orchestration, and the language-specific hidden `countDown` harness. `features/integrity` derives review signals from the exact shared session-event contracts. The arena records event metadata in browser memory and local storage; replay signals are evidence for human review, not verdicts. `lib/execution/jdoodle-provider.ts` implements the provider-independent interface with documented, pinned language mappings and combined-output semantics. The `JDOODLE_EXECUTION_ENABLED=true` server flag opts into provider execution; since routes currently lack authentication and distributed rate/quota controls, this is suitable only for controlled demos.
- `features/viva` generates questions from the submitted loop condition, parameter, return expression, and accumulator identifier, and evaluates explanations locally. The arena reveals viva questions on Submit regardless of hidden-test results or provider availability, so learners can still explain a solution when billable execution is disabled. Its `VivaEvaluation.evaluatedBy` remains `heuristic`; the viva route does not send learner source to Gemini or any external API. Viva mastery is counted once per learner and mission, with a unique Supabase claim or atomic local-file claim.
- `features/rag` searches a local JSON note set using deterministic keyword overlap. `features/ai-mentor` combines retrieved notes with a separate heuristic suggestion. Teacher uploads use Gemini only from server routes; Gemini is not used for mentor answers.
- `features/teacher-analytics` summarizes authorized learner snapshots; the dashboard stays empty until those snapshots exist.
- `features/teacher-portal` owns document ingestion, topic-aware chunks, keyword retrieval, validated question and visual-guide generation, server persistence, review state, deterministic scoring, and attempt idempotency. The question API tries Gemini first and Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) when Gemini is unavailable or fails output/grounding validation. PDFs/PPTX still require Gemini for document extraction; text documents are chunked locally and can use Ollama alone. Local development persists user-created records to ignored server files under `.data/teacher-portal`; Supabase mode uses the quiz/document tables and RLS policies.
- `lib/auth` provides Supabase email/password role checks for the student and teacher workspaces when Supabase is configured. Without Supabase, local development access is available and assignment data remains on the local server.
- `types/domain.ts` contains shared contracts for concepts, mastery, missions, assessments, execution, mentoring, replay signals, and viva. `types/api.ts` defines the standard response envelope.
- Supabase browser access uses the public key. Authoritative quiz grading uses the server-only `SUPABASE_SERVICE_ROLE_KEY`, because student RLS must never expose answer keys. Student-facing responses omit answer keys and private source excerpts.

## Trust boundaries and persistence

Assessment and teacher-quiz scoring and mastery updates happen on the server. The mastery probabilities are illustrative; quiz attempts and responses are retained in Supabase or the demo server file. Arena execution sends submitted source to JDoodle only after explicit server-side opt-in and applies a 12-second request timeout. Do not enable public execution for an internet-facing deployment until authenticated access and deployment-backed rate/quota controls are implemented. Credentials and hidden test definitions stay server-side.

The mastery migration enables RLS and limits anonymous demo access to the learner UUID sent by the server; authenticated learners use `auth.uid()`. Supabase quiz data is owner-scoped for teachers, availability-scoped for students, and answer keys live in a teacher-only table. The demo fallback is not a substitute for production identity management.

## Next implementation boundaries

1. Add class/roster targeting when the product has a real class membership model.
2. Add an authenticated storage bucket if retaining original PDF binaries is required; the initial path stores extracted private chunks only.
3. Provision and verify student/teacher identities with authenticated ownership-scoped workspace queries.
4. Add authenticated access and deployment-backed rate/quota limits before enabling JDoodle execution outside a controlled demo.
5. Evaluate embeddings only after keyword retrieval quality is measured on real course material; fine-tuning is not appropriate for changing teacher notes.
