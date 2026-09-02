import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema.js";

export type AppDatabase = ReturnType<typeof openDatabase>;

export function openDatabase(databasePath: string) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key_ciphertext TEXT NOT NULL,
      api_key_iv TEXT NOT NULL,
      api_key_tag TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_snapshots (
      instance_id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      item_count INTEGER NOT NULL,
      fetched_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      arr_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      sort_title TEXT NOT NULL,
      tmdb_id INTEGER,
      tvdb_id INTEGER,
      imdb_id TEXT,
      foreign_artist_id TEXT,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS library_items_instance_kind_arr
      ON library_items (instance_id, kind, arr_id);
  `);

  return drizzle(sqlite, { schema });
}
