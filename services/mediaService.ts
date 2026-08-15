// services/mediaService.ts
import * as SQLite from 'expo-sqlite';
import { getDb } from './database';
import { SearchResultItem } from './apiService';

export interface MediaItem {
  id: string;
  media_type: 'MOVIE' | 'TV' | 'BOOK';
  external_id?: string;
  title: string;
  overview?: string;
  poster_path?: string;
  total_pages: number;
  current_page: number;
  status: 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'DROPPED';
  date_added: string;
  current_episode?: number;
  total_episodes?: number;
}

export interface CustomList {
  id: string;
  title: string;
  emoji_icon: string;
  cover_color: string;
  list_type: 'ALL' | 'MOVIE' | 'TV' | 'BOOK';
  is_ranked: number;
  created_at: string;
  item_count?: number;
}

// Fetch all custom lists
export async function getCustomLists(): Promise<CustomList[]> {
  const db = await getDb();
  return await db.getAllAsync<CustomList>('SELECT * FROM lists ORDER BY created_at DESC;');
}

// Create a new custom list — no longer takes `db` as a param, matches lists.tsx's call site
export async function createCustomList(
  title: string,
  emojiIcon: string = '🍿',
  coverColor: string = '#E2F1E7',
  listType: 'ALL' | 'MOVIE' | 'TV' | 'BOOK' = 'ALL'
): Promise<CustomList | null> {
  const db = await getDb();
  const id = Date.now().toString();
  const createdAt = new Date().toISOString();

  try {
    await db.runAsync(
      `INSERT INTO lists (id, title, emoji_icon, cover_color, list_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, title, emojiIcon, coverColor, listType, createdAt]
    );

    return {
      id,
      title,
      emoji_icon: emojiIcon,
      cover_color: coverColor,
      list_type: listType,
      is_ranked: 0,
      created_at: createdAt,
      item_count: 0,
    };
  } catch (error) {
    console.error('Failed to create custom list:', error);
    return null;
  }
}

// Get media item by specific ID
export async function getMediaItemById(id: string): Promise<MediaItem | null> {
  const db = await getDb();

  const query = `
    SELECT 
      m.*,
      t.current_episode,
      t.total_episodes
    FROM media_items m
    LEFT JOIN tv_show_details t ON m.id = t.media_id
    WHERE m.id = ?;
  `;

  const row = await db.getFirstAsync<any>(query, [id]);
  if (!row) return null;

  return {
    id: row.id,
    media_type: row.media_type,
    title: row.title,
    overview: row.overview,
    poster_path: row.poster_path,
    total_pages: row.total_pages || 0,
    current_page: row.current_page || 0,
    status: row.status,
    date_added: row.date_added,
    current_episode: row.current_episode || 0,
    total_episodes: row.total_episodes || 0,
  };
}

// Fetch Media Items Filtered by Tab Status
export async function getMediaItemsByFilter(filter: 'IN_PROGRESS' | 'ALL' | 'COMPLETED' | 'DROPPED'): Promise<MediaItem[]> {
  const db = await getDb();

  let whereClause = '';
  if (filter === 'IN_PROGRESS') {
    whereClause = "WHERE m.status IN ('PLAN_TO_WATCH', 'WATCHING')";
  } else if (filter === 'COMPLETED') {
    whereClause = "WHERE m.status = 'COMPLETED'";
  } else if (filter === 'DROPPED') {
    whereClause = "WHERE m.status = 'DROPPED'";
  }

  const query = `
    SELECT 
      m.*,
      t.current_episode,
      t.total_episodes
    FROM media_items m
    LEFT JOIN tv_show_details t ON m.id = t.media_id
    ${whereClause}
    ORDER BY m.date_added DESC;
  `;

  const rows = await db.getAllAsync<any>(query);
  return rows.map((row) => ({
    id: row.id,
    media_type: row.media_type,
    title: row.title,
    overview: row.overview,
    poster_path: row.poster_path,
    total_pages: row.total_pages || 0,
    current_page: row.current_page || 0,
    status: row.status,
    date_added: row.date_added,
    current_episode: row.current_episode || 0,
    total_episodes: row.total_episodes || 0,
  }));
}

// Update Media Status directly (e.g., COMPLETED, DROPPED, WATCHING)
export async function updateMediaStatus(id: string, status: 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'DROPPED'): Promise<void> {
  const db = await getDb();
  const dateCompleted = status === 'COMPLETED' ? new Date().toISOString() : null;

  await db.runAsync(
    `UPDATE media_items SET status = ?, date_completed = ? WHERE id = ?;`,
    [status, dateCompleted, id]
  );
}

// Increment / Decrement episode or page progress
export async function updateProgress(id: string, mediaType: string, change: number): Promise<void> {
  const db = await getDb();

  if (mediaType === 'TV') {
    await db.runAsync(
      `UPDATE tv_show_details SET current_episode = MAX(0, current_episode + ?) WHERE media_id = ?;`,
      [change, id]
    );
  } else if (mediaType === 'BOOK') {
    await db.runAsync(
      `UPDATE media_items SET current_page = MAX(0, current_page + ?) WHERE id = ?;`,
      [change, id]
    );
  }
}

// Delete Item
export async function deleteMediaItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM media_items WHERE id = ?;`, [id]);
}

// DEV ONLY: wipe all rows from every table (does not drop tables/schema)
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM media_tags;
    DELETE FROM tags;
    DELETE FROM list_items;
    DELETE FROM lists;
    DELETE FROM tv_show_details;
    DELETE FROM media_items;
  `);
}

// Fetch a single list's metadata (title, emoji, color, type, etc.)
export async function getListById(id: string): Promise<CustomList | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CustomList>('SELECT * FROM lists WHERE id = ?;', [id]);
  return row ?? null;
}

// Fetch all media items belonging to a list, in their saved order
export async function getListItems(listId: string): Promise<MediaItem[]> {
  const db = await getDb();

  const query = `
    SELECT 
      m.*,
      t.current_episode,
      t.total_episodes
    FROM list_items li
    JOIN media_items m ON li.media_id = m.id
    LEFT JOIN tv_show_details t ON m.id = t.media_id
    WHERE li.list_id = ?
    ORDER BY li.position_index ASC;
  `;

  const rows = await db.getAllAsync<any>(query, [listId]);
  return rows.map((row) => ({
    id: row.id,
    media_type: row.media_type,
    title: row.title,
    overview: row.overview,
    poster_path: row.poster_path,
    total_pages: row.total_pages || 0,
    current_page: row.current_page || 0,
    status: row.status,
    date_added: row.date_added,
    current_episode: row.current_episode || 0,
    total_episodes: row.total_episodes || 0,
  }));
}

// Small helper for generating collision-resistant IDs when adding items quickly from search
function generateId(prefix?: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${Date.now()}_${rand}` : `${Date.now()}_${rand}`;
}

/**
 * Save a search result (from TMDb/Google Books via apiService) into the local library,
 * and optionally attach it to a specific list in the same step.
 *
 * - If this external item was already imported before (matched by external_id),
 *   it reuses the existing media_items row instead of creating a duplicate.
 * - If listId is provided and the item is already in that list, it's a no-op for list_items.
 */
export async function addSearchResultToLibrary(
  result: SearchResultItem,
  listId?: string
): Promise<{ mediaId: string; alreadyInList: boolean }> {
  const db = await getDb();

  // 1. Reuse existing media_items row if this external item was already imported
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM media_items WHERE external_id = ?;',
    [result.id]
  );

  let mediaId: string;

  if (existing) {
    mediaId = existing.id;
  } else {
    mediaId = generateId(result.media_type.toLowerCase());
    const dateAdded = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO media_items 
        (id, media_type, external_id, title, overview, poster_path, release_date, total_pages, status, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PLAN_TO_WATCH', ?);`,
      [
        mediaId,
        result.media_type,
        result.id,
        result.title,
        result.overview ?? null,
        result.poster_path ?? null,
        result.release_date ?? null,
        result.total_pages ?? 0,
        dateAdded,
      ]
    );

    if (result.media_type === 'TV') {
      const tvDetailId = generateId('tvd');
      await db.runAsync(
        `INSERT INTO tv_show_details (id, media_id, total_episodes) VALUES (?, ?, ?);`,
        [tvDetailId, mediaId, result.total_episodes ?? 0]
      );
    }
  }

  // 2. Optionally link into a specific list
  let alreadyInList = false;

  if (listId) {
    const existingLink = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM list_items WHERE list_id = ? AND media_id = ?;',
      [listId, mediaId]
    );

    if (existingLink) {
      alreadyInList = true;
    } else {
      const posRow = await db.getFirstAsync<{ maxPos: number | null }>(
        'SELECT MAX(position_index) as maxPos FROM list_items WHERE list_id = ?;',
        [listId]
      );
      const nextPosition = (posRow?.maxPos ?? -1) + 1;
      const listItemId = generateId('li');

      await db.runAsync(
        `INSERT INTO list_items (id, list_id, media_id, position_index) VALUES (?, ?, ?, ?);`,
        [listItemId, listId, mediaId, nextPosition]
      );
    }
  }

  return { mediaId, alreadyInList };
}