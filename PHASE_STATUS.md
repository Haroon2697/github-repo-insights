# Build Status

## Current Phase
Phase 7 - Deployment & production readiness (implemented; you deploy to your hosts)

## Progress
- [x] Project plan documented
- [x] Backend initialized (Node.js + Express)
- [x] Environment variable template added
- [x] GitHub service created
- [x] MongoDB connection configured
- [x] User and Repository models added
- [x] Raw repositories endpoint implemented
- [x] Local run with real `.env` values
- [x] GitHub token configured and validated
- [x] Phase 1 endpoint tested end-to-end
- [x] Analysis engine implemented (initial scoring rules)
- [x] Scored repositories endpoint added
- [x] Commit/activity signal integrated
- [x] File tree architecture detection integrated
- [x] Intelligent repo tags integrated
- [x] Phase 2 scored results persisted to DB (`AnalysisResult`)
- [x] Frontend filter dashboard scaffolded
- [x] DB-first ranked repositories API implemented
- [x] DB-first summary analytics API implemented
- [x] Dashboard UI with filters connected to DB APIs
- [x] Repository details panel implemented
- [x] Analytics charts implemented (scores, languages, tags)
- [x] Advanced repo classifications implemented (fullstack, ai, backend-heavy, devops)
- [x] Classification insights API implemented
- [x] Classification distribution added to summary
- [x] AI explanation service implemented for repository complexity insights
- [x] AI insights endpoint added and cached in DB
- [x] Multi-provider AI fallback (Groq, OpenRouter, OpenAI, Hugging Face) via `AI_PROVIDER_ORDER`
- [x] Backend Dockerfile + docker-compose (local prod-style)
- [x] Structured logging (pino + pino-http; `/health` not auto-logged)
- [x] Production CORS via `CORS_ORIGIN`
- [x] Frontend `VITE_API_BASE_URL` for deployed API
- [x] Vercel config (`frontend/vercel.json`)
- [x] Render Blueprint (`render.yaml`)
- [x] Railway hints (`backend/railway.toml`)
- [x] GitHub Actions CI (backend tests, frontend tests + build, Docker build)
- [x] Deployment guide (`DEPLOYMENT.md`)
- [x] API rate limiting (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`)
- [x] Optional `BACKEND_API_KEY` for `/api` (header or query — prefer server-side only in production)
- [x] Optional Redis cache (`REDIS_URL`, `REDIS_CACHE_TTL_SEC`) for analysis list/summary
- [x] Optional Sentry (`SENTRY_DSN`)
- [x] React Router: `/`, `/repo/:username/:githubId`; CSV export on dashboard
- [x] Vitest (frontend) + `supertest` / `node:test` (backend) smoke tests
- [x] Shareable dashboard links `/?username=` / `/?user=`; Chrome MV3 extension (`extension/`) from github.com
- [x] Org repo list fallback when `/users/:login/repos` is not applicable (`/orgs/:login/repos`)

## Active Endpoint
- `GET /api/github/:username/repos`
- `GET /api/github/:username/repos/scored`
- `GET /api/analysis/:username/repos`
- `GET /api/analysis/:username/summary`
- `GET /api/analysis/:username/classifications`
- `GET /api/analysis/:username/repos/:githubRepoId`
- `POST /api/analysis/:username/repos/:githubRepoId/ai-insights`

## What is Happening Right Now
Phases 1–7 are implemented in the repo. Deploy backend (Render/Railway/Fly) and frontend (Vercel) using `DEPLOYMENT.md`. Default workflow: develop with **npm** only; **CI** validates the Docker build — Docker Desktop is optional for local `docker compose`.
