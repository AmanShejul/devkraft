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

- **Supabase:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the SSR/browser client helpers. The current dashboards and assessment flow do not authenticate or persist data. Never put a service-role key in a `NEXT_PUBLIC_` variable.
- **Code execution:** JDoodle is the intended first provider, but no adapter is enabled. Set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` only after implementing and reviewing the server adapter, timeouts, quotas, and provider error mapping. Judge0 is optional and requires a verified endpoint before adding `JUDGE0_API_URL`/`JUDGE0_API_KEY`.
- **Gemini:** `GEMINI_API_KEY` is reserved for a future server-only integration. The current mentor uses local notes plus deterministic heuristics. No generated explanation is available.

Never commit `.env.local` or copy real secrets into `.env.example`.
