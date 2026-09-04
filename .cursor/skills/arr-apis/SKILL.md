---
name: arr-apis
description: >-
  Maps Radarr, Sonarr, Lidarr, Prowlarr, and Seerr API capabilities for Umbrellarr — library remote
  (Arr) plus indexer management (Prowlarr), request handling and a Discover page (Seerr). Use when
  adding library features, Arr commands, BFF routes, queue/calendar/missing, indexers, Discover/search,
  media requests (create/approve/retry), Servarr, Prowlarr, or Seerr integration, or deciding whether
  data comes from Arr, Prowlarr, Seerr, or UI-only patterns.
---

# Arr + Prowlarr + Seerr API Capability Map

Umbrellarr is three products in one UI:

- **Library remote** — nicer chrome over Radarr / Sonarr / Lidarr (list, detail, edit, search, files).
- **Indexer management** — Prowlarr (indexers, app sync, search test) — **InstanceKind only**, not library.
- **Request + Discover** — Discover browse/search/title metadata from **Seerr**; **add to library** from Discover goes to **Radarr/Sonarr** (not Seerr `POST /request`). Requests list/approve remains a separate Seerr surface.

Work only with what those apps present (API payloads or their own UI patterns). Do not invent movie/show/music metadata. Do not clone Seerr’s SPA — use Seerr’s API, keep Umbrellarr chrome.

## Product rules

1. **Library source of truth = Arr** — library items, profiles, tags, queue, history, wanted, commands.
2. **Actions = Arr commands/CRUD** — refresh/search/edit/delete via documented endpoints; no parallel media DB.
3. **Discover browse source of truth = Seerr** — search, discover rows, movie/TV details, `mediaInfo` availability badges, watchlist/blocklist when used. Seerr already wraps TMDB; **never** add a TMDB client or scrape for Discover browse/metadata.
4. **Discover add = Arr** — from Discover title/Featured, add via Radarr `/movie/lookup`+`POST /movie` or Sonarr `/series/lookup`+`POST /series` (reuse library add forms). Do **not** fulfill Discover adds through Seerr `POST /request`.
5. **Discover gating** — show Discover (nav + `/discover`) only when Seerr **and** (Radarr **or** Sonarr) exist. Hide Movies rows/routes without Radarr; hide Shows without Sonarr (`apps/web/src/lib/discoverAccess.ts`).
6. **UI chrome is ours** — layout, theming, virtualization; not new facts about titles. Discover/request pages are first-class Umbrellarr routes, not an iframe of Seerr.
7. **UI-only patterns** — if Arr or Seerr’s UI builds something client-side (links, image URL templates, slider → endpoint map), mirror that source and cite it.
8. **Prefer fields the upstream returns** — if a field isn’t on the Arr movie/series/artist payload or a Seerr schema, don’t fabricate it.
9. **Indexer management = Prowlarr** — centralize indexers in Prowlarr (`/indexer`, sync to Applications). Do not build Radarr/Sonarr/Lidarr indexer *settings* UIs in Umbrellarr; those library apps receive indexers from Prowlarr sync.

## Official docs

| App | Docs UI | OpenAPI |
|-----|---------|---------|
| Radarr | https://radarr.video/docs/api/ | https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json |
| Sonarr | https://sonarr.tv/docs/api/#v3 | https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json |
| Lidarr | https://lidarr.audio/docs/api/ | https://raw.githubusercontent.com/lidarr/Lidarr/develop/src/Lidarr.Api.V1/openapi.json |
| Prowlarr | https://prowlarr.com/docs/api/ | https://raw.githubusercontent.com/Prowlarr/Prowlarr/develop/src/Prowlarr.Api.V1/openapi.json |
| Seerr | https://docs.seerr.dev/api/seerr-api/ | https://raw.githubusercontent.com/seerr-team/seerr/develop/seerr-api.yml |

- Radarr / Sonarr: **`/api/v3`**
- Lidarr / Prowlarr / Seerr: **`/api/v1`** (same prefix, different apps — do not mix clients)
- Arr + Prowlarr auth: `X-Api-Key` header (see `apps/server/src/servarr/client.ts`)
- Seerr auth: `X-Api-Key` header **or** `connect.sid` cookie after `/auth/plex`, `/auth/jellyfin`, or `/auth/local`
- Seerr OpenAPI can lag the live API — fetch the YAML above when wiring; do not invent fields to paper over gaps

## Architecture

```mermaid
flowchart LR
  UI[Umbrellarr_UI] --> BFF[Umbrellarr_BFF]
  BFF --> Arr[Arr_Instance]
  Arr --> Library[Library_CRUD]
  Arr --> Activity[Queue_History_Calendar_Wanted]
  Arr --> Commands[POST_command]
  Arr --> Config[Profiles_Tags_RootFolders]
  Arr --> Covers[MediaCover_or_path_proxy]
```

```mermaid
flowchart LR
  UI[Umbrellarr_UI] --> BFF[Umbrellarr_BFF]
  BFF --> Seerr[Seerr_Instance]
  Seerr --> Discover[TMDB_search_discover_details]
  Seerr --> Requests[Request_CRUD_approve_retry]
  Seerr --> Users[Users_quotas_watchlist]
  Seerr --> ArrSvc[Radarr_Sonarr_fulfillment]
```

Seerr is a **request + discovery** layer (Overseerr/Jellyseerr successor), not a Servarr library manager. It fulfills via Radarr/Sonarr only — **no Lidarr**. Library CRUD still goes to Arr. **Umbrellarr Discover adds** go straight to Arr lookup/POST (not Seerr `POST /request`); Seerr Requests remain for managing requests created elsewhere / in Seerr itself.

```mermaid
flowchart LR
  UI[Umbrellarr_UI] --> BFF[Umbrellarr_BFF]
  BFF --> Prowlarr[Prowlarr_Instance]
  Prowlarr --> Indexers[Indexers_CRUD_test]
  Prowlarr --> Apps[Applications_linked_Arr]
  Prowlarr --> Search[Search_test]
  BFF --> Arr[Radarr_Sonarr_Lidarr]
  Arr --> Library[Library_remote]
```

Prowlarr is an **indexer manager/proxy**, not a library app. It syncs indexers to linked Radarr/Sonarr/Lidarr *Applications* inside Prowlarr — distinct from Umbrellarr’s own instance registry. No queue/wanted/calendar on Prowlarr. It **does** expose indexer search/grab **history** (`GET /api/v1/history`) and the same `/signalr/messages` hub used for live indexers + history freshness.

## Planned Umbrellarr surfaces (Seerr)

These are **in scope**. Chrome is ours; every fact comes from Seerr.

| Surface | What the user does | Seerr we use |
|---------|--------------------|--------------|
| **Discover** | Browse trending / popular / upcoming / filtered rows; open title; **add to Radarr/Sonarr** | `GET /discover/*`, `GET /search`, `GET /movie/{tmdbId}`, `GET /tv/{tmdbId}` (+ season, similar, recommendations, ratings). Optional `GET /settings/discover` to reuse Seerr slider config. **Add** uses Arr lookup/POST (not Seerr request). |
| **Requests** | List pending/approved/available; approve, decline, retry, delete | `GET/POST /request`, `GET /request/count`, `GET/PUT/DELETE /request/{id}`, `POST /request/{id}/{status}`, `POST /request/{id}/retry` |
| **Add from Discover** | Open Arr add form (profile / root folder / monitor) for the title | Radarr `GET /movie/lookup?term=tmdb:{id}` + `POST /movie`; Sonarr `GET /series/lookup?term=tmdb:{id}` + `POST /series` |

Discover result cards already include `mediaInfo` (availability + existing requests). Use that for **badges** — do not infer “in library” from Arr on poster grids. With **multiple Seerr instances**, also merge `GET /media?filter=pending|processing|partial|available` across instances (prefer pending > processing > partial > available) so a title requested on Seerr B still badges on Discover fed by Seerr A. **Add** still checks Arr `inLibrary` via lookup in the add modal.

Poster/backdrop on Seerr payloads are TMDB relative paths (`posterPath`). Mirror Seerr: `https://image.tmdb.org/t/p/{size}{posterPath}` (e.g. `w600_and_h900_bestv2`), or Seerr’s `/imageproxy/tmdb/...` when their image cache is on. Cite [CachedImage](https://github.com/seerr-team/seerr/blob/develop/src/components/Common/CachedImage/index.tsx). Do not use Arr `/MediaCover` for Discover.

## Capability map

Status legend for Umbrellarr: **Wired** / **Partial** / **In scope / Not started** / **Not started** / **Out of scope (for now)**

| Capability | Radarr v3 | Sonarr v3 | Lidarr v1 | Umbrellarr |
|------------|-----------|-----------|-----------|------------|
| Library list/detail/CRUD | `/movie` | `/series` (+ `/episode`) | `/artist`, `/album`, `/track` | Radarr list + detail **Wired**; Sonarr list + hero/toolbar + seasons/episodes **Wired**; Lidarr artist list + detail + album rows + album tracks modal **Wired**; album detail route **Not started** |
| Collections | `/collection` + `RefreshCollections` | — | — | Radarr list + bulk update + refresh **Wired** (not Seerr/TMDB collections) |
| Lookup / add | `/movie/lookup` | `/series/lookup` | `/artist/lookup`, `/album/lookup` | Radarr + Sonarr lookup + add **Wired** (library Add New + Discover Add to library); Lidarr **Not started** |
| Refresh / search / rename via command | `POST /command` | same | same (`/api/v1`) | Radarr RefreshMovie, MoviesSearch, RenameFiles **Wired**; Sonarr RefreshSeries, SeriesSearch, SeasonSearch, EpisodeSearch, RenameFiles **Wired**; Lidarr RefreshArtist, ArtistSearch, AlbumSearch, RenameFiles, RetagFiles **Wired** |
| Queue / grab / remove | `/queue*` | `/queue*` | `/queue*` | **Wired** (per-instance movies/shows/music queue: list/poll, grab, remove, manual import); unified `/activity/queue` still placeholder |
| Calendar | `/calendar` | `/calendar` | `/calendar` | Unified `/activity/calendar` + aggregated `/api/calendar.ics` **Wired** |
| History | `/history*` | `/history*` | `/history*` | Radarr movie + Sonarr series/season + Lidarr artist history + details + **Prowlarr indexer history** in unified History **Wired** |
| Wanted missing / cutoff | `/wanted/*` | `/wanted/*` | `/wanted/*` | Cutoff IDs **Partial** (movies + series list filters); Missing UI **Not started** |
| Quality profiles + tags | yes | yes | yes (+ metadata profiles) | Radarr + Sonarr edit **Wired**; Lidarr quality + **metadata** profiles + tags **Wired** |
| Root folders / filesystem | yes | yes | yes | **Not started** (path is text) |
| Interactive search / release | `/release` | `/release` | `/release` | Radarr movie + Sonarr series / season / episode + Lidarr artist interactive search **Wired** |
| Movie file manage (metadata / delete) | `/moviefile*` | `/episodefile*` | `/trackfile*` (+ `/track` join) | Radarr + Sonarr Manage Files **Wired**; Lidarr Manage Tracks (Track/Path/Quality) **Wired** |
| Bulk editor | `/movie/editor` | `/series/editor` | `/artist/editor` | **Not started** |
| System health / status | `/system/status`, `/health` | same | same | **Wired** (status) |
| Covers | `/MediaCover/...` or mediacover API | similar | `/api/v1/mediacover/{artist or album}/{id}/{file}` (API matches jpg/png/gif only; SPA `/MediaCover/` is login HTML) | Radarr + Sonarr **Wired** (`/MediaCover/` + `-500`); Lidarr artist **Wired** (mediacover API; `.jpeg` posters use another Arr image) |
| Poster status bars | Index footer / `getProgressBarKind` + queue | same | same | **Wired** — Arr colors/states (incl. queued/downloading via `/queue`) |
| Indexers / download clients / import lists / notifications | full settings APIs | same | same | **Out of scope (for now)** on library pages — use **Prowlarr** for indexer management |
| External “Links” menu | **No API** — Arr UI only | similar | similar | Radarr + Sonarr + Lidarr **Wired** (mirror UI patterns; Lidarr cites `ArtistDetailsLinks.js`) |

### Seerr (`/api/v1`) — Discover + requests (in scope)

| Capability | Seerr path | Umbrellarr |
|------------|------------|------------|
| Search (movie / tv / person / collection) | `GET /search` | **Partial** — Discover page search (movie/tv); header search still “coming soon” |
| Discover rows + filters | `GET /discover/movies`, `/discover/tv`, `/discover/trending`, `.../upcoming`, genre/studio/network/keyword | **Partial** — Discover home (Featured hero + Movies/Shows) + see-more grids (no keyword/provider filters yet) |
| Discover slider config | `GET /settings/discover` | **Not started** — home uses hardcoded Movies/Shows rows (Seerr studio/network id lists) |
| Movie / TV details (+ similar, recommendations, ratings) | `GET /movie/{id}`, `GET /tv/{id}` (+ season) | **Partial** — request detail + Discover title shell (Add to library → Arr; no recommendations/similar) |
| Filter helpers (genres, providers, certs, regions) | `/genres/*`, `/watchproviders/*`, `/certifications/*`, `/regions`, `/languages` | **Partial** — genre slider via `/discover/genreslider/{movie\|tv}` on Discover home |
| Create / list / update / delete request | `GET/POST /request`, `GET/PUT/DELETE /request/{id}` | List + PUT edit **Wired**; create/delete **Not started** (Discover adds use Arr, not Seerr create) |
| Approve / decline / retry | `POST /request/{id}/{status}`, `POST /request/{id}/retry` | Approve/decline **Wired**; retry **Not started** |
| Request counts | `GET /request/count` | **Partial** — BFF exists; sidebar badge not wired |
| Tracked media + status | `GET /media`, `POST /media/{id}/{status}` | **Partial** — Discover merges `GET /media?filter=pending\|processing\|partial\|available` across Seerr instances for poster badges |
| Watchlist | `POST/DELETE /watchlist`, `GET /user/{id}/watchlist`, `GET /discover/watchlist` | **Not started** — Discover row |
| Blocklist | `GET/POST /blocklist`, `/blocklist/{tmdbId}` (`/blacklist` alias) | **Not started** — hide from Discover |
| Radarr/Sonarr service list + profiles | `GET /service/radarr`, `GET /service/sonarr` (+ `/{id}`) | **Wired** — Request edit modal |
| Status | `GET /status` | **Wired** — Settings Test + instances-online |

Seerr `mediaId` on requests is a **TMDB id**. Movie/TV only — no music. Request `status`: `1` pending, `2` approved, `3` declined. Media `status`: `1` unknown, `2` pending, `3` processing, `4` partial, `5` available, `6` deleted.

### Prowlarr (`/api/v1`) — Indexers (in scope)

| Capability | Prowlarr path | Umbrellarr |
|------------|---------------|------------|
| System status | `GET /system/status` | **Wired** — Settings health probe |
| Indexers | `/indexer`, `/indexer/schema`, test/bulk | **Partial** — list + add (schema picker) + RSS/website + edit/test/delete; nav count chip; SignalR freshness; no clone/bulk |
| Applications | `/applications` (linked *arr apps + sync) | **Not started** |
| Download clients | `/downloadclient` | **Not started** |
| Search test | `/search` | **Not started** |
| History | `/history` (indexer query/RSS/grab) | **Wired** — merged into unified `/activity/history` |
| Commands | `POST /command` | **Not started** |

No library, queue, wanted, or calendar entities on Prowlarr.

### Seerr — out of scope (for now)

Users/quotas/permissions admin, issues, Plex/Jellyfin settings + sync, notification agents, jobs/cache/logs, override rules, Seerr slider **admin** write (`POST/PUT/DELETE /settings/discover`). Read sliders is OK.

## Umbrellarr instance support

| Kind | Config | In `ArrKind` | Library wired |
|------|--------|--------------|---------------|
| Radarr | Settings (SQLite) + optional first-run `RADARR_*` env import | yes | yes (per-instance `/movies/$instanceId`) |
| Sonarr | Settings (SQLite) + optional first-run `SONARR_*` env import | yes | yes (per-instance `/shows/$instanceId`; detail + seasons/episodes) |
| Lidarr | Settings (SQLite) + optional first-run `LIDARR_*` env import | yes | yes (per-instance `/music/$instanceId` + `/music/$instanceId/$artistId`) |
| Seerr | Settings (SQLite) + optional first-run `SEERR_*` env import | `InstanceKind` only (not `ArrKind`) | Requests list + detail + approve/decline/edit **Wired**; Discover home + see-more + title shell + **Add to Arr** **Partial** |
| Prowlarr | Settings (SQLite) + optional first-run `PROWLARR_*` env import | `InstanceKind` only (not `ArrKind`) | Health probe **Wired**; Indexers list + add + RSS/website + edit/test/delete + nav chip **Partial** (no clone/bulk); indexer history in unified History **Wired**; SignalR → indexers/history freshness **Wired** |

API keys encrypted in SQLite (`INSTANCE_SECRETS_KEY`). Env Arr vars import once when the DB is empty.

## Decision checklist (before building a feature)

1. Is this a **library** feature (list/edit/search/rename/files)? → Arr endpoint; map fields, don’t enrich.
2. Is this **Discover browse / header search metadata**? → Seerr only for facts (`/discover`, `/search`, `/movie`, `/tv`). Do not invent a TMDB client.
3. Is this **Add from Discover**? → Arr lookup + POST (`tmdb:{id}`), reuse library add forms. Do not use Seerr `POST /request`.
4. Need availability / “already requested” on a Discover **badge**? → `mediaInfo` on the Seerr result (or cross-Seerr media merge). Do not join Arr library by title onto poster grids; Arr `inLibrary` is checked in the add modal.
5. Does Arr or Seerr’s UI do it client-side (links, image sizes, slider → path)? → Mirror that frontend source; cite the file.
6. Would we need a third-party metadata API or scraping? → **Don’t**, unless the user explicitly expands product scope (existing Sonarr trailer/ratings scrapes are the exception — already wired).
7. Is this **indexer CRUD, app sync, or indexer search test**? → Prowlarr only. Do not wire Radarr/Sonarr/Lidarr `/indexer` settings in Umbrellarr library chrome.
8. After adding an upstream call → append a row in [umbrellarr-wiring.md](umbrellarr-wiring.md).

## Progressive disclosure

- Endpoint groups, commands, Seerr Discover/request playbook, UI-only patterns → [reference.md](reference.md)
- Current BFF ↔ Arr call map → [umbrellarr-wiring.md](umbrellarr-wiring.md)
