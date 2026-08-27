# Umbrellarr

Unified operator UI for Radarr and Sonarr media management.

## Stack

- **Web:** Vite, React, Mantine, Phosphor icons, TanStack Query / Router
- **Server:** Hono (TypeScript) BFF — holds API keys, proxies *arr APIs and images
- **Config:** environment variables only (no metadata database)

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

## Docker

```bash
cp .env.example .env
# set RADARR_*/SONARR_* and APP_PASSWORD
docker compose up --build
```

Open http://localhost:3080

## Instance env vars

| Variables | Example |
| --- | --- |
| `RADARR_URL` + `RADARR_API_KEY` | default Radarr |
| `SONARR_URL` + `SONARR_API_KEY` | default Sonarr |
| `RADARR_4K_URL` + `RADARR_4K_API_KEY` | second Radarr instance |

## Auth

Set `APP_PASSWORD` and `APP_SESSION_SECRET`. In local development, omit `APP_PASSWORD` to skip login.
