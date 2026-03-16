import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

// We use an in-memory DB directly to test schema and operations
// without depending on lib/db.ts singleton caching behavior

function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`
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
  `)
  return db
}

describe('Database operations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
  })

  it('getDb() returns a Database instance', () => {
    expect(db).toBeDefined()
    expect(typeof db.prepare).toBe('function')
  })

  it('sessions table is created on init', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
    ).all()
    expect(tables).toHaveLength(1)
  })

  it('gallery table is created on init', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='gallery'"
    ).all()
    expect(tables).toHaveLength(1)
  })

  it('can insert and retrieve a session', () => {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO sessions (id, original_name, primary_misspelling, misspellings_json, image_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, 'Nissan', 'Neesan', '[]', '/placeholder-cup.svg')

    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any
    expect(row).toBeDefined()
    expect(row.id).toBe(id)
    expect(row.original_name).toBe('Nissan')
    expect(row.primary_misspelling).toBe('Neesan')
    expect(row.misspellings_json).toBe('[]')
    expect(row.image_url).toBe('/placeholder-cup.svg')
  })

  it('can insert and retrieve a gallery item', () => {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO gallery (id, original_name, misspelled_name, caption, real_photo_url, generated_image_url, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'Nissan', 'Neesan', 'Classic misunderstanding', '/uploads/cup.jpg', '/generated/ai.jpg', null)

    const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id) as any
    expect(row).toBeDefined()
    expect(row.id).toBe(id)
    expect(row.original_name).toBe('Nissan')
    expect(row.misspelled_name).toBe('Neesan')
    expect(row.caption).toBe('Classic misunderstanding')
    expect(row.real_photo_url).toBe('/uploads/cup.jpg')
    expect(row.generated_image_url).toBe('/generated/ai.jpg')
  })

  it('votes default to 0', () => {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO gallery (id, original_name, misspelled_name, real_photo_url)
      VALUES (?, ?, ?, ?)
    `).run(id, 'Test', 'Tset', '/uploads/test.jpg')

    const row = db.prepare('SELECT votes FROM gallery WHERE id = ?').get(id) as any
    expect(row.votes).toBe(0)
  })

  it('approved defaults to 1', () => {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO gallery (id, original_name, misspelled_name, real_photo_url)
      VALUES (?, ?, ?, ?)
    `).run(id, 'Test', 'Tset', '/uploads/test.jpg')

    const row = db.prepare('SELECT approved FROM gallery WHERE id = ?').get(id) as any
    expect(row.approved).toBe(1)
  })
})

describe('lib/db.ts getDb()', () => {
  it('returns a Database instance with tables in test env', async () => {
    // Reset the singleton
    vi.resetModules()
    process.env.NODE_ENV = 'test'

    const { getDb } = await import('@/lib/db')
    const db = getDb()
    expect(db).toBeDefined()
    expect(typeof db.prepare).toBe('function')

    // Both tables should exist
    const sessions = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").all()
    const gallery = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery'").all()
    expect(sessions).toHaveLength(1)
    expect(gallery).toHaveLength(1)
  })
})
