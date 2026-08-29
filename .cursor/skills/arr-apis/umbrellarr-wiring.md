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
| `servarr/shows.ts` | GET | `/api/v3/series` | Full Sonarr library snapshot |
| `servarr/shows.ts` | GET | `/api/v3/qualityprofile` | Profile names for list/edit |
| `servarr/shows.ts` | GET | `/api/v3/tag` | Tag labels for list/edit |
| `servarr/shows.ts` | GET | `/api/v3/wanted/cutoff?page=&pageSize=&monitored=true` | Cutoff-unmet series IDs (from episode records) |
| `servarr/showActions.ts` | GET | `/api/v3/series/{id}` | Show page/detail (+ edit fields) |
| `servarr/showActions.ts` | GET | `/api/v3/qualityprofile` | Edit modal options |
| `servarr/showActions.ts` | GET | `/api/v3/tag` | Edit modal options |
| `servarr/showActions.ts` | GET | `/api/v3/rootfolder` | Edit modal root-folder dropdown |
| `servarr/showActions.ts` | PUT | `/api/v3/series/{id}` | Save edit (GET-merge-PUT; seasons preserved) |
| `servarr/showActions.ts` | DELETE | `/api/v3/series/{id}?deleteFiles=&addImportListExclusion=false` | Remove from Sonarr |
| `servarr/showActions.ts` | POST | `/api/v3/command` | `{ name: "RefreshSeries", seriesId }` |
| `servarr/showActions.ts` | POST | `/api/v3/command` | `{ name: "SeriesSearch", seriesId }` |
| `servarr/showActions.ts` | GET | `/api/v3/history/series?seriesId=` | Series history modal (+ `data` for info details) |
| `servarr/showActions.ts` | POST | `/api/v3/history/failed/{id}` | Mark grabbed history item as failed |
| `servarr/showActions.ts` | GET | `/api/v3/release?seriesId=` | Interactive search (120s timeout) |
| `servarr/showActions.ts` | POST | `/api/v3/release` | Grab / override & grab release |
| `servarr/showActions.ts` | GET | `/api/v3/blocklist?seriesIds=&pageSize=100` | Interactive search History column (flatten `records`) |
| `servarr/showActions.ts` | GET | `/api/v3/rename?seriesId=` | Organize & Rename preview |
| `servarr/showActions.ts` | GET | `/api/v3/config/naming` | Naming pattern for organize modal (`renameEpisodes` + episode formats) |
| `servarr/showActions.ts` | POST | `/api/v3/command` | `{ name: "RenameFiles", seriesId, files }` |
| `servarr/showActions.ts` | GET | `/api/v3/episodefile?seriesId=` | Manage Files modal (rich rows) |
| `servarr/showActions.ts` | GET | `/api/v3/qualityprofile/schema` | Manage Files quality dropdown |
| `servarr/showActions.ts` | GET | `/api/v3/language` | Manage Files languages |
| `servarr/showActions.ts` | GET | `/api/v3/indexerFlag` | Manage Files indexer flags |
| `servarr/showActions.ts` | PUT | `/api/v3/episodefile/bulk` | Manage Files Import (metadata) |
| `servarr/showActions.ts` | DELETE | `/api/v3/episodefile/bulk` | Manage Files Delete (`{ episodeFileIds }`) |
| `servarr/showActions.ts` | — | (no upstream links API) | `buildSeriesLinks` mirrors Sonarr UI from IDs |
| `servarr/seriesTrailer.ts` | GET (scrape) | TMDb `/tv/{tmdbId}/videos` → IMDb title → TV Maze show/videos | Optional YouTube trailer when Sonarr has no `youTubeTrailerId` (product-approved scrape of Sonarr-linked pages; in-memory cache) |
| `servarr/status.ts` | GET | `/api/v3/system/status` | Instance health (radarr + sonarr) |
| `routes/media.ts` | GET | `{path}` e.g. `/MediaCover/{id}/poster-500.jpg` | Image proxy (`arrFetch`) |

## BFF routes → upstream

| BFF route | Handler | Upstream / behavior |
|-----------|---------|---------------------|
| `GET /api/movies?instanceId=` | `routes/movies.ts` | Library cache → Radarr `/movie` (+ profiles/tags/cutoff); optional instance filter |
| `GET /api/shows?instanceId=` | `routes/shows.ts` | Library cache → Sonarr `/series` (+ profiles/tags/cutoff); optional instance filter |
| `GET /api/shows/:instanceId/options` | `routes/shows.ts` | qualityprofile + tag + rootfolder |
| `GET /api/shows/:instanceId/naming` | `routes/shows.ts` | `/config/naming` |
| `GET /api/shows/:instanceId/qualities` | `routes/shows.ts` | `/qualityprofile/schema` (flattened) |
| `GET /api/shows/:instanceId/languages` | `routes/shows.ts` | `/language` |
| `GET /api/shows/:instanceId/indexer-flags` | `routes/shows.ts` | `/indexerFlag` |
| `PUT /api/shows/:instanceId/files/bulk` | `routes/shows.ts` | `PUT /episodefile/bulk` |
| `DELETE /api/shows/:instanceId/files/bulk` | `routes/shows.ts` | `DELETE /episodefile/bulk` |
| `POST /api/shows/:instanceId/history/:historyId/failed` | `routes/shows.ts` | `/history/failed/{id}` |
| `POST /api/shows/:instanceId/releases/grab` | `routes/shows.ts` | `POST /release` |
| `GET /api/shows/:instanceId/:seriesId` | `routes/shows.ts` | `/series/{id}` + qualityprofile |
| `GET /api/shows/:instanceId/:seriesId/links` | `routes/shows.ts` | `/series/{id}` then mirror Sonarr UI links (+ scraped trailer when found) |
| `GET /api/shows/:instanceId/:seriesId/trailer` | `routes/shows.ts` | Resolve YouTube id via Sonarr IDs → scrape TMDb/IMDb/TV Maze |
| `POST /api/shows/:instanceId/:seriesId/refresh` | `routes/shows.ts` | `RefreshSeries` + cache invalidate |
| `POST /api/shows/:instanceId/:seriesId/search` | `routes/shows.ts` | `SeriesSearch` |
| `GET /api/shows/:instanceId/:seriesId/history` | `routes/shows.ts` | `/history/series` |
| `GET /api/shows/:instanceId/:seriesId/releases` | `routes/shows.ts` | `/release?seriesId=` |
| `GET /api/shows/:instanceId/:seriesId/blocklist` | `routes/shows.ts` | `/blocklist?seriesIds=` (flatten records) |
| `GET /api/shows/:instanceId/:seriesId/files` | `routes/shows.ts` | `/episodefile?seriesId=` (manage payload) |
| `GET /api/shows/:instanceId/:seriesId/rename` | `routes/shows.ts` | `/rename?seriesId=` |
| `POST /api/shows/:instanceId/:seriesId/organize` | `routes/shows.ts` | `RenameFiles` command |
| `PUT /api/shows/:instanceId/:seriesId` | `routes/shows.ts` | PUT `/series/{id}` + cache invalidate |
| `DELETE /api/shows/:instanceId/:seriesId` | `routes/shows.ts` | DELETE `/series/{id}` + cache invalidate |
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
| Shows library | `ShowsPage.tsx`, `ShowPosterCard`, sort/filter | `GET /api/shows` |
| Show detail (hero + toolbar) | `ShowDetailPage.tsx`, `ShowDetailHero`, `ShowDetailToolbar`, `ShowEditModal` | detail/links/update/delete + RefreshSeries / SeriesSearch |
| Show Interactive Search modal | `ShowInteractiveSearchModal.tsx` | releases + grab + history + blocklist |
| Show Organize & Rename modal | `ShowOrganizeModal.tsx` | rename preview + naming + `RenameFiles` |
| Show Manage Files modal | `ShowManageFilesModal.tsx` | episodefile + qualities/languages/flags + bulk PUT/DELETE |
| Show History modal | `ShowHistoryModal.tsx` | `GET .../history` |
| Queue / Calendar / Missing | placeholders | none yet |
| Header Search | “coming soon” | none yet |

## Not wired (configured or placeholder only)

| Area | Notes |
|------|-------|
| Sonarr seasons / episodes / cast | Detail hero + toolbar file actions; no `/episode` UI yet |
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
| `packages/shared/src/shows.ts` | `SeriesListItem`, `SeriesPageDetail`, edit/update/links schemas, history/release/rename/manage-files, sort/filter options |
| `packages/shared/src/cache.ts` | `CacheStatus` (`HIT` / `MISS`) for library responses |
| `packages/shared/src/stats.ts` | Dashboard stats shape |
