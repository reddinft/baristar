import { createClient } from '@libsql/client';
import type { BarryArchetype } from './misspelling';
import type { MisspellingResult } from './misspelling';

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    return createClient({ url, authToken });
  }

  // Local dev fallback
  return createClient({ url: 'file:./baristar-local.db' });
}

const client = getClient();

// Initialize schema
let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      primary_misspelling TEXT NOT NULL,
      misspellings_json TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      misspelled_name TEXT NOT NULL,
      caption TEXT,
      real_photo_url TEXT NOT NULL,
      generated_image_url TEXT,
      session_id TEXT,
      votes INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS misspelling_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT UNIQUE NOT NULL,
      name_input TEXT NOT NULL,
      archetypes TEXT NOT NULL,
      result_json TEXT NOT NULL,
      voice_used INTEGER DEFAULT 0,
      hit_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  schemaInitialized = true;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

export async function getCachedMisspelling(
  cacheKey: string
): Promise<{ result: MisspellingResult; archetypes: BarryArchetype[] } | null> {
  try {
    await ensureSchema();
    const result = await client.execute({
      sql: 'SELECT result_json, archetypes FROM misspelling_cache WHERE cache_key = ?',
      args: [cacheKey],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      result: JSON.parse(row.result_json as string) as MisspellingResult,
      archetypes: JSON.parse(row.archetypes as string) as BarryArchetype[],
    };
  } catch (err) {
    console.warn('[cache] getCachedMisspelling failed:', err);
    return null;
  }
}

export async function setCachedMisspelling(
  cacheKey: string,
  nameInput: string,
  archetypes: BarryArchetype[],
  result: MisspellingResult,
  voiceUsed: boolean
): Promise<void> {
  try {
    await ensureSchema();
    await client.execute({
      sql: `INSERT OR IGNORE INTO misspelling_cache
              (cache_key, name_input, archetypes, result_json, voice_used)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        cacheKey,
        nameInput,
        JSON.stringify(archetypes),
        JSON.stringify(result),
        voiceUsed ? 1 : 0,
      ],
    });
  } catch (err) {
    console.warn('[cache] setCachedMisspelling failed:', err);
  }
}

export async function incrementCacheHit(cacheKey: string): Promise<void> {
  try {
    await client.execute({
      sql: 'UPDATE misspelling_cache SET hit_count = hit_count + 1 WHERE cache_key = ?',
      args: [cacheKey],
    });
  } catch (err) {
    console.warn('[cache] incrementCacheHit failed:', err);
  }
}

export function getDb() {
  return client;
}

export interface SessionRecord {
  id: string;
  original_name: string;
  primary_misspelling: string;
  misspellings_json: string;
  image_url: string | null;
  created_at: number;
}

export interface GalleryRecord {
  id: string;
  original_name: string;
  misspelled_name: string;
  caption: string | null;
  real_photo_url: string;
  generated_image_url: string | null;
  session_id: string | null;
  votes: number;
  approved: number;
  created_at: number;
}
