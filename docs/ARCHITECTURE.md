# SkillPath architecture

SkillPath uses a Next.js App Router application with TypeScript. UI lives under `src/app` and `src/components`; business logic is in framework independent feature modules. Route handlers validate requests, call feature logic, and return the shared API envelope from `src/types/api.ts`.

## Implemented structure

```text
src/
  app/
    api/assessments/{questions,submit}/route.ts
    api/code/run/route.ts
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
supabase/migrations/  # no persisted tables are needed by this demo slice
docs/
```

## Boundaries

- `features/adaptive-learning` owns the prerequisite graph, BKT update, and deterministic mission choice. It does not import React. The BKT parameters are illustrative and are not a validated learning model.
- `features/assessments` owns the private answer key and scoring. The question endpoint returns only prompts and choices; correctness is checked in the server route. Demo attempts are not persisted.
- `features/code-execution` owns bounded request parsing, validation, provider interface, timeout/error mapping, and orchestration. `lib/execution/jdoodle-provider.ts` implements the provider-independent interface with documented, pinned language mappings and combined-output semantics. `lib/execution/provider.ts` stays closed until authenticated access and distributed rate/quota controls are in place. Submitted code is never run by this app.
- `features/rag` searches a local JSON note set using deterministic keyword overlap. `features/ai-mentor` combines retrieved notes with a separate heuristic suggestion. No Gemini adapter is connected.
- `features/teacher-analytics` summarizes snapshots; the dashboard currently supplies an explicitly labelled sample cohort.
- `types/domain.ts` contains shared contracts for concepts, mastery, missions, assessments, execution, mentoring, replay signals, and viva. `types/api.ts` defines the standard response envelope.
- Supabase clients use the public anonymous key only. No service-role key is read by the app. Authentication and database persistence are not yet wired into the sample dashboards.

## Trust boundaries and persistence

Assessment scoring happens on the server, but it is still demo data and does not create a durable attempt record. The code route has a typed unavailable response until an external executor is configured. Any future JDoodle or Judge0 adapter must keep credentials server-side, impose execution and resource limits, and return provider results without executing source in a Next.js process. Do not send hidden tests or provider secrets to client bundles.

There is no migration yet: none of the implemented screens requires durable data. Before connecting persistence, agree on user, class, enrollment, concept mastery, and assessment attempt ownership; then add migrations with restrictive RLS and verify access policies using separate student and teacher identities.

## Next implementation boundaries

1. Add Supabase Auth flows and server-side role checks, then replace sample dashboard data with ownership-scoped queries.
2. Add a persistent assessment-attempt model and RLS tests.
3. Add an execution provider adapter after credentials, limits, timeouts, and failure cases are confirmed.
4. Add Gemini server integration behind the mentor provider contract and preserve the deterministic fallback.
5. Add event capture/replay and viva experiences only after consent, retention, and review behavior are specified.
