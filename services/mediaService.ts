// services/mediaService.ts
import * as SQLite from 'expo-sqlite';
import { getDb } from './database';
import { SearchResultItem, getTVDetails } from './apiService';

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

export interface Tag {
  id: string;
  name: string;
  color_hex: string;
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
    whereClause = "WHERE m.status = 'WATCHING'";
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

  // Marking something Completed — whether you did that manually (e.g. binged it
  // without ticking off episodes along the way) or it happened automatically —
  // should also snap progress to the known total, so the numbers stay honest.
  // Only when the total is actually known; otherwise there's nothing to snap to.
  if (status === 'COMPLETED') {
    const item = await db.getFirstAsync<{ media_type: MediaItem['media_type']; total_pages: number }>(
      `SELECT media_type, total_pages FROM media_items WHERE id = ?;`,
      [id]
    );
    if (!item) return;

    if (item.media_type === 'TV') {
      const tv = await db.getFirstAsync<{ total_episodes: number }>(
        `SELECT total_episodes FROM tv_show_details WHERE media_id = ?;`,
        [id]
      );
      if (tv && tv.total_episodes > 0) {
        await db.runAsync(`UPDATE tv_show_details SET current_episode = ? WHERE media_id = ?;`, [
          tv.total_episodes,
          id,
        ]);
      }
    } else if (item.media_type === 'BOOK' && item.total_pages > 0) {
      await db.runAsync(`UPDATE media_items SET current_page = ? WHERE id = ?;`, [
        item.total_pages,
        id,
      ]);
    }
  }
}

// Increment / Decrement episode or page progress.
// Also auto-transitions status in two specific cases, without overriding any
// other manual status choice the user made:
//   - PLAN_TO_WATCH → WATCHING, the moment progress moves above 0
//   - anything → COMPLETED, the moment progress reaches the known total
export async function updateProgress(id: string, mediaType: string, change: number): Promise<void> {
  const db = await getDb();

  if (mediaType === 'TV') {
    const row = await db.getFirstAsync<{
      current_episode: number;
      total_episodes: number;
      status: MediaItem['status'];
    }>(
      `SELECT t.current_episode, t.total_episodes, m.status
       FROM tv_show_details t
       JOIN media_items m ON m.id = t.media_id
       WHERE t.media_id = ?;`,
      [id]
    );
    if (!row) return;

    const newValue = Math.max(0, row.current_episode + change);
    await db.runAsync(`UPDATE tv_show_details SET current_episode = ? WHERE media_id = ?;`, [
      newValue,
      id,
    ]);

    await maybeAutoUpdateStatus(id, row.status, newValue, row.total_episodes);
  } else if (mediaType === 'BOOK') {
    const row = await db.getFirstAsync<{
      current_page: number;
      total_pages: number;
      status: MediaItem['status'];
    }>(`SELECT current_page, total_pages, status FROM media_items WHERE id = ?;`, [id]);
    if (!row) return;

    const newValue = Math.max(0, row.current_page + change);
    await db.runAsync(`UPDATE media_items SET current_page = ? WHERE id = ?;`, [newValue, id]);

    await maybeAutoUpdateStatus(id, row.status, newValue, row.total_pages);
  }
}

async function maybeAutoUpdateStatus(
  id: string,
  currentStatus: MediaItem['status'],
  newProgress: number,
  total: number
): Promise<void> {
  // Reaching the known total always means "finished" — takes priority, and
  // applies from any status (except it's already a no-op if already Completed).
  if (total > 0 && newProgress >= total && currentStatus !== 'COMPLETED') {
    await updateMediaStatus(id, 'COMPLETED');
    return;
  }

  // Starting progress only promotes out of "Plan to Watch/Read" specifically —
  // if the user manually set Dropped or Completed, adding/removing progress
  // won't silently pull it back to Watching behind their back.
  if (newProgress > 0 && currentStatus === 'PLAN_TO_WATCH') {
    await updateMediaStatus(id, 'WATCHING');
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
 * and link it into one or more lists in the same step.
 *
 * List membership is now mandatory — every media item must belong to at least
 * one list, so this throws if listIds is empty. Callers (search.tsx) are
 * responsible for collecting at least one list before calling this.
 *
 * - If this external item was already imported before (matched by external_id),
 *   it reuses the existing media_items row instead of creating a duplicate.
 * - If the item is already in a given list, that list is a no-op (not duplicated).
 */
export async function addSearchResultToLibrary(
  result: SearchResultItem,
  listIds: string[]
): Promise<{ mediaId: string; addedToListIds: string[]; alreadyInListIds: string[] }> {
  if (!listIds || listIds.length === 0) {
    throw new Error('At least one list must be selected before adding an item.');
  }

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
      // TMDb's search results never include episode/season counts — only its
      // per-show details endpoint does — so fetch that separately here.
      let totalEpisodes = result.total_episodes ?? 0;
      let totalSeasons = 1;

      const tmdbId = Number(result.id.replace('tv_', ''));
      if (!isNaN(tmdbId)) {
        const details = await getTVDetails(tmdbId);
        if (details) {
          totalEpisodes = details.totalEpisodes;
          totalSeasons = details.totalSeasons;
        }
      }

      const tvDetailId = generateId('tvd');
      await db.runAsync(
        `INSERT INTO tv_show_details (id, media_id, total_episodes, total_seasons) VALUES (?, ?, ?, ?);`,
        [tvDetailId, mediaId, totalEpisodes, totalSeasons]
      );
    }
  }

  // 2. Link into every selected list
  const addedToListIds: string[] = [];
  const alreadyInListIds: string[] = [];

  for (const listId of listIds) {
    const existingLink = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM list_items WHERE list_id = ? AND media_id = ?;',
      [listId, mediaId]
    );

    if (existingLink) {
      alreadyInListIds.push(listId);
      continue;
    }

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
    addedToListIds.push(listId);
  }

  return { mediaId, addedToListIds, alreadyInListIds };
}

// ─── TAGS ───────────────────────────────────────────────────────

// Fetch every tag currently attached to a given media item
export async function getTagsForMedia(mediaId: string): Promise<Tag[]> {
  const db = await getDb();
  return await db.getAllAsync<Tag>(
    `SELECT t.id, t.name, t.color_hex
     FROM tags t
     JOIN media_tags mt ON mt.tag_id = t.id
     WHERE mt.media_id = ?
     ORDER BY t.name ASC;`,
    [mediaId]
  );
}

// Fetch every tag that exists in the app (for the "pick a tag" picker)
export async function getAllTags(): Promise<Tag[]> {
  const db = await getDb();
  return await db.getAllAsync<Tag>('SELECT id, name, color_hex FROM tags ORDER BY name ASC;');
}

// Create a brand new tag. Reuses an existing tag with the same name (case-insensitive)
// instead of creating a duplicate, since `name` is UNIQUE in the schema.
export async function createTag(name: string, colorHex: string = '#FFD1DC'): Promise<Tag> {
  const db = await getDb();
  const trimmedName = name.trim();

  const existing = await db.getFirstAsync<Tag>(
    'SELECT id, name, color_hex FROM tags WHERE LOWER(name) = LOWER(?);',
    [trimmedName]
  );
  if (existing) return existing;

  const id = generateId('tag');
  await db.runAsync('INSERT INTO tags (id, name, color_hex) VALUES (?, ?, ?);', [
    id,
    trimmedName,
    colorHex,
  ]);

  return { id, name: trimmedName, color_hex: colorHex };
}

// Attach a tag to a media item (no-op if already attached, since it's a composite PK)
export async function addTagToMedia(mediaId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO media_tags (media_id, tag_id) VALUES (?, ?);',
    [mediaId, tagId]
  );
}

// Detach a tag from a media item (the tag itself still exists for reuse elsewhere)
export async function removeTagFromMedia(mediaId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM media_tags WHERE media_id = ? AND tag_id = ?;', [
    mediaId,
    tagId,
  ]);
}

// Delete a tag entirely — removes it from every item it's attached to (via FK cascade),
// not just the current one. This is a global, irreversible action.
export async function deleteTag(tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tags WHERE id = ?;', [tagId]);
}