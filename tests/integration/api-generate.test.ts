import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'

// Create a shared in-memory DB for this test suite
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

const FAKE_MISSPELLINGS = {
  name_input: 'Nissan',
  options: [
    { rank: 1, misspelling: 'Neesan', pattern: 'Phonetic confusion', baristas_excuse: 'The music was very loud.' },
    { rank: 2, misspelling: 'Nissaan', pattern: 'Letter doubling', baristas_excuse: 'My hand slipped twice.' },
    { rank: 3, misspelling: 'Ni-San', pattern: 'Overly formal', baristas_excuse: 'You seemed distinguished.' },
  ],
}

vi.mock('@/lib/misspelling', () => ({
  generateMisspellings: vi.fn().mockResolvedValue(FAKE_MISSPELLINGS),
}))

vi.mock('@/lib/image-gen', () => ({
  generateCupImage: vi.fn().mockResolvedValue({ imageUrl: '/placeholder-cup.svg' }),
}))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => testDb),
}))

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3002/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('returns 200 with sessionId, misspellings, imageUrl for valid name', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'Nissan' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('sessionId')
    expect(data).toHaveProperty('misspellings')
    expect(data).toHaveProperty('imageUrl')
    expect(data).toHaveProperty('originalName')
    expect(data).toHaveProperty('primaryMisspelling')
  })

  it('returns 400 when name is empty string', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: '' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    // Empty string is falsy → "Name is required" (same as missing)
    expect(data.error).toMatch(/required|empty/i)
  })

  it('returns 400 when name is missing from body', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/required/i)
  })

  it('returns 400 for whitespace-only name', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: '   ' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/empty/i)
  })

  it('trims name to 50 chars when over limit', async () => {
    const { generateMisspellings } = await import('@/lib/misspelling')
    const mockFn = vi.mocked(generateMisspellings)
    mockFn.mockResolvedValueOnce({
      name_input: 'A'.repeat(50),
      options: FAKE_MISSPELLINGS.options,
    })

    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'A'.repeat(60) })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.originalName).toHaveLength(50)
  })

  it('returns exactly 3 misspellings', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'Nissan' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.misspellings).toHaveLength(3)
  })

  it('sessionId is a valid UUID', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'Nissan' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('session is stored in DB after successful generate', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'Nissan' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    const row = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(data.sessionId) as any
    expect(row).toBeDefined()
    expect(row.original_name).toBe('Nissan')
  })

  it('imageUrl is a string', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: 'Nissan' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(typeof data.imageUrl).toBe('string')
    expect(data.imageUrl.length).toBeGreaterThan(0)
  })

  it('originalName matches the trimmed input', async () => {
    const { POST } = await import('@/app/api/generate/route')
    const req = makeRequest({ name: '  Nissan  ' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.originalName).toBe('Nissan')
  })
})
