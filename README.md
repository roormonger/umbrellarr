# Umbrellarr

Unified operator UI for Radarr and Sonarr media management.

## Stack

- **Web:** Vite, React, Mantine, Phosphor icons, TanStack Query / Router
- **Server:** Hono (TypeScript) BFF — holds API keys, proxies *arr APIs and images
- **Data:** SQLite for Arr client config (API keys encrypted at rest); in-memory library snapshots on the BFF

## Quick start (dev)

```bash
pnpm install
cp .env.example .env   # already gitignored — fill in API keys
pnpm --filter @umbrellarr/shared build
pnpm dev
```

- Web: http://localhost:5173 (proxies `/api` → server)
- API: http://localhost:3000

Leave `APP_PASSWORD` empty in `.env` to skip login during local development.

Set `INSTANCE_SECRETS_KEY` to a 32-byte secret (`openssl rand -base64 32`). In development only, an insecure default is used if unset.

## Docker

```bash
cp .env.example .env
# set INSTANCE_SECRETS_KEY, APP_PASSWORD, and optional first-run RADARR_*/SONARR_*
docker compose up --build
```

Open http://localhost:3080

Persist the `data/` volume (SQLite DB) across restarts.

## Arr clients

Prefer **Settings → Add client** in the UI.

On first boot, if SQLite has no clients, Umbrellarr imports any `RADARR_*` / `SONARR_*` pairs from the environment (once). After that, SQLite is the source of truth.

| Env (first-run import) | Example |
| --- | --- |
| `RADARR_URL` + `RADARR_API_KEY` | default Radarr |
| `SONARR_URL` + `SONARR_API_KEY` | default Sonarr |
| `RADARR_4K_URL` + `RADARR_4K_API_KEY` | second Radarr |

Sidebar: **Movies** / **Shows** expand to named instances (no merged “All” library).

## Auth

Set `APP_PASSWORD` and `APP_SESSION_SECRET`. In local development, omit `APP_PASSWORD` to skip login.
