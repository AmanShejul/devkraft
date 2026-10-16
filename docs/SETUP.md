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

The app runs in demo mode without any environment variables. Open `/`, then explore `/student`, `/teacher`, `/assessment`, and `/arena`.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Optional integrations

- **Supabase:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the SSR/browser client helpers. Assessment and arena mastery use the `learner_mastery` migration; the current app does not authenticate learners. Never put a service-role key in a `NEXT_PUBLIC_` variable.
- **Code execution:** JDoodle execution stays disabled by default. To opt in locally, set `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET`, and `JDOODLE_EXECUTION_ENABLED=true` in `.env.local`, then restart Next.js. Credentials are server-only. Enabling the flag permits unauthenticated public requests to execute arbitrary submitted code and may incur provider charges; use only in a controlled demo until authentication and deployment-backed rate/quota limits are added. The API enforces a 12-second timeout and bounded request/response sizes. Judge0 is optional and requires a verified endpoint before adding `JUDGE0_API_URL`/`JUDGE0_API_KEY`.
- **Gemini:** `GEMINI_API_KEY` is reserved for a future server-only integration. The current mentor uses local notes plus deterministic heuristics. No generated explanation is available.

Never commit `.env.local` or copy real secrets into `.env.example`.
