# Umbrellarr ↔ Arr Wiring

When you add a new upstream Arr call, **append a row** to the tables below.

Auth to Arr: `X-Api-Key` via `apps/server/src/servarr/client.ts` (`arrFetch` / `arrJson`).  
Seerr uses the same client (`X-Api-Key`) against `{server}/api/v1` — different paths and payloads than Arr.  
Browser never sees Arr/Seerr API keys; it talks to the Umbrellarr BFF (`/api/*`) with the app session cookie when `APP_PASSWORD` is set.

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
| `servarr/movieActions.ts` | GET | `/api/v3/movie/lookup?term=` | Add New search (mapped lookup rows) |
| `servarr/movieActions.ts` | POST | `/api/v3/movie` | Add movie (lookup `tmdb:` seed + overrides; `addOptions.searchForMovie`) |
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
| `servarr/showActions.ts` | GET | `/api/v3/series/lookup?term=` | Add New search (mapped lookup rows) |
| `servarr/showActions.ts` | POST | `/api/v3/series` | Add series (lookup `tvdb:` seed + overrides; `addOptions`) |
| `servarr/showActions.ts` | POST | `/api/v3/command` | `{ name: "RefreshSeries", seriesId }` |
| `servarr/showActions.ts` | POST | `/api/v3/command` | `{ name: "SeriesSearch", seriesId }` |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/series/{id}` | Season expander summaries (`seasons[]` + statistics) |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/episode?seriesId=` | Episode rows |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/queue/details?seriesId=` | Mark episode status `downloading` when in Sonarr queue (EpisodeStatus.tsx) |
| `servarr/seriesSeasons.ts` | POST | `/api/v3/command` | `{ name: "SeasonSearch", seriesId, seasonNumber }` |
| `servarr/seriesSeasons.ts` | POST | `/api/v3/command` | `{ name: "EpisodeSearch", episodeIds }` |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/release?seriesId=&seasonNumber=` | Season interactive search (120s timeout) |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/release?episodeId=` | Episode interactive search (120s timeout) |
| `servarr/seriesSeasons.ts` | GET | `/api/v3/history/series?seriesId=&seasonNumber=` | Season-scoped history |
| `servarr/seriesSeasons.ts` | PUT | `/api/v3/series/{id}` | Season monitor toggle (GET-merge-PUT `seasons[n].monitored`) |
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
| `servarr/seriesRatings.ts` | GET (scrape) | TMDb `/tv/{tmdbId}` + IMDb title | Fill missing Sonarr `ratings.tmdb` / `ratings.imdb` from linked pages (prefer Arr; in-memory cache) |
| `servarr/artists.ts` | GET | `/api/v1/artist` | Full Lidarr artist library snapshot (covers → `/api/v1/mediacover/artist/{id}/{file}`) |
| `servarr/artists.ts` | GET | `/api/v1/qualityprofile` | Profile names for list/edit |
| `servarr/artists.ts` | GET | `/api/v1/metadataprofile` | Metadata profile names for list/edit |
| `servarr/artists.ts` | GET | `/api/v1/tag` | Tag labels for list/edit |
| `servarr/artists.ts` | GET | `/api/v1/wanted/cutoff?page=&pageSize=&monitored=true` | Cutoff-unmet artist IDs |
| `servarr/artistActions.ts` | GET | `/api/v1/qualityprofile` | Edit modal options |
| `servarr/artistActions.ts` | GET | `/api/v1/metadataprofile` | Edit modal metadata profiles |
| `servarr/artistActions.ts` | GET | `/api/v1/tag` | Edit modal options |
| `servarr/artistActions.ts` | GET | `/api/v1/rootfolder` | Edit modal root-folder dropdown |
| `servarr/artistActions.ts` | GET | `/api/v1/artist/{id}` | Artist page/detail (+ edit fields, overview, stats, `albumTypes`) |
| `servarr/artistActions.ts` | PUT | `/api/v1/artist/{id}` | Save edit (GET-merge-PUT) |
| `servarr/artistActions.ts` | DELETE | `/api/v1/artist/{id}?deleteFiles=&addImportListExclusion=false` | Remove from Lidarr |
| `servarr/artistActions.ts` | POST | `/api/v1/command` | `{ name: "RefreshArtist", artistIds }` |
| `servarr/artistActions.ts` | POST | `/api/v1/command` | `{ name: "ArtistSearch", artistIds }` |
| `servarr/artistAlbums.ts` | GET | `/api/v1/album?artistId=` | Album rows grouped by `albumType` (Lidarr `ArtistDetailsSeason.js`) |
| `servarr/artistAlbums.ts` | PUT | `/api/v1/album/monitor` | `{ albumIds, monitored }` |
| `servarr/artistAlbums.ts` | POST | `/api/v1/command` | `{ name: "AlbumSearch", albumIds }` |
| `servarr/artistAlbumTracks.ts` | GET | `/api/v1/album/{id}` + `/track?albumId=` + `/trackfile?albumId=` | Album modal tracks (join + cover + Details fields) |
| `servarr/artistActions.ts` | GET | `/api/v1/history/artist?artistId=&includeTrack=true` | Artist history modal (+ `data` for info details) |
| `servarr/artistActions.ts` | POST | `/api/v1/history/failed/{id}` | Mark grabbed history item as failed |
| `servarr/artistActions.ts` | GET | `/api/v1/release?artistId=` | Interactive search (120s timeout) |
| `servarr/artistActions.ts` | POST | `/api/v1/release` | Grab / override & grab release |
| `servarr/artistActions.ts` | GET | `/api/v1/blocklist?page=&pageSize=100` | Interactive search History column (filter `artistId`) |
| `servarr/artistActions.ts` | GET | `/api/v1/rename?artistId=` | Organize & Rename preview |
| `servarr/artistActions.ts` | GET | `/api/v1/config/naming` | Naming pattern for organize modal (`renameTracks` + track formats) |
| `servarr/artistActions.ts` | POST | `/api/v1/command` | `{ name: "RenameFiles", artistId, files }` |
| `servarr/artistActions.ts` | GET | `/api/v1/retag?artistId=` | Preview Retag / write metadata tags |
| `servarr/artistActions.ts` | POST | `/api/v1/command` | `{ name: "RetagFiles", artistId, files }` |
| `servarr/artistActions.ts` | POST | `/api/v1/albumStudio` | Artist Monitoring (`monitoringOptions.monitor`) |
| `servarr/artistActions.ts` | GET | `/api/v1/trackfile?artistId=` + `/api/v1/track?artistId=` | Manage Tracks modal (join like Lidarr TrackFileEditor) |
| `servarr/artistActions.ts` | GET | `/api/v1/qualityprofile/schema` | Manage Tracks quality dropdown |
| `servarr/artistActions.ts` | PUT | `/api/v1/trackfile/editor` | Manage Tracks bulk quality (`{ trackFileIds, quality }`) |
| `servarr/artistActions.ts` | DELETE | `/api/v1/trackfile/bulk` | Manage Tracks Delete (`{ trackFileIds }`) |
| `servarr/artistActions.ts` | — | (no upstream links API) | `buildArtistLinks` mirrors Lidarr UI (`ArtistDetailsLinks.js`: MusicBrainz + Arr `links[]`) |
| `servarr/seerrRequests.ts` | GET | `/api/v1/request?take=&skip=&filter=&mediaType=&sort=&sortDirection=` | Request list |
| `servarr/seerrRequests.ts` | GET | `/api/v1/request/{id}` | Request detail |
| `servarr/seerrRequests.ts` | GET | `/api/v1/movie/{tmdbId}`, `/api/v1/tv/{tmdbId}` | List enrichment + request detail page (overview, cast, seasons, links) |
| `servarr/seerrRequests.ts` | PUT | `/api/v1/request/{id}` | Edit overrides (server/profile/folder/tags/user/seasons) |
| `servarr/seerrRequests.ts` | POST | `/api/v1/request/{id}/approve`, `/api/v1/request/{id}/decline` | Approve / decline |
| `servarr/seerrRequests.ts` | GET | `/api/v1/service/radarr`, `/api/v1/service/sonarr` (+ `/{id}`) | Destination servers + profiles/folders/tags |
| `servarr/seerrRequests.ts` | GET | `/api/v1/user?take=1000&sort=displayname` | Request As users |
| `servarr/seerrRequests.ts` | GET | `/api/v1/request/count` | Request counts (BFF only; no sidebar badge yet) |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/discover/movies`, `/upcoming`, `/trending`, `/genreslider/movie`, studio logos | Discover Movies section (home fan-out); Featured mixes trending+popular |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/discover/tv`, `/upcoming`, `/trending`, `/genreslider/tv`, network logos | Discover Shows section (home fan-out) |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/discover/movies|tv` (+ studio/network/upcoming/trending query) | See-more paged lists (BFF aggregates Seerr’s 20/page into **50**/Load more) |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/search?query=&page=` | Discover page search (movie/tv filtered) |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/media?filter=pending\|processing\|partial\|available` | Cross-Seerr availability merge for Discover badges |
| `servarr/seerrDiscover.ts` | GET | `/api/v1/movie/{id}`, `/api/v1/tv/{id}` | Discover title shell (via `getSeerrTitleDetail`) |
| `servarr/status.ts` | GET | `/api/v3/system/status`, Lidarr/Prowlarr `/api/v1/system/status`, Seerr `/api/v1/status` | Instance health |
| `servarr/indexers.ts` | GET | `/api/v1/indexer` | Prowlarr indexer list (mapped; no API keys or settings fields except `baseUrl`) |
| `servarr/indexers.ts` | GET | `/api/v1/indexer/schema` | Add picker catalog (cached ~5m; slim list to browser) |
| `servarr/indexers.ts` | GET | `/api/v1/indexer/categories` | Category tree for add filters |
| `servarr/indexers.ts` | GET | `/api/v1/indexer/{id}` | Edit detail (schema `fields[]`; secrets masked to `********`) |
| `servarr/indexers.ts` | POST | `/api/v1/indexer?forceSave=` | Create from schema template + form patch |
| `servarr/indexers.ts` | PUT | `/api/v1/indexer/{id}?forceSave=` | Full-resource PUT after BFF secret merge |
| `servarr/indexers.ts` | DELETE | `/api/v1/indexer/{id}` | Remove indexer |
| `servarr/indexers.ts` | POST | `/api/v1/indexer/test?forceTest=` | Test current form (edit or create; does not persist) |
| `servarr/indexers.ts` | POST | `/api/v1/indexer/action/getUrls` | Prefetch Base URL select options on edit/template GET |
| `servarr/indexers.ts` | GET | `/api/v1/appprofile` | Sync profile names for indexer rows + edit dropdown |
| `servarr/indexers.ts` | GET | `/api/v1/tag` | Prowlarr tags for indexer edit |
| `servarr/indexers.ts` | GET | `/api/v1/downloadclient` | Download client picker (advanced) |
| `servarr/indexers.ts` | GET | `/{id}/api?apikey=&extended=1&t=search` | RSS feed (API key stays on the BFF; streamed as XML) |
| `routes/media.ts` | GET | Radarr/Sonarr `{path}` e.g. `/MediaCover/{id}/poster-500.jpg`; Lidarr `/api/v1/mediacover/artist/{id}/{file}` (API is jpg/png/gif only; `.jpeg` posters fall back to fanart/banner) | Image proxy (`arrFetch`; reject non-image) |
| `servarr/posterStatus.ts` | — | (derived) | Poster bar status from Arr `getProgressBarKind` + queue ids |
| `servarr/queueIds.ts` | GET | `/api/v3/queue` or `/api/v1/queue` | movieId / seriesId / artistId sets for queued/downloading bars |
| `servarr/calendar.ts` | GET | Radarr `/api/v3/calendar`, Sonarr `/api/v3/calendar?includeSeries=true`, Lidarr `/api/v1/calendar?includeArtist=true` | Unified calendar events (+ queue ids for movie/episode status) |
| `servarr/collections.ts` | GET | `/api/v3/collection` | Radarr collection list (+ nested movies) |
| `servarr/collections.ts` | GET | `/api/v3/qualityprofile` | Profile names on collection rows |
| `servarr/collections.ts` | PUT | `/api/v3/collection` | Bulk `CollectionUpdateResource` |
| `servarr/collections.ts` | POST | `/api/v3/command` | `{ name: "RefreshCollections" }` |
| `servarr/collections.ts` | GET | `/api/v3/qualityprofile` + `/api/v3/rootfolder` (+ tags via movie options) | Bulk-bar dropdowns |
| `servarr/queue.ts` | GET | `/api/v3/queue` or `/api/v1/queue` (+ `includeMovie` / `includeSeries`+`includeEpisode` / `includeArtist`+`includeAlbum`, unknown-items flags) | Per-instance queue list |
| `servarr/queue.ts` | GET | `/queue/status` | Queue counts / errors / warnings |
| `servarr/queue.ts` | DELETE | `/queue/{id}` and `/queue/bulk` (`removeFromClient`, `blocklist`, `skipRedownload`, `changeCategory`) | Remove single / selected |
| `servarr/queue.ts` | POST | `/queue/grab/{id}` and `/queue/grab/bulk` `{ ids }` | Grab delayed / unavailable items |
| `servarr/queue.ts` | GET/POST | `/manualimport?downloadId=` then POST reprocess rows | Queue Manual Import modal |
| `servarr/queue.ts` | POST | `/command` `{ name: "RefreshMonitoredDownloads" }` | Queue Refresh |
| `servarr/history.ts` | GET | Radarr/Sonarr `/api/v3/history`, Lidarr `/api/v1/history` | Unified library history |
| `servarr/history.ts` | GET | Prowlarr `/api/v1/history` | Indexer query/RSS/grab history (merged into unified) |
| `servarr/history.ts` | DELETE | Arr `/history/{id}` | Remove Arr history row (not Prowlarr) |
| `sync/arrSignalR.ts` | WS | `{baseUrl}/signalr/messages` | Live hub for Radarr/Sonarr/Lidarr **and Prowlarr**; browsers never connect |

## BFF routes → upstream

| BFF route | Handler | Upstream / behavior |
|-----------|---------|---------------------|
| `GET /api/movies?instanceId=` | `routes/movies.ts` | Library cache → Radarr `/movie` (+ profiles/tags/cutoff); optional instance filter |
| `GET /api/artists?instanceId=` | `routes/artists.ts` | Library cache → Lidarr `/artist` (+ quality/metadata profiles/tags/cutoff); lidarr-only |
| `GET /api/artists/:instanceId/options` | `routes/artists.ts` | qualityprofile + metadataprofile + tag + rootfolder |
| `GET /api/artists/:instanceId/naming` | `routes/artists.ts` | `/config/naming` |
| `GET /api/artists/:instanceId/qualities` | `routes/artists.ts` | `/qualityprofile/schema` (flattened) |
| `PUT /api/artists/:instanceId/files/bulk` | `routes/artists.ts` | `PUT /trackfile/editor` |
| `DELETE /api/artists/:instanceId/files/bulk` | `routes/artists.ts` | `DELETE /trackfile/bulk` |
| `POST /api/artists/:instanceId/history/:historyId/failed` | `routes/artists.ts` | `/history/failed/{id}` |
| `POST /api/artists/:instanceId/releases/grab` | `routes/artists.ts` | `POST /release` |
| `GET /api/artists/:instanceId/:artistId` | `routes/artists.ts` | `/artist/{id}` + quality/metadata profiles + tags (page detail) |
| `GET /api/artists/:instanceId/:artistId/links` | `routes/artists.ts` | `/artist/{id}` then mirror Lidarr UI links |
| `GET /api/artists/:instanceId/:artistId/albums` | `routes/artists.ts` | `/album?artistId=` grouped by `albumType` |
| `GET /api/artists/:instanceId/:artistId/albums/:albumId/tracks` | `routes/artists.ts` | album + tracks + trackfiles for album modal |
| `PUT /api/artists/:instanceId/:artistId/albums/monitor` | `routes/artists.ts` | `PUT /album/monitor` |
| `POST /api/artists/:instanceId/:artistId/albums/:albumId/search` | `routes/artists.ts` | `AlbumSearch` |
| `POST /api/artists/:instanceId/:artistId/refresh` | `routes/artists.ts` | `RefreshArtist` + cache invalidate |
| `POST /api/artists/:instanceId/:artistId/search` | `routes/artists.ts` | `ArtistSearch` |
| `GET /api/artists/:instanceId/:artistId/history` | `routes/artists.ts` | `/history/artist` |
| `GET /api/artists/:instanceId/:artistId/releases` | `routes/artists.ts` | `/release?artistId=` |
| `GET /api/artists/:instanceId/:artistId/blocklist` | `routes/artists.ts` | `/blocklist` (filter artist) |
| `GET /api/artists/:instanceId/:artistId/files` | `routes/artists.ts` | `/trackfile?artistId=` |
| `GET /api/artists/:instanceId/:artistId/rename` | `routes/artists.ts` | `/rename?artistId=` |
| `POST /api/artists/:instanceId/:artistId/organize` | `routes/artists.ts` | `RenameFiles` command |
| `GET /api/artists/:instanceId/:artistId/retag` | `routes/artists.ts` | `/retag?artistId=` |
| `POST /api/artists/:instanceId/:artistId/retag` | `routes/artists.ts` | `RetagFiles` command |
| `POST /api/artists/:instanceId/:artistId/monitoring` | `routes/artists.ts` | `POST /albumStudio` |
| `PUT /api/artists/:instanceId/:artistId` | `routes/artists.ts` | PUT `/artist/{id}` (`monitorNewItems`: all\|new\|none) + cache invalidate |
| `DELETE /api/artists/:instanceId/:artistId` | `routes/artists.ts` | DELETE `/artist/{id}` + cache invalidate |
| `GET /api/shows?instanceId=` | `routes/shows.ts` | Library cache → Sonarr `/series` (+ profiles/tags/cutoff); optional instance filter |
| `GET /api/shows/:instanceId/options` | `routes/shows.ts` | qualityprofile + tag + rootfolder |
| `GET /api/shows/:instanceId/lookup?term=` | `routes/shows.ts` | `/series/lookup?term=` |
| `POST /api/shows/:instanceId` | `routes/shows.ts` | lookup `tvdb:` + `POST /series` + library cache invalidate |
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
| `GET /api/shows/:instanceId/:seriesId/ratings` | `routes/shows.ts` | Prefer Sonarr ratings; scrape TMDb/IMDb pages to fill gaps |
| `POST /api/shows/:instanceId/:seriesId/refresh` | `routes/shows.ts` | `RefreshSeries` + cache invalidate |
| `POST /api/shows/:instanceId/:seriesId/search` | `routes/shows.ts` | `SeriesSearch` |
| `GET /api/shows/:instanceId/:seriesId/seasons` | `routes/shows.ts` | `/series/{id}` seasons + statistics |
| `GET /api/shows/:instanceId/:seriesId/episodes` | `routes/shows.ts` | `/episode?seriesId=` (optional `?seasonNumber=`) |
| `POST /api/shows/:instanceId/:seriesId/seasons/:seasonNumber/search` | `routes/shows.ts` | `SeasonSearch` |
| `PUT /api/shows/:instanceId/:seriesId/seasons/:seasonNumber/monitor` | `routes/shows.ts` | series GET-merge-PUT season monitored |
| `GET /api/shows/:instanceId/:seriesId/seasons/:seasonNumber/releases` | `routes/shows.ts` | `/release?seriesId=&seasonNumber=` |
| `POST /api/shows/:instanceId/:seriesId/episodes/:episodeId/search` | `routes/shows.ts` | `EpisodeSearch` |
| `GET /api/shows/:instanceId/:seriesId/episodes/:episodeId/releases` | `routes/shows.ts` | `/release?episodeId=` |
| `GET /api/shows/:instanceId/:seriesId/history` | `routes/shows.ts` | `/history/series` (optional `?seasonNumber=`) |
| `GET /api/shows/:instanceId/:seriesId/releases` | `routes/shows.ts` | `/release?seriesId=` |
| `GET /api/shows/:instanceId/:seriesId/blocklist` | `routes/shows.ts` | `/blocklist?seriesIds=` (flatten records) |
| `GET /api/shows/:instanceId/:seriesId/files` | `routes/shows.ts` | `/episodefile?seriesId=` (optional `?seasonNumber=`) |
| `GET /api/shows/:instanceId/:seriesId/rename` | `routes/shows.ts` | `/rename?seriesId=` (optional `?seasonNumber=`) |
| `POST /api/shows/:instanceId/:seriesId/organize` | `routes/shows.ts` | `RenameFiles` command |
| `PUT /api/shows/:instanceId/:seriesId` | `routes/shows.ts` | PUT `/series/{id}` + cache invalidate |
| `DELETE /api/shows/:instanceId/:seriesId` | `routes/shows.ts` | DELETE `/series/{id}` + cache invalidate |
| `GET /api/instances` | `routes/instances.ts` | SQLite-backed clients (no apiKey) |
| `POST /api/instances` | `routes/instances.ts` | Create client (encrypt API key) |
| `PUT /api/instances/:id` | `routes/instances.ts` | Update client |
| `DELETE /api/instances/:id` | `routes/instances.ts` | Remove client + cache invalidate |
| `POST /api/instances/test` | `routes/instances.ts` | Probe Arr `/system/status`, Prowlarr/Lidarr `/api/v1/system/status`, or Seerr `/api/v1/status` (no persist) |
| `GET /api/movies/:instanceId/options` | `routes/movies.ts` | qualityprofile + tag + rootfolder |
| `GET /api/movies/:instanceId/lookup?term=` | `routes/movies.ts` | `/movie/lookup?term=` |
| `POST /api/movies/:instanceId` | `routes/movies.ts` | lookup `tmdb:` + `POST /movie` + library cache refresh |
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
| `GET /api/requests/:instanceId` | `routes/requests.ts` | Seerr `/request` + TMDB title enrich via `/movie` or `/tv` |
| `GET /api/requests/:instanceId/count` | `routes/requests.ts` | Seerr `/request/count` |
| `GET /api/requests/:instanceId/users` | `routes/requests.ts` | Seerr `/user` |
| `GET /api/requests/:instanceId/services/:mediaType` | `routes/requests.ts` | Seerr `/service/radarr` or `/service/sonarr` |
| `GET /api/requests/:instanceId/services/:mediaType/:serverId` | `routes/requests.ts` | Seerr `/service/{radarr\|sonarr}/{id}` |
| `GET /api/requests/:instanceId/:requestId` | `routes/requests.ts` | Seerr `/request/{id}` + title/season options |
| `GET /api/requests/:instanceId/:requestId/page` | `routes/requests.ts` | Request + full Seerr `/movie` or `/tv` detail for request page |
| `PUT /api/requests/:instanceId/:requestId` | `routes/requests.ts` | PUT `/request/{id}` then optional POST `/approve` |
| `POST /api/requests/:instanceId/:requestId/approve` | `routes/requests.ts` | POST `/request/{id}/approve` |
| `POST /api/requests/:instanceId/:requestId/decline` | `routes/requests.ts` | POST `/request/{id}/decline` |
| `GET /api/discover/:instanceId/home` | `routes/discover.ts` | Fan-out Seerr discover rows (movies + shows buckets) |
| `GET /api/discover/:instanceId/movies` | `routes/discover.ts` | Seerr `/discover/movies` (+ genre/studio/upcoming/trending) |
| `GET /api/discover/:instanceId/tv` | `routes/discover.ts` | Seerr `/discover/tv` (+ genre/network/upcoming/trending) |
| `GET /api/discover/:instanceId/search` | `routes/discover.ts` | Seerr `/search` filtered to movie/tv |
| `GET /api/discover/:instanceId/title/:mediaType/:tmdbId` | `routes/discover.ts` | Seerr `/movie` or `/tv` → `SeerrMediaDetail` |
| `GET /api/media/:instanceId/image?path=` | `routes/media.ts` | Proxy covers (Radarr/Sonarr prefer `-500`; Lidarr mediacover API, jpg/png/gif only) |
| `GET /api/instances/status` | `routes/instances.ts` | Arr `/system/status`, Prowlarr/Lidarr `/api/v1/system/status`, or Seerr `/api/v1/status` per instance |
| `GET /api/health` | `routes/health.ts` | App health only |
| `GET /api/calendar?start=&end=&unmonitored=` | `routes/calendar.ts` | Merge Radarr/Sonarr/Lidarr calendars; per-instance errors are soft-fail |
| `GET /api/calendar.ics?token=` | `routes/calendar.ts` | Public aggregated iCal (token in `calendar_feed_token` meta; not Arr API keys) |
| `GET /api/collections?instanceId=` | `routes/collections.ts` | Radarr `/collection` + quality profiles; join in-library posters via movie `tmdbId` |
| `GET /api/collections/:instanceId/options` | `routes/collections.ts` | qualityprofile + rootfolder (movie edit options, no tags) |
| `POST /api/collections/:instanceId/refresh` | `routes/collections.ts` | `RefreshCollections` command |
| `PUT /api/collections/:instanceId` | `routes/collections.ts` | `PUT /collection` bulk update |
| `GET /api/queue?instanceId=` | `routes/queue.ts` | Arr `/queue` + `/queue/status`; unknown/protocol/status filters |
| `GET /api/queue/:instanceId/status` | `routes/queue.ts` | Arr `/queue/status` |
| `POST /api/queue/:instanceId/refresh` | `routes/queue.ts` | `RefreshMonitoredDownloads` |
| `DELETE /api/queue/:instanceId/:id` | `routes/queue.ts` | `DELETE /queue/{id}` |
| `DELETE /api/queue/:instanceId/bulk` | `routes/queue.ts` | `DELETE /queue/bulk` |
| `POST /api/queue/:instanceId/:id/grab` | `routes/queue.ts` | `POST /queue/grab/{id}` |
| `POST /api/queue/:instanceId/grab/bulk` | `routes/queue.ts` | `POST /queue/grab/bulk` |
| `GET /api/queue/:instanceId/manualimport` | `routes/queue.ts` | `GET /manualimport?downloadId=` |
| `POST /api/queue/:instanceId/manualimport` | `routes/queue.ts` | `POST /manualimport` |
| `GET /api/indexers/unified?instanceId=` | `routes/indexers.ts` | Prowlarr `/indexer` + `/appprofile`; merge across Prowlarr instances |
| `GET /api/indexers/:instanceId/options` | `routes/indexers.ts` | `/appprofile` + `/tag` + `/downloadclient` |
| `GET /api/indexers/:instanceId/schema` | `routes/indexers.ts` | Slim `/indexer/schema` list for add picker |
| `GET /api/indexers/:instanceId/schema/template?key=` | `routes/indexers.ts` | One schema template + getUrls; secrets masked |
| `GET /api/indexers/:instanceId/categories` | `routes/indexers.ts` | `/indexer/categories` for add filters |
| `POST /api/indexers/:instanceId?forceSave=` | `routes/indexers.ts` | Create indexer from template merge |
| `POST /api/indexers/:instanceId/test?forceTest=` | `routes/indexers.ts` | Create-mode test (no numeric id) |
| `GET /api/indexers/:instanceId/:id` | `routes/indexers.ts` | `/indexer/{id}` + `POST /indexer/action/getUrls`; secrets masked |
| `PUT /api/indexers/:instanceId/:id?forceSave=` | `routes/indexers.ts` | GET-merge-PUT `/indexer/{id}` (secret sentinel restored from live) |
| `DELETE /api/indexers/:instanceId/:id` | `routes/indexers.ts` | `DELETE /indexer/{id}` |
| `POST /api/indexers/:instanceId/:id/test?forceTest=` | `routes/indexers.ts` | `POST /indexer/test` with merged resource |
| `GET /api/indexers/:instanceId/:id/rss` | `routes/indexers.ts` | Proxy Prowlarr `/{id}/api?t=search` (session cookie; never send API key to browser) |
| `GET /api/history/unified?page=&pageSize=&instanceId=&eventType=&protocol=` | `routes/history.ts` | Merge Arr + Prowlarr history; protocol filter skips Prowlarr |
| `DELETE /api/history/:instanceId/:id` | `routes/history.ts` | Arr-only history delete |
| `GET /api/sync/revision` | `routes/sync.ts` | Cheap counters: library/queue/history/requests/issues/wanted/**indexers** |
| `GET /api/stats` | `routes/stats.ts` | Nav chips incl. `nav.indexers` + history totals (Arr + Prowlarr) |
| `GET /api/settings/calendar` | `routes/settings.ts` | Feed token presence + path (auth) |
| `POST /api/settings/calendar/token` | `routes/settings.ts` | Regenerate feed token |
| `POST /api/settings/calendar/token/ensure` | `routes/settings.ts` | Create feed token if missing |
| `/api/auth/*` | `routes/auth.ts` | App login; not Arr |

## UI entry points

| UI | File(s) | BFF used |
|----|---------|----------|
| Movies grid | `apps/web/src/pages/MoviesPage.tsx`, `VirtualizedMovieGrid.tsx` | `GET /api/movies?instanceId=` |
| Add New movie | `MovieAddSearchModal.tsx` | lookup + options + `POST /api/movies/:instanceId` |
| Movie detail page | `MovieDetailPage.tsx`, `components/movies/detail/*` | `GET .../:movieId` (rich page payload) |
| Poster click | `PosterCard.tsx` | navigates to `/movies/:instanceId/:movieId` |
| Settings (Arr + Seerr clients) | `SettingsPage.tsx` | instances CRUD + test |
| Sidebar Movies/Shows/Music/Requests | `AppLayout.tsx` | `GET /api/instances` |
| Poster hover refresh | `PosterCard.tsx` | `POST .../refresh` |
| Edit modal | `MovieEditModal.tsx` | options + detail + PUT/DELETE |
| Interactive Search modal | `MovieInteractiveSearchModal.tsx` | releases + grab + history + blocklist |
| Organize & Rename modal | `MovieOrganizeModal.tsx` | rename preview + naming + `RenameFiles` |
| Manage Files modal | `MovieManageFilesModal.tsx` | moviefile + qualities/languages/flags + bulk PUT/DELETE |
| History modal | `MovieHistoryModal.tsx` | `GET .../history` |
| Links menu | `MovieLinksMenu.tsx` | `GET .../links` |
| Poster images | `PosterCard.tsx` | `GET /api/media/.../image` |
| Settings instance health | `SettingsPage.tsx` | `/api/instances/status` |
| Requests page | `RequestsPage.tsx`, `RequestListRow`, `RequestEditModal` | `GET/PUT /api/requests…` → Seerr `/request*`, services, users |
| Request media detail | `RequestDetailPage.tsx`, `RequestDetailHero`, seasons + cast | `GET /api/requests/:instanceId/:requestId/page` → Seerr `/request` + `/movie` or `/tv` |
| Discover home | `DiscoverPage.tsx`, `DiscoverSectionBlock`, `DiscoverMediaRow`, `DiscoverPosterCard` | `GET /api/discover/:instanceId/home` + page search |
| Discover see-more | `DiscoverListPage.tsx` | `GET /api/discover/:instanceId/movies|tv` |
| Discover title shell | `DiscoverTitlePage.tsx`, `DiscoverLibraryAddModal.tsx` | `GET /api/discover/:instanceId/title/...`; Add → Arr `lookup` + `POST` movies/shows |
| Discover Featured | `DiscoverFeaturedHero.tsx` | Check it out → title; Add to library → same Arr modal |
| Shows library | `ShowsPage.tsx`, `ShowPosterCard`, sort/filter | `GET /api/shows` |
| Add New series | `ShowAddSearchModal.tsx` | lookup + options + `POST /api/shows/:instanceId` |
| Show detail (hero + toolbar + seasons) | `ShowDetailPage.tsx`, `ShowDetailHero`, `ShowDetailToolbar`, `ShowSeasonsPanel`, `ShowEditModal` | detail/links/update/delete + RefreshSeries / SeriesSearch + seasons/episodes |
| Show Interactive Search modal | `ShowInteractiveSearchModal.tsx` | releases + grab + history + blocklist |
| Show Organize & Rename modal | `ShowOrganizeModal.tsx` | rename preview + naming + `RenameFiles` |
| Show Manage Files modal | `ShowManageFilesModal.tsx` | episodefile + qualities/languages/flags + bulk PUT/DELETE |
| Show History modal | `ShowHistoryModal.tsx` | `GET .../history` (optional season filter) |
| Show seasons accordion | `ShowSeasonsPanel.tsx`, `ShowSeasonHeader.tsx`, `ShowEpisodeTable.tsx` | seasons + episodes + SeasonSearch / EpisodeSearch + season/episode releases + season-scoped rename/files/history + season monitor |
| Music artist grid | `ArtistsPage.tsx`, `VirtualizedArtistGrid`, `ArtistPosterCard` | `GET /api/artists?instanceId=` |
| Artist poster click | `ArtistPosterCard.tsx` | navigates to `/music/:instanceId/:artistId` |
| Artist detail (hero + toolbar + albums) | `ArtistDetailPage.tsx`, `ArtistDetailHero`, `ArtistDetailToolbar`, `ArtistAlbumsPanel`, `ArtistEditModal` | page detail + albums + RefreshArtist / ArtistSearch + album monitor / AlbumSearch |
| Artist album tracks modal | `ArtistAlbumModal.tsx`, `ArtistAlbumTrackDetailsModal.tsx` | album tracks + Details + Delete track file |
| Artist Interactive Search modal | `ArtistInteractiveSearchModal.tsx` | releases + grab + history + blocklist |
| Artist Organize & Rename modal | `ArtistOrganizeModal.tsx` | rename preview + naming + `RenameFiles` |
| Artist Preview Retag modal | `ArtistRetagModal.tsx` | retag preview + `RetagFiles` |
| Artist Monitoring modal | `ArtistMonitoringModal.tsx` | `POST /albumStudio` monitoring options |
| Artist Manage Tracks modal | `ArtistManageFilesModal.tsx` | track+trackfile join; Track/Path/Quality; Delete + Select Quality + Close |
| Artist History modal | `ArtistHistoryModal.tsx` | `GET .../history` |
| Artist hover refresh | `ArtistPosterCard.tsx` | `POST .../refresh` (`RefreshArtist`) |
| Artist edit modal | `ArtistEditModal.tsx` | options + detail + PUT/DELETE (includes metadata profile) |
| Artist links menu | `ArtistLinksMenu.tsx` | `GET .../links` (Lidarr UI patterns) |
| Calendar | `CalendarPage.tsx`, `components/calendar/*` | `GET /api/calendar`; iCal via feed token; click event → movie/show/artist detail |
| Collections | `CollectionsPage.tsx`, `VirtualizedCollectionList`, `components/collections/*` | `GET/PUT /api/collections`; refresh command; in-library poster → movie detail |
| Queue (per-instance) | `QueuePage.tsx`, `components/queue/*` | `GET/DELETE/POST /api/queue`; grab/remove/manualimport; poll list. Routes: `/movies/:id/queue`, `/shows/:id/queue`, `/music/:id/queue` |
| Indexers | `IndexersPage.tsx`, `components/indexers/*` | `GET /api/indexers/unified`; add modal schema/categories → create edit; edit modal GET/PUT/DELETE/test; RSS via `GET /api/indexers/:instanceId/:id/rss`; website is indexer `baseUrl`; sidebar count from `nav.indexers`; SignalR → `SyncRevision.indexers` |
| History (unified) | `HistoryPage.tsx`, `components/history/*` | `GET /api/history/unified` (Arr + Prowlarr); Prowlarr details modal (query/indexer/elapsed/url); Arr row delete |
| Settings calendar feed | `CalendarFeedPanel.tsx` | `GET/POST /api/settings/calendar*` |
| Unified Activity Queue / Missing | placeholders | `/activity/queue` still placeholder |
| Header Search | “coming soon” | none yet |

## Not wired (configured or placeholder only)

| Area | Notes |
|------|-------|
| Sonarr cast / crew | Not on series detail yet |
| Lidarr album detail **page** (full route) | Album tracks shown in modal from artist page |
| Lidarr Manual Import (interactive import) | Queue person-icon modal **Wired**; artist-toolbar entry still deferred |
| Lidarr retag | Artist Preview Retag **Wired** |
| Unified `/activity/queue` + Missing pages | Per-instance queue **Wired**; activity queue + missing placeholders |
| Dashboard queue/missing badges | Hardcoded `0` in stats |
| Movie / series lookup / add | Radarr + Sonarr Add New **Wired**. Lidarr **Not started**. |
| Interactive search custom-filter builder | Presets only (All / Approved / Rejected / Usenet / Torrent) |
| Folder browser for edit path | Not needed — root Select + movie-folder suffix |
| Seerr instance + client | Settings kind `seerr` **Wired** (`GET /api/v1/status` health) |
| Discover page | **Partial** — gated on Seerr + (Radarr ∨ Sonarr); Movies/Shows sections & routes gated per Arr. Home (Featured + Movies/Shows), page search, see-more grids, title shell, **Add to library → Radarr/Sonarr**. BFF `activityListCache` (`discover:*`, home 60s / list+search 30s); request mutations invalidate cache + `SyncRevision.requests` → UI invalidates `["discover"]`; focus-aware Seerr poll (~20s). No SignalR (Seerr). No Seerr create-from-Discover, watchlist, slider admin, or recently-added/requests rows. |
| Requests page + create/approve/retry | List + detail page + Approve/Decline + Edit (PUT then approve) **Wired**. Seerr create / retry / delete **Not started** (Discover fulfillment is Arr add). Header Search still “coming soon”. |
| Indexers add / edit / test / sync | List + add (schema picker → configure) + RSS/website + edit/test/delete + nav chip + SignalR freshness **Partial**. No clone or bulk edit yet. |
| Prowlarr history | Merged into unified History **Wired** (details modal; no per-row delete / clear). |

## Shared types (Arr-facing)

| Package file | Types |
|--------------|--------|
| `packages/shared/src/instances.ts` | `ArrKind` (`radarr` \| `sonarr` \| `lidarr`), `InstanceKind` (+ `seerr`), `Instance`, status |
| `packages/shared/src/media.ts` | `MediaItem`, `MediaKind` (`movie` \| `series` \| `artist`) |
| `packages/shared/src/movies.ts` | `MovieListItem`, `MovieDetail`, `MoviePageDetail`, `MovieLookupItem`, `MovieAddRequest`, history/release/rename/manage-files, edit/links schemas |
| `packages/shared/src/shows.ts` | `SeriesListItem`, `SeriesPageDetail`, `SeriesLookupItem`, `SeriesAddRequest`, edit/update/links schemas, history/release/rename/manage-files, `SeriesSeasonSummary` / `SeriesEpisode`, sort/filter options |
| `packages/shared/src/artists.ts` | `ArtistListItem`, `ArtistPageDetail`, `ArtistAlbum` / album groups, edit/update (incl. `metadataProfileId`), history/release/rename/manage-files, links, sort/filter options |
| `packages/shared/src/requests.ts` | Request list/query/update, `MediaRequestItem`, Seerr service/user/edit-detail, `RequestMediaPageDetail` / `SeerrMediaDetail` |
| `packages/shared/src/discover.ts` | `DiscoverCard`, rows (posters/genres/companies), `DiscoverHomeResponse`, list/search/title responses |
| `packages/shared/src/cache.ts` | `CacheStatus` (`HIT` / `MISS`) for library responses |
| `packages/shared/src/stats.ts` | Dashboard stats + `NavCounts` (incl. `indexers`) |
| `packages/shared/src/sync.ts` | `SyncRevision` (library/queue/history/requests/issues/wanted/**indexers**) |
| `packages/shared/src/history.ts` | `HistoryListItem` (`HistoryKind` incl. prowlarr), indexer event types, unified response |
| `packages/shared/src/indexers.ts` | `IndexerListItem`, `IndexerField` / `IndexerEditDetail` / `IndexerEditOptions` / `IndexerUpdateRequest`, `IndexerSchemaItem` / `IndexerSchemaTemplate` / `IndexerCreateRequest`, `INDEXER_SECRET_SENTINEL`, protocol/privacy/status/sort + filter options |
