import { createClient } from '@libsql/client';

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
  `);

  schemaInitialized = true;
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
