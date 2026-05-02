# GitHub Repo Insights

Rank and explore GitHub repositories with scoring, tags, analytics, and optional AI summaries. Monorepo: **backend** (Express + MongoDB), **frontend** (React + Vite), optional **browser extension** for jumping from GitHub.com to your dashboard.

### Recommended workflow (solo dev)

| Step | What to do |
|------|------------|
| **Develop locally** | Use **npm only** — no Docker Desktop required. See Quick start below. |
| **Ship the API** | Deploy the backend on **Render**, **Railway**, or **Fly** — they build `backend/Dockerfile` or run Node; you set env vars in their UI ([DEPLOYMENT.md](DEPLOYMENT.md)). |
| **Validate the image** | **GitHub Actions** builds the Docker image on push/PR — your `Dockerfile` is checked without installing Docker on your machine. |
| **Optional** | Install Docker Desktop only if you want `docker compose` or local container debugging. |

## Quick start (local)

1. Copy `backend/.env.example` → `backend/.env` and fill `MONGODB_URI`, `GITHUB_TOKEN`, and any AI keys you want.
2. **Backend:** `cd backend && npm ci && npm run dev` → API on [http://localhost:5000](http://localhost:5000).
3. **Frontend:** `cd frontend && npm ci && npm run dev` → UI on [http://localhost:5173](http://localhost:5173).

## Share a profile with a link

Anyone with access to your deployed frontend can open:

`https://your-frontend-host/?username=octocat`

The dashboard loads that GitHub login automatically (your backend must be reachable and configured with `CORS_ORIGIN` for that frontend in production).

## Browser extension (GitHub → dashboard)

See [extension/README.md](extension/README.md). After loading the unpacked extension, set the dashboard URL in options (e.g. your Vercel app). On GitHub user, org, or repo pages you get a floating link or can use the toolbar popup.

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for Render/Railway/Docker, Vercel, env vars, Redis, Sentry, and rate limits.

## GitHub Codespaces

Open this repo on GitHub → **Code** → **Codespaces** → create a codespace. After the container finishes `npm ci` for `backend/` and `frontend/`, copy `backend/.env.example` to `backend/.env`, add secrets, then run `npm run dev` in each folder (two terminals).

## License

Add a `LICENSE` file in the repo if you open-source the project.
