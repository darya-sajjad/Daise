import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('daise.db');

  // Enable foreign keys and create core tables matching the PRD schema
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY NOT NULL,
      media_type TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      overview TEXT,
      poster_path TEXT,
      release_date TEXT,
      creator_author TEXT,
      total_pages INTEGER DEFAULT 0,
      current_page INTEGER DEFAULT 0,
      book_format TEXT DEFAULT 'PAPERBACK',
      status TEXT NOT NULL DEFAULT 'PLAN_TO_WATCH',
      user_rating REAL,
      user_notes TEXT,
      date_added TEXT NOT NULL,
      date_completed TEXT,
      runtime_minutes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tv_show_details (
      id TEXT PRIMARY KEY NOT NULL,
      media_id TEXT UNIQUE NOT NULL,
      total_seasons INTEGER DEFAULT 1,
      total_episodes INTEGER DEFAULT 0,
      current_season INTEGER DEFAULT 1,
      current_episode INTEGER DEFAULT 0,
      episode_runtime_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      cover_color TEXT DEFAULT '#E2F1E7',
      list_type TEXT DEFAULT 'ALL',
      is_ranked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS list_items (
      id TEXT PRIMARY KEY NOT NULL,
      list_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      position_index INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      color_hex TEXT DEFAULT '#FFD1DC'
    );

    CREATE TABLE IF NOT EXISTS media_tags (
      media_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (media_id, tag_id),
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Migrations for anyone with a database from before runtime tracking existed —
  // CREATE TABLE IF NOT EXISTS above only applies the new columns to a brand new
  // table, so existing installs need these added on separately. Fails harmlessly
  // (caught below) if the column is already there.
  try {
    await db.execAsync(`ALTER TABLE media_items ADD COLUMN runtime_minutes INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists — nothing to do
  }
  try {
    await db.execAsync(`ALTER TABLE tv_show_details ADD COLUMN episode_runtime_minutes INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists — nothing to do
  }

  console.log('Database initialized successfully!');
  dbInstance = db;
  return db;
}

// Helper to access the initialized database instance across services
export async function getDb() {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
}