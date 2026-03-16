import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

let testDb: Database.Database

function createTestDb() {
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

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => testDb),
}))

function insertGalleryItem(db: Database.Database, overrides: Partial<{
  id: string
  original_name: string
  misspelled_name: string
  caption: string | null
  real_photo_url: string
  generated_image_url: string | null
  session_id: string | null
  votes: number
  approved: number
}> = {}) {
  const item = {
    id: uuidv4(),
    original_name: 'Nissan',
    misspelled_name: 'Neesan',
    caption: null,
    real_photo_url: '/uploads/test.jpg',
    generated_image_url: null,
    session_id: null,
    ...overrides,
  }
  db.prepare(`
    INSERT INTO gallery (id, original_name, misspelled_name, caption, real_photo_url, generated_image_url, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.original_name, item.misspelled_name, item.caption, item.real_photo_url, item.generated_image_url, item.session_id)
  return item
}

describe('GET /api/gallery', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns 200 with empty items and total=0 when no gallery items', async () => {
    const { GET } = await import('@/app/api/gallery/route')
    const req = new NextRequest('http://localhost:3002/api/gallery')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toEqual([])
    expect(data.total).toBe(0)
  })

  it('returns gallery item after insertion', async () => {
    const item = insertGalleryItem(testDb)
    const { GET } = await import('@/app/api/gallery/route')
    const req = new NextRequest('http://localhost:3002/api/gallery')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].id).toBe(item.id)
    expect(data.total).toBe(1)
  })

  it('paginates correctly: limit=2 returns max 2 items', async () => {
    insertGalleryItem(testDb)
    insertGalleryItem(testDb)
    insertGalleryItem(testDb)

    const { GET } = await import('@/app/api/gallery/route')
    const req = new NextRequest('http://localhost:3002/api/gallery?limit=2')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(2)
    expect(data.total).toBe(3)
    expect(data.limit).toBe(2)
  })

  it('does not return unapproved items', async () => {
    // Insert approved item
    insertGalleryItem(testDb)
    // Insert unapproved item (directly, bypassing the helper to set approved=0)
    const id = uuidv4()
    testDb.prepare(`
      INSERT INTO gallery (id, original_name, misspelled_name, real_photo_url, approved)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, 'Test', 'Tset', '/uploads/x.jpg')

    const { GET } = await import('@/app/api/gallery/route')
    const req = new NextRequest('http://localhost:3002/api/gallery')
    const res = await GET(req)
    const data = await res.json()

    expect(data.items).toHaveLength(1)
    expect(data.total).toBe(1)
  })
})

describe('POST /api/gallery/[id]/vote', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('increments votes by 1', async () => {
    const item = insertGalleryItem(testDb)
    const { POST } = await import('@/app/api/gallery/[id]/vote/route')

    const req = new NextRequest(`http://localhost:3002/api/gallery/${item.id}/vote`, { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: item.id }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.votes).toBe(1)
  })

  it('voting twice results in votes = 2', async () => {
    const item = insertGalleryItem(testDb)
    const { POST } = await import('@/app/api/gallery/[id]/vote/route')

    await POST(
      new NextRequest(`http://localhost:3002/api/gallery/${item.id}/vote`, { method: 'POST' }),
      { params: Promise.resolve({ id: item.id }) }
    )
    const res = await POST(
      new NextRequest(`http://localhost:3002/api/gallery/${item.id}/vote`, { method: 'POST' }),
      { params: Promise.resolve({ id: item.id }) }
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.votes).toBe(2)
  })

  it('returns 404 for non-existent gallery item', async () => {
    const { POST } = await import('@/app/api/gallery/[id]/vote/route')
    const fakeId = uuidv4()
    const req = new NextRequest(`http://localhost:3002/api/gallery/${fakeId}/vote`, { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: fakeId }) })

    expect(res.status).toBe(404)
  })
})
