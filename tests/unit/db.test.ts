import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@libsql/client'
import { v4 as uuidv4 } from 'uuid'

// Create an in-memory libsql client for tests
function createTestDb() {
  const db = createClient({ url: ':memory:' })
  return db
}

async function initSchema(db: ReturnType<typeof createClient>) {
  await db.executeMultiple(`
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
}

describe('Database operations', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(async () => {
    db = createTestDb()
    await initSchema(db)
  })

  it('client is defined', () => {
    expect(db).toBeDefined()
  })

  it('sessions table is created on init', async () => {
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
    )
    expect(result.rows).toHaveLength(1)
  })

  it('gallery table is created on init', async () => {
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='gallery'"
    )
    expect(result.rows).toHaveLength(1)
  })

  it('can insert and retrieve a session', async () => {
    const id = uuidv4()
    await db.execute({
      sql: `INSERT INTO sessions (id, original_name, primary_misspelling, misspellings_json, image_url)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, 'Nissan', 'Neesan', '[]', '/placeholder-cup.svg'],
    })

    const result = await db.execute({
      sql: 'SELECT * FROM sessions WHERE id = ?',
      args: [id],
    })
    const row = result.rows[0]
    expect(row).toBeDefined()
    expect(row.id).toBe(id)
    expect(row.original_name).toBe('Nissan')
    expect(row.primary_misspelling).toBe('Neesan')
    expect(row.misspellings_json).toBe('[]')
    expect(row.image_url).toBe('/placeholder-cup.svg')
  })

  it('can insert and retrieve a gallery item', async () => {
    const id = uuidv4()
    await db.execute({
      sql: `INSERT INTO gallery (id, original_name, misspelled_name, caption, real_photo_url, generated_image_url, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, 'Nissan', 'Neesan', 'Classic misunderstanding', '/uploads/cup.jpg', '/generated/ai.jpg', null],
    })

    const result = await db.execute({
      sql: 'SELECT * FROM gallery WHERE id = ?',
      args: [id],
    })
    const row = result.rows[0]
    expect(row).toBeDefined()
    expect(row.id).toBe(id)
    expect(row.original_name).toBe('Nissan')
    expect(row.misspelled_name).toBe('Neesan')
    expect(row.caption).toBe('Classic misunderstanding')
    expect(row.real_photo_url).toBe('/uploads/cup.jpg')
    expect(row.generated_image_url).toBe('/generated/ai.jpg')
  })

  it('votes default to 0', async () => {
    const id = uuidv4()
    await db.execute({
      sql: `INSERT INTO gallery (id, original_name, misspelled_name, real_photo_url)
            VALUES (?, ?, ?, ?)`,
      args: [id, 'Test', 'Tset', '/uploads/test.jpg'],
    })

    const result = await db.execute({
      sql: 'SELECT votes FROM gallery WHERE id = ?',
      args: [id],
    })
    expect(result.rows[0].votes).toBe(0)
  })

  it('approved defaults to 1', async () => {
    const id = uuidv4()
    await db.execute({
      sql: `INSERT INTO gallery (id, original_name, misspelled_name, real_photo_url)
            VALUES (?, ?, ?, ?)`,
      args: [id, 'Test', 'Tset', '/uploads/test.jpg'],
    })

    const result = await db.execute({
      sql: 'SELECT approved FROM gallery WHERE id = ?',
      args: [id],
    })
    expect(result.rows[0].approved).toBe(1)
  })
})
