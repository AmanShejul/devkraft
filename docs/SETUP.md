# Local setup
- **Local Python Run:** Selecting Python and pressing **Run** uses a browser Web Worker with a pinned Pyodide runtime, so a Python run does not require Judge0, JDoodle, or Vercel configuration. The first run downloads the runtime from the versioned Pyodide CDN URL and may take a few seconds; subsequent runs reuse the worker. Python **Submit**, hidden tests, and mastery persistence continue using the server execution path.
## Requirements

- Node.js 20.9 or newer (Node 24 is used in the current development environment).
- npm. The repository uses `package-lock.json` once dependencies are installed.

## Run the app

```sh
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, copy `.env.example` to `.env.local` with `Copy-Item .env.example .env.local`.

The app runs in local development mode without any environment variables. Open `/`, then explore `/student`, `/teacher`, `/assessment`, and `/arena`. Workspaces start empty and populate only after you create or complete activity.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Optional integrations

- **Supabase:** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in the production environment for durable data and teacher/authenticated workflows. Apply migrations in filename order, including `20261016000000_create_learner_mastery.sql`, `20261016010000_create_learner_viva_attempts.sql`, `20261017000000_create_grounded_quizzes.sql`, `20261017000001_allow_authenticated_mastery.sql`, `20261017000002_add_visual_explanations.sql`, `20261017000003_allow_authenticated_viva_attempts.sql`, and `20261018000000_student_learning_workflow.sql`. The student login is intentionally demo-only: any non-empty email/name and password works, no password is stored, and the student page redirects immediately. Local JSON data used by this demo is not durable on serverless hosts. Teacher sign-in still uses its configured authentication path. Never put a service-role key in a `NEXT_PUBLIC_` variable.
- **Teacher question workflow:** Run the Supabase migrations and set the server-only `SUPABASE_SERVICE_ROLE_KEY` for production grading. To use local Ollama, run `ollama pull llama3.2:latest` and keep the Ollama server running. `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`; `OLLAMA_MODEL` defaults to `llama3.2:latest`; `OLLAMA_TIMEOUT_MS` defaults to 90000 and is capped at 180000; `OLLAMA_MAX_OUTPUT_TOKENS` defaults to 8192 and is capped at 12000. The URL is resolved by the Next.js server, so `http://localhost:11434` works only when Next.js and Ollama run on the same machine; Docker may need `http://host.docker.internal:11434` or the Ollama service name. Vercel cannot reach a loopback URL on your computer: configure a reachable secured HTTPS Ollama endpoint in Vercel, or configure Gemini there. In the teacher studio, select **Local Ollama** to bypass Gemini, **Gemini only** to require Gemini, or **Automatic** to try Gemini first and fall back to Ollama on provider or validation failures. Text/notes and text-based PDFs are extracted locally and can use Ollama without Gemini. Scanned PDFs need OCR; select Gemini mode with `GEMINI_API_KEY`, or OCR/export the PDF before selecting local Ollama. PowerPoint extraction still requires `GEMINI_API_KEY`. These provider settings are server-only. Questions that need a source check remain drafts until teacher review; answer keys stay server-side. Without Supabase, records use `.data/teacher-portal/state.json` for local development.
- **Ollama diagnostic:** In PowerShell, run `$env:RUN_OLLAMA_LIVE_TESTS = "1"; npm test -- tests/ollama-live.test.ts; Remove-Item Env:RUN_OLLAMA_LIVE_TESTS`. This sends hardcoded BFS text directly to Ollama and validates its JSON without involving PDF extraction.
- **Code execution:** Configure either Judge0 or JDoodle. Judge0 takes precedence when `JUDGE0_API_URL` is set; add `JUDGE0_API_KEY` when the instance requires the `X-Auth-Token` header. Otherwise, set `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET`, and `JDOODLE_EXECUTION_ENABLED=true`. These values are server-only. Both providers execute submitted code remotely; use a secured, rate-limited provider endpoint for Vercel and do not expose credentials to the browser. The API enforces a 12-second timeout and bounded request/response sizes. Restart Next.js locally or redeploy Vercel after changing the variables.
- **Local Python Run:** Selecting Python and pressing **Run** uses a browser Web Worker with a pinned Pyodide runtime, so a Python run does not require Judge0, JDoodle, or Vercel configuration. The first run downloads the runtime from the versioned Pyodide CDN URL and may take a few seconds; subsequent runs reuse the worker. Python **Submit**, hidden tests, and mastery persistence continue using the server execution path.
- **Gemini:** `GEMINI_API_KEY` is read only by `/api/teacher/questions`. Gemini handles scanned PDF/PPTX understanding and is the primary question generator when configured. Text-based PDFs are extracted locally first. The mentor still uses local notes plus deterministic heuristics.

Never commit `.env.local` or copy real secrets into `.env.example`.
