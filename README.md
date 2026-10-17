# SkillPath

**Your Skills. Your Path. Your Progress.**

SkillPath is an adaptive coding-learning workspace for students and teachers. The workspace shows only saved learner and teacher activity; empty states are used until real activity is recorded.

## What works

- Responsive landing page with student, teacher, assessment, and coding arena navigation.
- Student dashboard with saved concept estimates and a deterministic next-mission recommendation when progress exists.
- Teacher assignment workspace with saved drafts, review, publishing, and honest empty analytics states.
- Server-served assessment questions and server-validated scoring with per-concept BKT mastery saved for an anonymous browser learner.
- Monaco code editor with TypeScript, JavaScript, and Python starter snippets. The arena can run visible samples and five hidden `countDown` cases through an explicitly enabled JDoodle provider; submissions update loops mastery.
- Arena attempts keep an event timeline in browser local storage and show a replay scrubber with integrity signals explicitly flagged for human review.
- Passing the arena hidden tests reveals an explanation viva generated from the submitted identifiers; heuristic answers update loops mastery without sending source to an external API.
- Local concept-note keyword retrieval and separate deterministic mentor heuristics. No generated explanation is connected.
- Typed domain and API contracts, Supabase SSR/browser client helpers, and adaptive-learning unit tests.

Local development can run without Supabase. No sample learner, class, assignment, or activity records are created automatically. Assessment mastery is saved to `.data/learner-mastery/` only after a local learner completes activity.

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

- Supabase credentials are optional. When configured, assessment mastery uses the `learner_mastery` table defined in `supabase/migrations/20261016000000_create_learner_mastery.sql`; otherwise the server writes only user-created records under the ignored `.data/` directory. The anonymous learner cookie is a local development identity, not authentication.
- JDoodle execution is disabled unless `JDOODLE_EXECUTION_ENABLED=true` and server-side credentials are present. This opts the public demo routes into potentially billable code execution; add authentication and deployment-backed rate/quota controls before enabling it on an internet-facing deployment. Judge0 remains optional and must be verified before use.
- Teacher PDF/TXT/Markdown/CSV uploads use server-only Gemini document understanding plus keyword RAG. Generated questions are Zod-validated, source-linked, saved as drafts, and publishable only after review. Supabase deployments need `GEMINI_API_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY` for authoritative grading; without Supabase, the same workflow persists to ignored `.data/teacher-portal/state.json` for local development.
- Teacher notes can be pasted or uploaded as TXT, Markdown, PDF, or PPTX; every source uses the grounded Gemini route. Published assignments can also carry a validated visual explanation that appears as a diagram on `/learn`.
- RAG is keyword retrieval in this first version, not embeddings or a vector database. Fine-tuning is intentionally not used: teacher material changes per course and retrieval provides the grounding boundary.
- Session replay, code viva, persistent analytics, and validated adaptive-model parameters remain future work.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md), [docs/SETUP.md](docs/SETUP.md), and [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md).
