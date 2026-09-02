import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const instancesTable = sqliteTable("instances", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // radarr | sonarr | lidarr | seerr
  baseUrl: text("base_url").notNull(),
  apiKeyCiphertext: text("api_key_ciphertext").notNull(),
  apiKeyIv: text("api_key_iv").notNull(),
  apiKeyTag: text("api_key_tag").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const metaTable = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Full list-shaped snapshot blob per instance+kind (fast hydrate). */
export const librarySnapshotsTable = sqliteTable("library_snapshots", {
  instanceId: text("instance_id").primaryKey(), // `${instanceId}:${kind}`
  kind: text("kind").notNull(), // movie | series | artist
  payload: text("payload").notNull(),
  itemCount: integer("item_count").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Indexed rows for list/search/nav — cache of Arr payloads, not a second media DB. */
export const libraryItemsTable = sqliteTable(
  "library_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    instanceId: text("instance_id").notNull(),
    kind: text("kind").notNull(), // movie | series | artist
    arrId: integer("arr_id").notNull(),
    title: text("title").notNull(),
    sortTitle: text("sort_title").notNull(),
    tmdbId: integer("tmdb_id"),
    tvdbId: integer("tvdb_id"),
    imdbId: text("imdb_id"),
    foreignArtistId: text("foreign_artist_id"),
    payload: text("payload").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("library_items_instance_kind_arr").on(table.instanceId, table.kind, table.arrId),
  ],
);
