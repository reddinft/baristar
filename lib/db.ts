import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'baristar.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  
  // Create tables
  _db.exec(`
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
  
  return _db;
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
