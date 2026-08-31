import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
