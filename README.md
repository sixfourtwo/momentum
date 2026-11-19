# Momentum

Offline-first PWA for tracking training consistency across **Strength**, **Cardio** and
**Mindfulness**. All data lives on-device (IndexedDB) — there is no backend.

## Stack

Vite + React + TypeScript, Tailwind CSS v4, `vite-plugin-pwa` (service worker + install),
`idb` for IndexedDB, Vitest + Testing Library.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at the root URL |
| `npm test` | Full test suite (domain engine, storage contracts, components, e2e) |
| `npm run build` | Production build (root base) |
| `npm run build:pages` | Production build for GitHub Pages (`/momentum/` base) |
| `npm run preview` | Serve `dist/` locally |

## Deploying to GitHub Pages

The GitHub Action (`.github/workflows/deploy.yml`) builds and deploys on every push to
`master`. The site ends up at `https://<your-domain>/momentum/` (or
`<user>.github.io/momentum/` without a custom domain).

One-time setup:

1. Create a public GitHub repo named `momentum`.
2. Push `master` — the action runs automatically.
3. In the repo: **Settings → Pages → Source: GitHub Actions**.
4. If your custom domain is attached to your user site (`<user>.github.io`), project pages
   are served under it automatically at `/momentum/`. No DNS changes needed.

Changing the subpath: the base lives in one place — the `build:pages` script in
`package.json` (`--base=/momentum/`). Update it if the repo name differs. The manifest
(`start_url` / `scope`) and asset links are relative and adapt automatically.

## Architecture notes

- **Deterministic engine**: all levels/timers are derived from timestamps by a pure
  function (`src/domain/calculateCategoryState.ts`) — no background timers; recalculated
  on data change, every 60s while visible, and on `visibilitychange`.
- **Swappable storage**: UI talks to an `AppRepository` backed by a `StorageStrategy`
  (IndexedDB default, LocalStorage fallback, InMemory for tests). Mutations update a
  synchronous snapshot that React subscribes to via `useSyncExternalStore`.
