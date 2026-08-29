# Umbrellarr ↔ Arr Wiring

When you add a new upstream Arr call, **append a row** to the tables below.

Auth to Arr: `X-Api-Key` via `apps/server/src/servarr/client.ts` (`arrFetch` / `arrJson`).  
Browser never sees Arr API keys; it talks to the Umbrellarr BFF (`/api/*`) with the app session cookie when `APP_PASSWORD` is set.

## Upstream Arr calls (today)

| Server module | Method | Upstream path | Purpose |
|---------------|--------|---------------|---------|
| `servarr/movies.ts` | GET | `/api/v3/movie` | Full Radarr library snapshot |
| `servarr/movies.ts` | GET | `/api/v3/qualityprofile` | Profile names for list/edit |
| `servarr/movies.ts` | GET | `/api/v3/tag` | Tag labels for list/edit |
| `servarr/movies.ts` | GET | `/api/v3/wanted/cutoff?page=&pageSize=&monitored=true` | Cutoff-unmet movie IDs |
| `servarr/movieActions.ts` | GET | `/api/v3/qualityprofile` | Edit modal options |
| `servarr/movieActions.ts` | GET | `/api/v3/tag` | Edit modal options |
| `servarr/movieActions.ts` | GET | `/api/v3/rootfolder` | Edit modal root-folder dropdown |
| `servarr/movieActions.ts` | GET | `/api/v3/movie/{id}` | Movie page/detail (+ edit fields) |
| `servarr/movieActions.ts` | GET | `/api/v3/moviefile?movieId=` | Detail files table |
| `servarr/movieActions.ts` | GET | `/api/v3/extrafile?movieId=` | Detail extra files |
| `servarr/movieActions.ts` | GET | `/api/v3/credit?movieId=` | Detail cast/crew |
| `servarr/movieActions.ts` | GET | `/api/v3/alttitle?movieId=` | Detail alternative titles |
| `servarr/movieActions.ts` | PUT | `/api/v3/movie/{id}` | Save edit |
| `servarr/movieActions.ts` | DELETE | `/api/v3/movie/{id}?deleteFiles=&addImportExclusion=false` | Remove from Radarr |
| `servarr/movieActions.ts` | POST | `/api/v3/command` | `{ name: "RefreshMovie", movieIds }` |
| `servarr/movieActions.ts` | POST | `/api/v3/command` | `{ name: "MoviesSearch", movieIds }` |
| `servarr/movieActions.ts` | GET | `/api/v3/history/movie?movieId=` | Movie history modal (+ `data` for info details) |
| `servarr/movieActions.ts` | POST | `/api/v3/history/failed/{id}` | Mark grabbed history item as failed |
| `servarr/movieActions.ts` | GET | `/api/v3/release?movieId=` | Interactive search (120s timeout) |
| `servarr/movieActions.ts` | POST | `/api/v3/release` | Grab / override & grab release |
| `servarr/movieActions.ts` | GET | `/api/v3/blocklist/movie?movieId=` | Interactive search History column |
| `servarr/movieActions.ts` | GET | `/api/v3/rename?movieId=` | Organize & Rename preview |
| `servarr/movieActions.ts` | GET | `/api/v3/config/naming` | Naming pattern for organize modal |
| `servarr/movieActions.ts` | POST | `/api/v3/command` | `{ name: "RenameFiles", movieId, files }` |
| `servarr/movieActions.ts` | GET | `/api/v3/moviefile?movieId=` | Manage Files modal (rich rows) |
| `servarr/movieActions.ts` | GET | `/api/v3/qualityprofile/schema` | Manage Files quality dropdown |
| `servarr/movieActions.ts` | GET | `/api/v3/language` | Manage Files languages |
| `servarr/movieActions.ts` | GET | `/api/v3/indexerFlag` | Manage Files indexer flags |
| `servarr/movieActions.ts` | PUT | `/api/v3/moviefile/bulk` | Manage Files Import (metadata) |
| `servarr/movieActions.ts` | DELETE | `/api/v3/moviefile/bulk` | Manage Files Delete |
| `servarr/movieActions.ts` | — | (no upstream links API) | `buildMovieLinks` mirrors Radarr UI from IDs |
| `servarr/status.ts` | GET | `/api/v3/system/status` | Instance health (radarr + sonarr) |
| `routes/media.ts` | GET | `{path}` e.g. `/MediaCover/{id}/poster-500.jpg` | Image proxy (`arrFetch`) |

## BFF routes → upstream

| BFF route | Handler | Upstream / behavior |
|-----------|---------|---------------------|
| `GET /api/movies?instanceId=` | `routes/movies.ts` | Library cache → Radarr `/movie` (+ profiles/tags/cutoff); optional instance filter |
| `GET /api/instances` | `routes/instances.ts` | SQLite-backed clients (no apiKey) |
| `POST /api/instances` | `routes/instances.ts` | Create client (encrypt API key) |
| `PUT /api/instances/:id` | `routes/instances.ts` | Update client |
| `DELETE /api/instances/:id` | `routes/instances.ts` | Remove client + cache invalidate |
| `POST /api/instances/test` | `routes/instances.ts` | Probe `/system/status` (no persist) |
| `GET /api/movies/:instanceId/options` | `routes/movies.ts` | qualityprofile + tag + rootfolder |
| `GET /api/movies/:instanceId/naming` | `routes/movies.ts` | `/config/naming` |
| `GET /api/movies/:instanceId/qualities` | `routes/movies.ts` | `/qualityprofile/schema` (flattened) |
| `GET /api/movies/:instanceId/languages` | `routes/movies.ts` | `/language` |
| `GET /api/movies/:instanceId/indexer-flags` | `routes/movies.ts` | `/indexerFlag` |
| `PUT /api/movies/:instanceId/files/bulk` | `routes/movies.ts` | `PUT /moviefile/bulk` |
| `DELETE /api/movies/:instanceId/files/bulk` | `routes/movies.ts` | `DELETE /moviefile/bulk` |
| `GET /api/movies/:instanceId/:movieId` | `routes/movies.ts` | `/movie/{id}` + moviefile/extrafile/credit/alttitle/qualityprofile |
| `GET /api/movies/:instanceId/:movieId/links` | `routes/movies.ts` | `/movie/{id}` then mirror Arr UI links |
| `POST /api/movies/:instanceId/:movieId/refresh` | `routes/movies.ts` | `RefreshMovie` command + cache refresh |
| `POST /api/movies/:instanceId/:movieId/search` | `routes/movies.ts` | `MoviesSearch` command |
| `GET /api/movies/:instanceId/:movieId/history` | `routes/movies.ts` | `/history/movie` |
| `POST /api/movies/:instanceId/history/:historyId/failed` | `routes/movies.ts` | `/history/failed/{id}` |
| `GET /api/movies/:instanceId/:movieId/releases` | `routes/movies.ts` | `/release?movieId=` |
| `GET /api/movies/:instanceId/:movieId/blocklist` | `routes/movies.ts` | `/blocklist/movie` |
| `POST /api/movies/:instanceId/releases/grab` | `routes/movies.ts` | `POST /release` |
| `GET /api/movies/:instanceId/:movieId/files` | `routes/movies.ts` | `/moviefile?movieId=` (manage payload) |
| `GET /api/movies/:instanceId/:movieId/rename` | `routes/movies.ts` | `/rename?movieId=` |
| `POST /api/movies/:instanceId/:movieId/organize` | `routes/movies.ts` | `RenameFiles` command |
| `PUT /api/movies/:instanceId/:movieId` | `routes/movies.ts` | PUT `/movie/{id}` + cache refresh |
| `DELETE /api/movies/:instanceId/:movieId` | `routes/movies.ts` | DELETE `/movie/{id}` + cache refresh |
| `GET /api/media/:instanceId/image?path=` | `routes/media.ts` | Proxy MediaCover (prefer `-500` poster) |
| `GET /api/instances/status` | `routes/instances.ts` | `/system/status` per instance |
| `GET /api/stats` | `routes/stats.ts` | Counts; queue/missing still placeholder `0` |
| `GET /api/health` | `routes/health.ts` | App health only |
| `/api/auth/*` | `routes/auth.ts` | App login; not Arr |

## UI entry points

| UI | File(s) | BFF used |
|----|---------|----------|
| Movies grid | `apps/web/src/pages/MoviesPage.tsx`, `VirtualizedMovieGrid.tsx` | `GET /api/movies?instanceId=` |
| Movie detail page | `MovieDetailPage.tsx`, `components/movies/detail/*` | `GET .../:movieId` (rich page payload) |
| Poster click | `PosterCard.tsx` | navigates to `/movies/:instanceId/:movieId` |
| Settings (Arr clients) | `SettingsPage.tsx` | instances CRUD + test |
| Sidebar Movies/Shows | `AppLayout.tsx` | `GET /api/instances` |
| Poster hover refresh | `PosterCard.tsx` | `POST .../refresh` |
| Edit modal | `MovieEditModal.tsx` | options + detail + PUT/DELETE |
| Interactive Search modal | `MovieInteractiveSearchModal.tsx` | releases + grab + history + blocklist |
| Organize & Rename modal | `MovieOrganizeModal.tsx` | rename preview + naming + `RenameFiles` |
| Manage Files modal | `MovieManageFilesModal.tsx` | moviefile + qualities/languages/flags + bulk PUT/DELETE |
| History modal | `MovieHistoryModal.tsx` | `GET .../history` |
| Links menu | `MovieLinksMenu.tsx` | `GET .../links` |
| Poster images | `PosterCard.tsx` | `GET /api/media/.../image` |
| Status page | `StatusPage.tsx` | `/api/instances/status` |
| Shows / Queue / Calendar / Missing | placeholders | none yet |
| Header Search | “coming soon” | none yet |

## Not wired (configured or placeholder only)

| Area | Notes |
|------|-------|
| Sonarr library | Instance kind exists; no `/series` calls |
| Lidarr | Not in `ArrKind` / env loader |
| Queue / Calendar / Missing pages | Placeholders |
| Dashboard queue/missing badges | Hardcoded `0` in stats |
| Movie lookup / add | No BFF yet |
| Interactive search custom-filter builder | Presets only (All / Approved / Rejected / Usenet / Torrent) |
| Folder browser for edit path | Not needed — root Select + movie-folder suffix |

## Shared types (Arr-facing)

| Package file | Types |
|--------------|--------|
| `packages/shared/src/instances.ts` | `ArrKind` (`radarr` \| `sonarr`), `Instance`, status |
| `packages/shared/src/media.ts` | `MediaItem`, `MediaKind` (`movie` \| `series`) |
| `packages/shared/src/movies.ts` | `MovieListItem`, `MovieDetail`, `MoviePageDetail`, history/release/rename/manage-files, edit/links schemas |
| `packages/shared/src/cache.ts` | `CacheStatus` (`HIT` / `MISS`) for library responses |
| `packages/shared/src/stats.ts` | Dashboard stats shape |
