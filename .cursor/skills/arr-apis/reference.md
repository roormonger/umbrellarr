# Arr + Seerr API Reference

Capability-oriented groups — not a full OpenAPI dump (~160 paths per Arr; Seerr is smaller). For exhaustive schemas, use the OpenAPI links in [SKILL.md](SKILL.md).

Prefix: Radarr/Sonarr `/api/v3`, Lidarr `/api/v1`, Seerr `/api/v1`.

## Endpoint groups

### Library (core remote)

| Domain | Radarr | Sonarr | Lidarr |
|--------|--------|--------|--------|
| Primary entity | `GET/POST /movie`, `GET/PUT/DELETE /movie/{id}` | `GET/POST /series`, `GET/PUT/DELETE /series/{id}` | `GET/POST /artist`, `GET/PUT/DELETE /artist/{id}` |
| Child entities | `moviefile` | `episode`, `episodefile` | `album`, `track`, `trackfile` |
| Lookup | `/movie/lookup`, `/lookup/imdb`, `/lookup/tmdb` | `/series/lookup` | `/artist/lookup`, `/album/lookup` |
| Bulk editor | `/movie/editor` | `/series/editor` | `/artist/editor` |
| Folder helper | `/movie/{id}/folder` | `/series/{id}/folder` | — |
| Collections | `/collection` | — | — |

### Activity

| Domain | Path pattern (all apps) |
|--------|-------------------------|
| Queue | `/queue`, `/queue/{id}`, `/queue/bulk`, `/queue/details`, `/queue/status`, `/queue/grab/{id}` |
| Calendar | `/calendar` (+ Sonarr/Lidarr `/{id}`) |
| History | `/history`, `/history/since`, entity-scoped history, `POST /history/failed/{id}` |
| Wanted | `/wanted/missing`, `/wanted/cutoff` |
| Blocklist | `/blocklist` |
| Manual import | `/manualimport` |
| Releases | `GET/POST /release` |

### Commands

`POST /command` with JSON `{ "name": "<CommandName>", ...params }`.

Also: `GET /command`, `GET /command/{id}`, `DELETE /command/{id}`.

Command `name` strings are **not** a stable OpenAPI enum — confirm against the Arr frontend `commandNames` (or live instance) when adding new actions.

#### Radarr (`frontend/src/Commands/commandNames.js`)

| Constant usage | `name` value | Typical body |
|----------------|--------------|--------------|
| Refresh movie | `RefreshMovie` | `{ movieIds: number[] }` |
| Search movies | `MoviesSearch` | `{ movieIds: number[] }` |
| Missing search | `MissingMoviesSearch` | — |
| Cutoff search | `CutoffUnmetMoviesSearch` | — |
| Rename | `RenameMovie` / `RenameFiles` | movie / file ids |
| Downloaded scan | `DownloadedMoviesScan` | optional path |
| RSS sync | `RssSync` | — |
| Import list sync | `ImportListSync` | — |
| Refresh collections | `RefreshCollections` | — |
| Monitored downloads | `RefreshMonitoredDownloads` | — |
| Backup | `Backup` | — |

#### Sonarr

| Usage | `name` | Typical body |
|-------|--------|--------------|
| Refresh series | `RefreshSeries` | `{ seriesId }` / series ids |
| Search series | `SeriesSearch` | `{ seriesId }` |
| Season search | `SeasonSearch` | `{ seriesId, seasonNumber }` |
| Episode search | `EpisodeSearch` | `{ episodeIds: number[] }` |
| Missing / cutoff | `MissingEpisodeSearch`, `CutoffUnmetEpisodeSearch` | — |
| Rename | `RenameSeries` / `RenameFiles` | — |
| Downloaded scan | `DownloadedEpisodesScan` | — |
| RSS sync | `RssSync` | — |

#### Lidarr

| Usage | `name` | Typical body |
|-------|--------|--------------|
| Refresh artist | `RefreshArtist` | artist ids |
| Search artist / album | `ArtistSearch`, `AlbumSearch` | ids |
| Missing / cutoff | `MissingAlbumSearch`, `CutoffUnmetAlbumSearch` | — |
| Rename / retag | `RenameArtist`, `RenameFiles`, `RetagArtist`, `RetagFiles` | — |
| Rescan | `RescanFolders` | — |
| Downloaded scan | `DownloadedAlbumsScan` | — |
| RSS sync | `RssSync` | — |

### Config used by edit dialogs

| Domain | Path |
|--------|------|
| Quality profiles | `/qualityprofile` |
| Tags | `/tag`, `/tag/detail` |
| Root folders | `/rootfolder` |
| Filesystem browser | `/filesystem`, `/filesystem/type`, `/filesystem/mediafiles` |
| Naming / media management | `/config/naming`, `/config/mediamanagement` |
| Metadata profiles (Lidarr) | `/metadataprofile` |

### Settings (usually out of universal-remote v1)

Indexers, download clients, import lists, notifications, delay profiles, custom formats, remote path mappings, host/UI config, backups, logs, updates.

### Covers / static media

| App | Typical path |
|-----|----------------|
| Radarr | `/MediaCover/{movieId}/poster.jpg` (also `-500` variants); API tag `MediaCover` |
| Sonarr | `/MediaCover/series/...` / episode art patterns |
| Lidarr | `/api/v1/mediacover/artist/{id}/{filename}`, `.../album/...` |

Umbrellarr proxies images through the BFF so API keys never hit the browser.

## UI-only Arr patterns

These are **not** API resources. Arr’s SPA builds them from IDs already on the entity.

### External links (movies)

Radarr source: [MovieDetailsLinks.tsx](https://github.com/Radarr/Radarr/blob/develop/frontend/src/Movie/Details/MovieDetailsLinks.tsx)

Inputs from movie payload only: `tmdbId`, `imdbId`, `youTubeTrailerId`.

| Link | Condition | URL pattern (Radarr develop) |
|------|-----------|------------------------------|
| TMDb | `tmdbId` | `https://www.themoviedb.org/movie/{tmdbId}` |
| Letterboxd | `tmdbId` | `https://letterboxd.com/tmdb/{tmdbId}` |
| IMDb | `imdbId` | `https://imdb.com/title/{imdbId}/` |
| Trakt | `imdbId` | `https://trakt.tv/movies/{imdbId}` |
| Movie Chat | `imdbId` | `https://moviechat.org/{imdbId}/` |
| MDBList | `imdbId` | `https://mdblist.com/movie/{imdbId}` |
| Blu-ray | `imdbId` | blu-ray.com search with `imdbId` + `section=theatrical` |
| Trailer | `youTubeTrailerId` | `https://www.youtube.com/watch?v={youTubeTrailerId}` |

Sort: links with a copyable external id first (same as Arr).

Sonarr/Lidarr have analogous details-links components — mirror those sources when wiring Shows/Music links; do not reuse Radarr movie URL templates blindly.

## Seerr (`/api/v1`)

Seerr is request + discovery, not a library manager. Auth: `X-Api-Key` or `connect.sid`. Docs: https://docs.seerr.dev/api/seerr-api/

Umbrellarr **will** build its own Discover page and request handling on these APIs. Pass query params through the BFF; do not invent filter names.

### Discover page playbook

Our page. Seerr data. Typical layout: stacked rows (trending, popular movies, upcoming, popular TV, …) plus a filterable Movies/TV browse.

**Default rows** (no need to clone Seerr sliders unless we opt in):

| Row | Path |
|-----|------|
| Trending | `GET /discover/trending` (`mediaType`: `all` \| `movie` \| `tv`; `timeWindow`: `day` \| `week` — confirm live spec) |
| Popular movies | `GET /discover/movies` |
| Upcoming movies | `GET /discover/movies/upcoming` |
| Popular TV | `GET /discover/tv` |
| Upcoming TV | `GET /discover/tv/upcoming` |
| Genre chips | `GET /discover/genreslider/movie`, `/discover/genreslider/tv` |
| Plex watchlist | `GET /discover/watchlist` |
| Search | `GET /search?query=&page=` |

Optional: `GET /settings/discover` returns Seerr’s slider list (`type`, `title`, `enabled`, `data`). Map `type` → path the way Seerr’s UI does — cite [Discover/index.tsx](https://github.com/seerr-team/seerr/blob/develop/src/components/Discover/index.tsx). Do not guess numeric `type` values; read that file. `GET` sliders only unless the user asks to edit Seerr’s slider admin.

**Browse / filter** — `GET /discover/movies` and `GET /discover/tv` accept (passthrough):

| Param | Movies | TV | Notes |
|-------|--------|----|-------|
| `page`, `language` | yes | yes | |
| `genre` | yes | yes | genre id |
| `studio` | yes | — | |
| `network` | — | yes | |
| `keywords`, `excludeKeywords` | yes | yes | comma-separated TMDB keyword ids |
| `sortBy` | yes | yes | e.g. `popularity.desc` |
| `primaryReleaseDateGte/Lte` | yes | — | `YYYY-MM-DD` |
| `firstAirDateGte/Lte` | — | yes | |
| `withRuntimeGte/Lte` | yes | yes | |
| `voteAverageGte/Lte`, `voteCountGte/Lte` | yes | yes | |
| `watchRegion`, `watchProviders` | yes | yes | providers like `8\|9` |
| `status` | — | yes | e.g. `3\|4` |
| `certification`, `certificationGte/Lte`, `certificationCountry`, `certificationMode` | yes | yes | mode: `exact` \| `range` |

Shortcut paths: `/discover/movies/genre/{id}`, `/language/{code}`, `/studio/{id}`; TV: `/genre/{id}`, `/language/{code}`, `/network/{id}`; `/discover/keyword/{keywordId}/movies`.

Filter option lists: `GET /genres/movie`, `/genres/tv`, `/watchproviders/movies?watchRegion=`, `/watchproviders/tv?watchRegion=`, `/watchproviders/regions`, `/certifications/movie`, `/certifications/tv`, `/regions`, `/languages`, `GET /search/keyword`, `GET /search/company`.

**Cards:** `MovieResult` / `TvResult` include TMDB fields + `mediaInfo`. Badge from `mediaInfo.status` (and existing `requests`). Title click → `GET /movie/{tmdbId}` or `GET /tv/{tmdbId}` (optional `/season/{n}`, `/similar`, `/recommendations`, `/ratings`, `/ratingscombined`).

**Images:** `posterPath` / `backdropPath` are TMDB relative. Seerr UI: `https://image.tmdb.org/t/p/{size}{path}` or `/imageproxy/tmdb/{size}{path}` when cache is on ([CachedImage](https://github.com/seerr-team/seerr/blob/develop/src/components/Common/CachedImage/index.tsx)). Prefer proxying through our BFF later so the browser never depends on TMDB directly if we want; still use Seerr/TMDB sizes, not Arr `-500` covers.

### Request handling playbook

| Action | Path |
|--------|------|
| List | `GET /request?take=&skip=&filter=&sort=&sortDirection=&requestedBy=&mediaType=` |
| Counts | `GET /request/count` |
| Get / edit / delete | `GET/PUT/DELETE /request/{requestId}` |
| Approve / decline | `POST /request/{requestId}/{status}` — `status`: `approved` \| `declined` |
| Retry (re-send to Radarr/Sonarr) | `POST /request/{requestId}/retry` |
| Create | `POST /request` |

`GET /request` `filter`: `all` \| `approved` \| `available` \| `pending` \| `processing` \| `unavailable` \| `failed` \| `deleted` \| `completed`. `sort`: `added` \| `modified`. `mediaType`: `movie` \| `tv` \| `all`.

**Create body** — required `mediaType` (`movie` \| `tv`) + `mediaId` (TMDB). Optional: `tvdbId`, `seasons` (number[] or `"all"`), `is4k`, `serverId`, `profileId`, `rootFolder`, `languageProfileId`, `userId`, `ignoreQuota`.

**From Discover:** movie → `{ mediaType: "movie", mediaId: tmdbId }`. TV → same + `seasons` (`"all"` or picked numbers from `GET /tv/{id}` / season endpoint). Advanced: `GET /service/radarr` / `/service/sonarr` then `GET /service/{radarr\|sonarr}/{id}` for profiles + root folders.

`ADMIN` / `AUTO_APPROVE` auto-approve on create. `REQUEST` required to create. `MANAGE_REQUESTS` (or `ADMIN`) to approve/decline/retry/edit others.

Request `status` numbers: `1` pending, `2` approved, `3` declined.  
Media `status` numbers: `1` unknown, `2` pending, `3` processing, `4` partial, `5` available, `6` deleted.

### Other Seerr paths

| Domain | Paths |
|--------|--------|
| Person / collection | `GET /person/{id}`, `/person/{id}/combined_credits`, `GET /collection/{id}` |
| Media (tracked) | `GET /media`, `DELETE /media/{mediaId}`, `DELETE /media/{mediaId}/file?is4k=`, `POST /media/{mediaId}/{status}`, `GET /media/{mediaId}/watch_data` |
| Watchlist | `POST /watchlist`, `DELETE /watchlist/{tmdbId}` |
| Blocklist | `GET/POST /blocklist`, `GET/DELETE /blocklist/{tmdbId}`, collection variants; `/blacklist` alias |
| Radarr/Sonarr via Seerr | `GET /service/radarr`, `GET /service/radarr/{id}`, `GET /service/sonarr`, `GET /service/sonarr/{id}`, `GET /service/sonarr/lookup/{tmdbId}` |
| Admin Arr config | `/settings/radarr*`, `/settings/sonarr*` (usually out of scope — Umbrellarr already configures Arr) |

No Lidarr. Do not add music/artist requests through Seerr.

### Users, auth, settings (usually out of scope)

- Auth: `/auth/me`, `/auth/plex`, `/auth/jellyfin` (+ quickconnect), `/auth/local`, `/auth/logout`, `/auth/reset-password`
- Users: `/user*`, quotas, permissions, linked accounts, push
- Issues: `/issue*`
- Settings: Plex/Jellyfin, notifications, jobs, cache, logs, initialize — **except** `GET /settings/discover` (read sliders for our Discover page)
- Override rules: `/overrideRule*`
- Public: `GET /status`, `GET /status/appdata`

## Do not invent

- No Arr endpoint returns a ready-made “links[]” for a title.
- No Arr-provided Letterboxd/Trakt/MDBList objects — only IDs + Arr UI URL templates.
- Do not scrape Arr’s SPA HTML or CSS for data.
- Do not call TMDb/IMDb/MusicBrainz/etc. as a substitute for Arr metadata.
- For Discover/request features, do not call TMDB yourself — use Seerr’s `/search`, `/discover`, `/movie`, `/tv` (they already wrap TMDB and attach `mediaInfo`).
- Do not add a title from Discover via Arr `/movie/lookup` or `/series/lookup` — that is Seerr `POST /request`.
- Do not invent ratings, cast, plot, or availability beyond Arr or Seerr fields. Do not join Arr library onto Discover cards; use `mediaInfo`.
- Do not assume command names or body shapes without checking Arr’s `commandNames` / a live test.
- Do not treat Seerr `mediaId` as an Arr movie/series id — it is TMDB.
- Do not invent Lidarr/music support on Seerr.
- Do not check OpenAPI JSON/YAML into this repo (links go stale; fetch upstream when needed).

## When adding a feature

1. Find the tag/path in Arr OpenAPI / Arr frontend, or in [seerr-api.yml](https://raw.githubusercontent.com/seerr-team/seerr/develop/seerr-api.yml).
2. Add BFF route + shared Zod types that **passthrough/select** upstream fields (reshape for UI OK; inventing facts not OK).
3. Prefer `POST /command` for Arr jobs (refresh, search, rename). Prefer `POST /request` (create) + `/request/{id}/{status}` + `/retry` for request handling. Discover pages only read Seerr search/discover/details.
4. Update [umbrellarr-wiring.md](umbrellarr-wiring.md).
