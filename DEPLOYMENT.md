# Phase 7 — Deployment & production

## Recommended path (no Docker on your PC)

1. **Develop** with `npm` in `backend/` and `frontend/` (see root `README.md`).
2. **Deploy** the backend on **Render**, **Railway**, or **Fly** — connect the repo or deploy from GitHub; the platform builds `backend/Dockerfile` or uses their Node runtime.
3. **Trust CI** — `.github/workflows/ci.yml` runs `docker build` on Ubuntu so a broken Dockerfile is caught before or after you merge.
4. **Skip Docker Desktop** unless you personally want `docker compose` or to debug containers locally.

## First deploy: Render + Vercel (step-by-step)

Do this in order. You need accounts on [MongoDB Atlas](https://www.mongodb.com/atlas), [Render](https://render.com), [Vercel](https://vercel.com), and a [GitHub personal access token](https://github.com/settings/tokens) (classic: enable **repo** read scope for private repos you analyze; public-only works with higher rate limits if you only read public data).

### A — Backend API on Render

1. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub.
2. Click **New** → **Blueprint**. Connect repository **`Haroon2697/github-repo-insights`** (or your fork). Render reads [`render.yaml`](render.yaml) from the repo root.
3. Apply the blueprint. You should see one web service **`github-repo-insights-api`** (Dockerfile `backend/Dockerfile`, context `backend`).
4. Open that service → **Environment**. Set at minimum:
   - **`MONGODB_URI`** — Atlas connection string (same idea as local `backend/.env`).
   - **`GITHUB_TOKEN`** — your PAT (paste once; Render stores it as a secret).
5. **`CORS_ORIGIN`** — optional on first deploy. If you leave it empty, the backend allows any origin (`cors()` default). After Vercel is live, set **`CORS_ORIGIN`** to your exact frontend URL (e.g. `https://github-repo-insights.vercel.app`) and redeploy for stricter production behavior.
6. Wait until the deploy is **Live**. Copy the service URL (e.g. `https://github-repo-insights-api.onrender.com`).
7. Smoke test: open **`https://<your-service>.onrender.com/health`** — you should see JSON with `"ok": true`.

**Free tier:** the service may sleep after idle time; the first request after sleep can take ~30–60 seconds.

### B — Frontend on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New…** → **Project** → **Import** `Haroon2697/github-repo-insights`.
3. Set **Root Directory** to **`frontend`** (required).
4. Under **Environment Variables**, add **`VITE_API_BASE_URL`** = your Render URL **with no trailing slash**, e.g. `https://github-repo-insights-api.onrender.com`.
5. **Deploy**. When it finishes, open the **`.vercel.app`** URL and try **Load Dashboard**.

### C — Tighten CORS (recommended after B)

1. Render → **github-repo-insights-api** → **Environment** → **`CORS_ORIGIN`** = your Vercel production URL only (comma-separate if you add a custom domain later).
2. **Manual Deploy** → **Clear build cache & deploy** (or trigger redeploy) so the API picks up the variable.

### D — Browser extension (optional)

In `extension` options, set **Dashboard URL** to your Vercel URL. Share links like `https://<vercel-host>/?username=octocat`.

---

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

## Docker (backend) — optional locally

Only needed if you install Docker (e.g. Docker Desktop) and want a prod-like run on your machine. **Render/Railway/Fly and CI do not require Docker on your laptop.**

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

## Railway or Fly (instead of Render)

- **Railway:** New project → deploy from GitHub → set root / Dockerfile to **`backend`**. Add the same env vars as in [Environment variables](#environment-variables). Use the public URL as **`VITE_API_BASE_URL`** on Vercel.
- **Fly.io:** `fly launch` in `backend/` or deploy the Dockerfile; set secrets for `MONGODB_URI`, `GITHUB_TOKEN`, etc.

## Manual Render web service (no Blueprint)

If you prefer not to use `render.yaml`: **New** → **Web Service** → connect the repo → **Docker** → Dockerfile path **`backend/Dockerfile`**, Docker build context **`backend`**. Add env vars as above.

**Shareable links:** `https://<your-vercel-app>/?username=<github_login>` opens the dashboard for that user (after `CORS_ORIGIN` includes your Vercel origin, if you set it). Optional **browser extension** in `extension/` — see `extension/README.md`.

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
