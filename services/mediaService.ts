// services/mediaService.ts
import * as SQLite from 'expo-sqlite';
import { getDb } from './database';

export interface MediaItem {
  id: string;
  media_type: 'MOVIE' | 'TV' | 'BOOK';
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