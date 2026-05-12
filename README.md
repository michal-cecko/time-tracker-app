# Lapse — frontend

Personal time tracker. **One React + Vite codebase** that ships to:

- **Web** — `bun run dev` → `http://localhost:5173`
- **iOS / Android** via **Capacitor 6**
- **macOS** (and Linux/Windows) via **Tauri 2**

Backend lives in `../time-tracker-api/` (NestJS + Postgres + Socket.IO).
Default API base is `http://localhost:3010/api/v1` (override with `VITE_API_BASE`).

## Quickstart

```bash
# 0) Start the API (in ../time-tracker-api): docker compose up -d --build
# 1) Install
bun install

# 2) Dev
bun run dev       # web preview at http://localhost:5173
# Login: alex@studio.co / password123
```

## Adding native shells

### iOS (Capacitor)
```bash
bunx cap add ios
bunx cap sync
bunx cap open ios     # opens Xcode; build & run on simulator
```

### Android (Capacitor)
```bash
bunx cap add android
bunx cap sync
bunx cap open android # opens Android Studio
```

### macOS (Tauri 2)
```bash
# First time only — install Rust + tauri-cli
brew install rustup-init && rustup-init -y
cargo install tauri-cli --version "^2.0" --locked

# Initialize the macOS shell pointing at this Vite project
bunx tauri init      # accept defaults; webDir = `dist`, devUrl = http://localhost:5173

bun run tauri:dev    # native macOS window, hot-reloaded against the Vite dev server
bun run tauri:build  # signed/unsigned bundle in src-tauri/target/release/bundle
```

## Configuration

`VITE_API_BASE` — override the API URL (defaults to `http://localhost:3010/api/v1`).
Use `.env.local` or pass at build:

```bash
VITE_API_BASE=https://lapse.cecko.dev/api/v1 bun run build
```

## Production deployment (Dokploy on the VPS)

The setup is **one host, two services** sharing `lapse.cecko.dev`:

- `lapse-api` (NestJS) — owns `/api`, `/realtime`, `/docs` (Traefik PathPrefix, priority 100)
- `lapse-web` (this app, nginx) — catches everything else (priority 10)

Both deployments are separate Dokploy projects, each with its own compose file:

| Repo | Compose file | Container | Host volumes |
| --- | --- | --- | --- |
| `time-tracker-api` | `docker-compose.prod.yml` | `lapse-api`, `lapse-db` | `/volumes/lapse-api/pgdata` |
| `time-tracker-app` | `docker-compose.prod.yml` | `lapse-web` | — |

Both rely on the external Traefik networks `web` and `database` (same as your existing stacks).

### One-time host setup on the VPS

```bash
sudo mkdir -p /volumes/lapse-api/pgdata
docker network create web      || true
docker network create database || true
```

### Dokploy environment

For **lapse-api**, set in Dokploy → Environment (copy from `.env.prod.example`):
- `POSTGRES_PASSWORD` (strong random)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (two long random strings — `openssl rand -hex 32`)
- `CORS_ORIGINS=https://lapse.cecko.dev,capacitor://localhost,http://localhost,tauri://localhost`
- `APP_URL=https://lapse.cecko.dev`

The web service needs no runtime env — the API base is baked into the JS bundle at build time via the `VITE_API_BASE` Docker `ARG`.

### Migrations on deploy

`time-tracker-api/Dockerfile`'s `CMD` runs `bunx prisma migrate deploy` before `bun run dist/main.js`, so new migrations apply on each rolling deploy automatically.

### Native builds (iOS / Android / macOS)

Native shells consume the same `lapse.cecko.dev` API. Build the web bundle with the right base, then sync:

```bash
VITE_API_BASE=https://lapse.cecko.dev/api/v1 bun run build

bunx cap sync ios     && bunx cap open ios
bunx cap sync android && bunx cap open android
bun run tauri:build   # macOS .app / .dmg in src-tauri/target/release/bundle/
```

For Capacitor on iOS, Safari uses the origin `capacitor://localhost` and Android uses `http://localhost` — both are already in the `CORS_ORIGINS` list above. Tauri's WebKit shell uses `tauri://localhost`. Socket.IO connects to `wss://lapse.cecko.dev/realtime/` from all three.

## What's wired up

- **Auth** — login / signup / forgot / reset / "Stay logged in" (90d refresh)
- **Realtime** — Socket.IO connection to `/realtime`; every device of the same user receives `timer.started`, `timer.stopped`, `task.upserted`, `entry.upserted`, etc., and updates instantly
- **Offline** — Dexie (IndexedDB) mutation queue; drains via `POST /sync/batch` on reconnect (idempotent on client UUID)
- **Tweaks** — accent color, density, dark/bright theme, font scale — persisted both locally (LocalStorage) and to the backend (`PATCH /me/settings`) so they roam across devices
- **Mobile screens** — Today, Projects, Project detail, Task detail (status picker, timer, billing XOR, time entries, activity), Calendar (week + month heatmap), Reports, History, Search, Focus, Quick add, Manual entry, Settings, Tweaks
- **Desktop variant** — Three-column shell (rail + center + inspector), title bar with persistent timer pill, status bar, `⌘K` command palette

## Architecture map

```
src/
  api/           REST + WS client (with auto-refresh on 401)
  auth/          AuthContext + auth screens
  components/ui/ Icon, Status, PriorityFlag, TaskRow, MiniTimerBar, TabBar, Sheet, …
  offline/       Dexie schema + sync queue
  screens/
    mobile/      All mobile screens
    desktop/     Three-column desktop variant
  state/         Zustand stores (tweaks, running timer, nav stack)
  styles/        tokens.css + desktop.css (ported verbatim from the prototype)
  utils/         format helpers, platform detect
```

## Notes

- The web preview is wrapped in a phone frame at `≤720px` width for design fidelity. On Capacitor/Tauri shells, `.is-native` is added and the frame is bypassed.
- The desktop three-column shell auto-engages at viewport ≥ `1024px`.
- The HTML/CSS prototype lives in `/tmp/design-fetch/extracted/project-task-time-tracker-app/project/` (handoff bundle) — kept around for visual reference. The actual UI is a React port.
