# GitHub Intelligence Frontend

## Run
```bash
npm install
npm run dev
```

App URL (default): `http://localhost:5173`

The dashboard provides:
- Dashboard + Analytics views
- username input
- ownership filter (all, own, forked/cloned)
- visibility filter (all, public, private)
- type filter (all, owner, member)
- tag filter and minimum score filter
- sort controls (score, stars, updated)
- summary cards (total repos, average score, top repo)
- ranked repositories list
- repository details panel (score breakdown and tags)
- charts (top scores, language distribution, tag distribution)

Backend expected at: `http://localhost:5000` by default.

For production builds, set **`VITE_API_BASE_URL`** to your deployed API origin (no trailing slash). See `frontend/.env.example` and root **`DEPLOYMENT.md`**.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
