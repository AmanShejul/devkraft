# Team workflow

## Initial ownership areas

| Owner | Primary ownership |
| --- | --- |
| Aman — Frontend and integration | `src/app/`, `src/components/` |
| Swapnil — Backend and execution | `src/app/api/`, `src/features/code-execution/`, `src/lib/execution/` |
| Pankaj — Assessments, adaptive missions and QA | `src/features/assessments/`, `src/features/adaptive-learning/`, related tests |
| Yash — AI mentor, RAG and viva | `src/features/ai-mentor/`, `src/features/rag/`, `src/features/code-viva/` |

These are coordination areas, not an automatic branch or merge plan. The current working tree remains on its existing branch.

## Coordination rules

- Create a feature branch from the agreed integration base for each focused change. Do not push directly to shared branches.
- Keep pull requests small enough for a teammate to review. Merge only after the owner and one reviewer agree on behavior and checks.
- Coordinate shared files (`src/types/domain.ts`, `src/types/api.ts`, `src/app/layout.tsx`, `package.json`, and common component styles) before editing them. Agree on the contract first; avoid overlapping edits.
- Feature modules own business rules and types. Keep them independent of React. Route handlers validate input, perform authorization when auth exists, call feature logic, and return the standard API envelope.
- Update `docs/API_CONTRACTS.md` when a route or shared request/result type changes. Never expose answer keys, hidden tests, service-role credentials, Gemini keys, or execution credentials to the browser.
- Every feature pull request should state demo versus connected behavior, configuration needed, and how a reviewer can exercise it. Add or update unit tests for business logic; run lint, typecheck, relevant tests, and a production build before integration.

## Integration checkpoints

1. **Contracts:** agree on shared domain types, API envelopes, auth ownership, and error behavior before parallel implementation.
2. **Feature review:** merge one small feature at a time after its independent checks pass.
3. **End-to-end integration:** verify student and teacher routes, assessment question/submit flow, execution-provider unavailable state, and mentor fallback from a clean install.
4. **Credentialed demo:** only after a separate review, configure test Supabase/provider credentials and verify role access, RLS, provider limits, and failure paths. Keep all credentials out of Git.
