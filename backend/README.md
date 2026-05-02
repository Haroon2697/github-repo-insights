# GitHub Intelligence Backend (Phase 1)

## Run locally
1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI` and optional `GITHUB_TOKEN`
2.1 Optional for Phase 6 AI: set any of `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `HUGGINGFACE_API_KEY` (see `AI_PROVIDER_ORDER`)
3. Install dependencies
4. Run server

Commands:

```bash
npm install
npm run dev
```

## Endpoints
- `GET /health`
- `GET /api/github/:username/repos`
- `GET /api/github/:username/repos/scored`
- `GET /api/analysis/:username/repos`
- `GET /api/analysis/:username/summary`
- `GET /api/analysis/:username/classifications`
- `GET /api/analysis/:username/repos/:githubRepoId`
- `POST /api/analysis/:username/repos/:githubRepoId/ai-insights`

The repos endpoint fetches raw repositories from GitHub, enriches metadata with language stats, and stores it in MongoDB.

### Repository filters (query params)
Use on both `/repos` and `/repos/scored`:

- `type=all|owner|member` (GitHub source type)
- `ownership=all|own|fork|clone` (`clone` treated as forked repos)
- `visibility=all|public|private`

Examples:

- `/api/github/Haroon2697/repos?ownership=all&type=all`
- `/api/github/Haroon2697/repos?ownership=fork`
- `/api/github/Haroon2697/repos?visibility=private`

## Scoring and persistence
- `GET /api/github/:username/repos/scored` now includes:
  - commit activity signal (`commitCount`)
  - architecture signals from repo file tree (`Dockerfile`, `frontend/`, `backend/`, CI, Terraform, k8s)
  - intelligent tags (`fullstack`, `frontend`, `backend`, `ai`, `devops`, `data`)
- Scored requests persist analysis into MongoDB collection via `AnalysisResult` model.

## Phase 3 database APIs
Use stored MongoDB analysis (no live GitHub call):

- `/api/analysis/:username/repos?sortBy=score&sortOrder=desc&ownership=all&visibility=all&type=all&tag=&minScore=0&limit=200`
- `/api/analysis/:username/summary`
- `/api/analysis/:username/classifications`
- `/api/analysis/:username/repos/:githubRepoId`

Supported DB filters:
- `ownership=all|own|fork|clone`
- `visibility=all|public|private`
- `type=all|owner|member`
- `tag=fullstack|frontend|backend|ai|devops|data`
- `sortBy=score|stars|updated`
- `sortOrder=asc|desc`
- `minScore=<number>`
- `limit=<number>`

## Phase 5 advanced analytics
- Added classification engine outputs per repository:
  - `isFullStackProject`
  - `isAIProject`
  - `isBackendHeavy`
  - `isDevOpsProject`
- Classifications are persisted in `AnalysisResult.classification`.
- Summary endpoint now returns `classificationDistribution`.

## Phase 6 AI enhancement (optional)
- Generate AI explanation for a stored repository analysis:
  - `POST /api/analysis/:username/repos/:githubRepoId/ai-insights`
- Uses cached insight if already generated.
- Force regenerate with:
  - `POST /api/analysis/:username/repos/:githubRepoId/ai-insights?force=true`

### Multi-provider fallback (Groq, OpenRouter, OpenAI, Hugging Face)
Configure any combination in `backend/.env`. The backend tries providers in `AI_PROVIDER_ORDER` (comma-separated) until one succeeds. **Providers without a non-empty API key are skipped** (so an empty `OPENAI_API_KEY` does not break the chain). The JSON response includes `attemptLog` (which providers ran, success/failure) and `providerOrderTried` for debugging.

Example:
```env
AI_PROVIDER_ORDER=groq,openrouter,openai,huggingface
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
HUGGINGFACE_API_KEY=...
```

- **Groq**: [Groq Console](https://console.groq.com/keys) — OpenAI-compatible chat at `https://api.groq.com/openai/v1`.
- **OpenRouter**: [OpenRouter Keys](https://openrouter.ai/keys) — set `OPENROUTER_MODEL` (e.g. a `:free` model slug).
- **OpenAI**: standard `OPENAI_API_KEY` if you use paid OpenAI.
- **Hugging Face**: create an access token under [Settings → Access Tokens](https://huggingface.co/settings/tokens) (read scope is enough for many inference APIs). Set `HUGGINGFACE_API_KEY` and optionally `HUGGINGFACE_MODEL`. Some models require accepting a license on the model page or have rate limits; if inference fails, the chain falls through to the next provider.

**Security:** never commit real API keys; rotate any key that was pasted into chat or committed by mistake.

## Phase 7 — Docker & production

- **Docker:** `docker build -f Dockerfile -t gi-backend .` from the `backend/` directory (or `docker compose up` from repo root — see root `docker-compose.yml`).
- **Deploy:** see repository root **`DEPLOYMENT.md`** (Render, Railway, Vercel, env vars, `CORS_ORIGIN`).
- **Logs:** JSON logs via `pino`; set `LOG_LEVEL` as needed.
