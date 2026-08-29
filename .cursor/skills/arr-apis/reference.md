# Arr API Reference

Capability-oriented groups — not a full OpenAPI dump (~160 paths per app). For exhaustive schemas, use the OpenAPI JSON links in [SKILL.md](SKILL.md).

Prefix: Radarr/Sonarr `/api/v3`, Lidarr `/api/v1`.

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

## Do not invent

- No Arr endpoint returns a ready-made “links[]” for a title.
- No Arr-provided Letterboxd/Trakt/MDBList objects — only IDs + Arr UI URL templates.
- Do not scrape Arr’s SPA HTML or CSS for data.
- Do not call TMDb/IMDb/MusicBrainz/etc. as a substitute for Arr metadata.
- Do not invent ratings, cast, plot, or availability beyond Arr fields.
- Do not assume command names or body shapes without checking Arr’s `commandNames` / a live test.
- Do not check OpenAPI JSON into this repo (links go stale; fetch upstream when needed).

## When adding a feature

1. Find the tag/path in OpenAPI or Arr frontend.
2. Add BFF route + shared Zod types that **passthrough/select** Arr fields (reshape for UI OK; inventing facts not OK).
3. Prefer `POST /command` for Arr jobs (refresh, search, rename) over inventing side effects.
4. Update [umbrellarr-wiring.md](umbrellarr-wiring.md).
