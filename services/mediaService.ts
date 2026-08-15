import * as SQLite from 'expo-sqlite';

export interface MediaItem {
  id: string;
  media_type: 'MOVIE' | 'TV' | 'BOOK';
  title: string;
  overview?: string;
  poster_path?: string;
  total_pages: number;
  current_page: number;
  status: 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'DROPPED';
  bgColor?: string;
  current_episode?: number;
  total_episodes?: number;
}

// Fetch media items dynamically based on selected filter tag
export async function getMediaItemsByFilter(filter: 'ALL' | 'IN_PROGRESS' | 'COMPLETED'): Promise<MediaItem[]> {
  const db = await SQLite.openDatabaseAsync('daise.db');
  
  let whereClause = '';
  if (filter === 'IN_PROGRESS') {
    whereClause = "WHERE m.status IN ('PLAN_TO_WATCH', 'WATCHING')";
  } else if (filter === 'COMPLETED') {
    whereClause = "WHERE m.status = 'COMPLETED'";
  }
  // If filter === 'ALL', no WHERE clause needed

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
    current_episode: row.current_episode || 0,
    total_episodes: row.total_episodes || 0,
  }));
}

// Increment progress by +1
export async function incrementProgress(id: string, mediaType: string): Promise<void> {
  const db = await SQLite.openDatabaseAsync('daise.db');

  if (mediaType === 'TV') {
    await db.runAsync(
      `UPDATE tv_show_details SET current_episode = current_episode + 1 WHERE media_id = ?;`,
      [id]
    );
  } else if (mediaType === 'BOOK') {
    await db.runAsync(
      `UPDATE media_items SET current_page = current_page + 1 WHERE id = ?;`,
      [id]
    );
  }
}

// Mark an item as COMPLETED
export async function markAsCompleted(id: string): Promise<void> {
  const db = await SQLite.openDatabaseAsync('daise.db');
  const dateCompleted = new Date().toISOString();

  await db.runAsync(
    `UPDATE media_items SET status = 'COMPLETED', date_completed = ? WHERE id = ?;`,
    [dateCompleted, id]
  );
}

// Delete item permanently
export async function deleteMediaItem(id: string): Promise<void> {
  const db = await SQLite.openDatabaseAsync('daise.db');
  await db.runAsync(`DELETE FROM media_items WHERE id = ?;`, [id]);
}

// Seed initial sample data into SQLite
export async function seedSampleDataIfEmpty(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('daise.db');
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM media_items;'
  );

  if (countResult && countResult.count === 0) {
    const now = new Date().toISOString();

    // Insert TV Show (In Progress)
    await db.runAsync(
      `INSERT INTO media_items (id, media_type, title, status, date_added) VALUES (?, ?, ?, ?, ?);`,
      ['1', 'TV', 'Demon Slayer Season 4', 'WATCHING', now]
    );
    await db.runAsync(
      `INSERT INTO tv_show_details (id, media_id, total_episodes, current_episode) VALUES (?, ?, ?, ?);`,
      ['tv_1', '1', 8, 3]
    );

    // Insert Book (In Progress)
    await db.runAsync(
      `INSERT INTO media_items (id, media_type, title, total_pages, current_page, status, date_added) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      ['2', 'BOOK', 'Tomorrow, and Tomorrow', 416, 120, 'WATCHING', now]
    );

    // Insert Movie (Completed)
    await db.runAsync(
      `INSERT INTO media_items (id, media_type, title, status, date_added) VALUES (?, ?, ?, ?, ?);`,
      ['3', 'MOVIE', 'Spirited Away', 'COMPLETED', now]
    );
  }
}