# SkillPath

**Your Skills. Your Path. Your Progress.**

SkillPath is an adaptive coding-learning workspace for students and teachers. This repository now contains a responsive Next.js foundation and a first working demo slice that is explicit about sample data and unconnected services.

## What works

- Responsive landing page with student, teacher, assessment, and coding arena navigation.
- Student demo dashboard with concept estimates, recent activity, and a deterministic next-mission recommendation.
- Teacher demo dashboard with summary calculations, concept weaknesses, and sample learner progress.
- Server-served assessment questions and server-validated scoring with per-concept BKT mastery saved for an anonymous browser learner.
- Monaco code editor with TypeScript, JavaScript, and Python starter snippets. The arena can run visible samples and five hidden `countDown` cases through an explicitly enabled JDoodle provider; submissions update loops mastery.
- Arena attempts keep an event timeline in browser local storage and show a replay scrubber with integrity signals explicitly flagged for human review.
- Passing the arena hidden tests reveals an explanation viva generated from the submitted identifiers; heuristic answers update loops mastery without sending source to an external API.
- Local concept-note keyword retrieval and separate deterministic mentor heuristics. No generated explanation is connected.
- Typed domain and API contracts, Supabase SSR/browser client helpers, and adaptive-learning unit tests.

Demo dashboards and assessments do not require credentials. Sample teacher records and first-visit student progress are not authenticated data. Assessment mastery is saved to `.data/learner-mastery/` when Supabase is not configured.

## Start locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`. On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Integrations and planned work

- Supabase credentials are optional. When configured, assessment mastery uses the `learner_mastery` table defined in `supabase/migrations/20261016000000_create_learner_mastery.sql`; otherwise the server writes JSON files under the ignored `.data/` directory. The anonymous learner cookie is a demo identity, not authentication.
- JDoodle execution is disabled unless `JDOODLE_EXECUTION_ENABLED=true` and server-side credentials are present. This opts the public demo routes into potentially billable code execution; add authentication and deployment-backed rate/quota controls before enabling it on an internet-facing deployment. Judge0 remains optional and must be verified before use.
- Gemini is not connected. The mentor uses local notes and deterministic suggestions; set up a server-only integration before claiming generated explanations.
- Session replay, code viva, persistent analytics, and validated adaptive-model parameters remain future work.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md), [docs/SETUP.md](docs/SETUP.md), and [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md).
