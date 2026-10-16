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
    assessments/  coding/  layout/  learning/  student/  teacher/  ui/
  config/learning.ts
  data/concepts/notes.json  demo-class.ts  demo-learning.ts
  features/
    adaptive-learning/  ai-mentor/  assessments/  code-execution/
    rag/  teacher-analytics/
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
- `features/rag` searches a local JSON note set using deterministic keyword overlap. `features/ai-mentor` combines retrieved notes with a separate heuristic suggestion. No Gemini adapter is connected.
- `features/teacher-analytics` summarizes snapshots; the dashboard currently supplies an explicitly labelled sample cohort.
- `types/domain.ts` contains shared contracts for concepts, mastery, missions, assessments, execution, mentoring, replay signals, and viva. `types/api.ts` defines the standard response envelope.
- Supabase clients use the public anonymous key only. No service-role key is read by the app. The learner mastery table is scoped by the cookie learner UUID in a request header; this demo identity is not authentication and must not be used to protect sensitive data.

## Trust boundaries and persistence

Assessment scoring and mastery updates happen on the server. The mastery probabilities are illustrative and no assessment-attempt history is retained. Supabase mastery persistence requires the checked-in migrations; without Supabase configuration, mastery and viva-attempt claims are written to local ignored JSON files. Arena execution sends submitted source to JDoodle only after explicit server-side opt-in and applies a 12-second request timeout. Do not enable public execution for an internet-facing deployment until authenticated access and deployment-backed rate/quota controls are implemented. Credentials and hidden test definitions stay server-side.

The mastery migration enables RLS and limits anonymous row access to the learner UUID sent by the server. This is only a demo-level partitioning mechanism: a user who can forge the anonymous learner ID is not authenticated. Add real Supabase Auth and ownership-based RLS before treating learner records as private or connecting teacher/student identities.

## Next implementation boundaries

1. Add Supabase Auth flows and server-side role checks, then replace sample dashboard data with ownership-scoped queries.
2. Add a persistent assessment-attempt model and RLS tests.
3. Add authenticated access and deployment-backed rate/quota limits before enabling JDoodle execution outside a controlled demo.
4. Add Gemini server integration behind the mentor provider contract and preserve the deterministic fallback.
5. Add event capture/replay and viva experiences only after consent, retention, and review behavior are specified.
