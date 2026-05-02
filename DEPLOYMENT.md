# Phase 7 — Deployment & production

## Environment variables

### Backend (Render / Railway / Docker / VPS)

Copy `backend/.env.example` and set at minimum:

- `PORT` — optional; platforms often inject this (e.g. Render uses `10000`).
- `MONGODB_URI` — MongoDB Atlas connection string.
- `GITHUB_TOKEN` — for GitHub API rate limits.
- `CORS_ORIGIN` — **required in production** if the frontend is on another origin. Comma-separated URLs, e.g. `https://your-app.vercel.app,https://www.yourdomain.com`.
- AI keys as needed (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, etc.).
- `LOG_LEVEL` — optional (`info`, `debug`, `warn`, `error`).
- **Rate limiting** — `RATE_LIMIT_WINDOW_MS` (default `900000`), `RATE_LIMIT_MAX` (default `200`) per IP for `/api`.
- **Optional API gate** — `BACKEND_API_KEY`: when set, every `/api` request must send `X-Backend-Api-Key: <value>` (or `?apiKey=` for quick tests only). For a public dashboard, leave this **unset** or put the API behind a private BFF; anything in `VITE_*` is visible in the browser.
- **Optional Redis** — `REDIS_URL` (e.g. [Upstash](https://upstash.com/) Redis connection string). Speeds repeat loads of analysis list/summary. `REDIS_CACHE_TTL_SEC` (default `120`).
- **Optional Sentry** — `SENTRY_DSN` for server error reporting.

### Frontend (Vercel / Netlify / static host)

Set at **build** time:

- `VITE_API_BASE_URL` — public URL of the backend **without** a trailing slash, e.g. `https://github-intelligence-backend.onrender.com`.
- `VITE_BACKEND_API_KEY` — **only** if you enabled `BACKEND_API_KEY` on the server **and** you accept that this value is **public** (any visitor can copy it from the network tab). Prefer leaving both unset for a normal public demo, or use login + BFF instead.

Create `frontend/.env.production` locally (do not commit secrets if any) or set the same in the host’s “Environment Variables” UI before build.

## Docker (backend)

From the **repository root**:

```bash
docker compose up --build
```

Requires `backend/.env` with `MONGODB_URI` and other keys.

Or build/run manually:

```bash
docker build -f backend/Dockerfile -t gi-backend ./backend
docker run --env-file backend/.env -p 5000:5000 gi-backend
```

## Render

1. Create a **Web Service** from this repo.
2. Use **Docker** and point to `backend/Dockerfile` with context `backend`, or use the included `render.yaml` Blueprint.
3. Add all env vars in the dashboard (especially `MONGODB_URI`, `CORS_ORIGIN`, `GITHUB_TOKEN`).
4. Deploy URL → use as `VITE_API_BASE_URL` for the frontend build.

## Railway

1. New project → deploy from GitHub; set **root directory** to `backend` (or configure Dockerfile path).
2. Add the same env vars as Render.
3. Use the generated public URL for `VITE_API_BASE_URL`.

## Vercel (frontend)

1. Import the repo; set **Root Directory** to `frontend`.
2. Framework: Vite.
3. Environment variable: `VITE_API_BASE_URL` = your backend URL.
4. Deploy. `vercel.json` enables SPA fallback for client-side routing.

**Shareable links:** `https://<your-vercel-app>/?username=<github_login>` opens the dashboard for that user (after CORS allows your Vercel origin). Optional **browser extension** in `extension/` links from `github.com` profiles/repos to that URL — see `extension/README.md`.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs backend tests (`npm test`), frontend tests + build, a require smoke check, and Docker image build on push/PR to `main` or `master`.

## Uptime monitoring

Point a free monitor (e.g. [UptimeRobot](https://uptimerobot.com/), Better Stack, Pingdom) at `GET https://<your-backend>/health` on a 5-minute interval. Alert on non-200.

## Auth for the dashboard (not in repo)

Anyone with the frontend URL can use the UI today. To restrict access:

1. **Host the frontend behind** Cloudflare Access, Vercel password protection, or Netlify Identity.
2. Or **add** a real auth layer (e.g. Auth0, Clerk, Supabase Auth) and move API calls through a session-aware BFF that holds `BACKEND_API_KEY` / tokens server-side.

## Hugging Face inference

Some models require accepting a license on huggingface.co or use different inference endpoints. If HF fails in the provider chain, rely on Groq/OpenRouter/OpenAI or switch `HUGGINGFACE_MODEL` to a gated-free model you have access to.

## Docker on Windows

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if `docker` is missing in your shell. Then from the repo root: `docker compose up --build`.

## Logging

Production uses **pino** (JSON logs). On platforms that collect stdout, logs are easy to search. Request logs exclude `/health` noise by default.

## Security checklist

- Never commit `backend/.env` or real API keys.
- Rotate any key that was exposed.
- Restrict `CORS_ORIGIN` to your real frontend URLs in production.
