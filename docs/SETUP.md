# Local setup

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

- **Supabase:** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in the production environment. Enable email/password auth in Supabase. Student and teacher sign-in are available at `/login/student` and `/login/teacher`. Assign the trusted `app_metadata.roles` array (`["student"]` or `["teacher"]`) to each user from a trusted admin environment; never let the client set teacher roles. Apply migrations in filename order, including `20261016000000_create_learner_mastery.sql`, `20261016010000_create_learner_viva_attempts.sql`, `20261017000000_create_grounded_quizzes.sql`, `20261017000001_allow_authenticated_mastery.sql`, `20261017000002_add_visual_explanations.sql`, `20261017000003_allow_authenticated_viva_attempts.sql`, and `20261018000000_student_learning_workflow.sql`. Without Supabase, local development access remains available and starts with empty workspaces; production refuses to use local JSON as durable storage. Never put a service-role key in a `NEXT_PUBLIC_` variable.
- **Teacher question workflow:** Run the Supabase migrations and set the server-only `SUPABASE_SERVICE_ROLE_KEY` for production grading. To use local Ollama, run `ollama pull llama3.2:latest` and keep the Ollama server running. `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`; `OLLAMA_MODEL` defaults to `llama3.2:latest`; `OLLAMA_TIMEOUT_MS` defaults to 90000 and is capped at 180000. The URL is resolved by the Next.js server, so `http://localhost:11434` works only when Next.js and Ollama run on the same machine; Docker may need `http://host.docker.internal:11434` or the Ollama service name. In the teacher studio, select **Local Ollama** to bypass Gemini, **Gemini only** to require Gemini, or **Automatic** to try Gemini first and fall back to Ollama on provider or validation failures. Text/notes and text-based PDFs are extracted locally and can use Ollama without Gemini. Scanned PDFs need OCR; select Gemini mode with `GEMINI_API_KEY`, or OCR/export the PDF before selecting local Ollama. PowerPoint extraction still requires `GEMINI_API_KEY`. These provider settings are server-only. Questions remain drafts until teacher review; answer keys stay server-side. Without Supabase, records use `.data/teacher-portal/state.json` for local development.
- **Ollama diagnostic:** In PowerShell, run `$env:RUN_OLLAMA_LIVE_TESTS = "1"; npm test -- tests/ollama-live.test.ts; Remove-Item Env:RUN_OLLAMA_LIVE_TESTS`. This sends hardcoded BFS text directly to Ollama and validates its JSON without involving PDF extraction.
- **Code execution:** JDoodle execution stays disabled by default. To opt in locally, set `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET`, and `JDOODLE_EXECUTION_ENABLED=true` in `.env.local`, then restart Next.js. Credentials are server-only. Enabling the flag permits unauthenticated public requests to execute arbitrary submitted code and may incur provider charges; use only in a controlled demo until authentication and deployment-backed rate/quota limits are added. The API enforces a 12-second timeout and bounded request/response sizes. Judge0 is optional and requires a verified endpoint before adding `JUDGE0_API_URL`/`JUDGE0_API_KEY`.
- **Gemini:** `GEMINI_API_KEY` is read only by `/api/teacher/questions`. Gemini handles scanned PDF/PPTX understanding and is the primary question generator when configured. Text-based PDFs are extracted locally first. The mentor still uses local notes plus deterministic heuristics.

Never commit `.env.local` or copy real secrets into `.env.example`.
