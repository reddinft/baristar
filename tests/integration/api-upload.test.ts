import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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

// Read the test fixture JPEG
const FIXTURE_PATH = path.join(__dirname, '../fixtures/test-cup.jpg')
const FIXTURE_BYTES = fs.readFileSync(FIXTURE_PATH)

// Mock File class that mimics the browser File API for undici compatibility
function toUint8(c: BlobPart): Uint8Array {
  // Node.js Buffer IS a Uint8Array but instanceof can fail across realms
  if (Buffer.isBuffer(c)) return new Uint8Array(c.buffer, c.byteOffset, c.byteLength)
  if (c instanceof Uint8Array) return c
  if (c instanceof ArrayBuffer) return new Uint8Array(c)
  if (typeof c === 'string') return new TextEncoder().encode(c)
  return new Uint8Array(0)
}

class MockFile {
  name: string
  type: string
  size: number
  private _bytes: Uint8Array

  constructor(chunks: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name
    this.type = options?.type ?? ''
    const parts = chunks.map(toUint8)
    const total = parts.reduce((s, p) => s + p.length, 0)
    this._bytes = new Uint8Array(total)
    let offset = 0
    for (const p of parts) { this._bytes.set(p, offset); offset += p.length }
    this.size = this._bytes.length
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._bytes.buffer as ArrayBuffer
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this._bytes)
  }
}

/**
 * Build a mock request that returns a controlled FormData from formData().
 * This avoids undici's strict multipart parser in jsdom.
 */
function makeMockRequest(fields: {
  photo?: MockFile | null
  originalName?: string | null
  misspelledName?: string | null
  caption?: string
  sessionId?: string
}) {
  const {
    photo = new MockFile([FIXTURE_BYTES], 'test-cup.jpg', { type: 'image/jpeg' }),
    originalName = 'Nissan',
    misspelledName = 'Neesan',
    caption,
    sessionId,
  } = fields

  // Build a mock FormData-like object
  const formDataMap: Record<string, unknown> = {}
  if (photo !== null) formDataMap['photo'] = photo
  if (originalName !== null) formDataMap['originalName'] = originalName
  if (misspelledName !== null) formDataMap['misspelledName'] = misspelledName
  if (caption !== undefined) formDataMap['caption'] = caption
  if (sessionId !== undefined) formDataMap['sessionId'] = sessionId

  const mockFormData = {
    get: (key: string) => formDataMap[key] ?? null,
  }

  // Create a minimal NextRequest-like object
  const req = {
    formData: vi.fn().mockResolvedValue(mockFormData),
  } as unknown as NextRequest

  return req
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    testDb = createTestDb()
    vi.spyOn(process, 'cwd').mockReturnValue(os.tmpdir())
  })

  afterEach(() => {
    testDb.close()
    vi.restoreAllMocks()
  })

  it('returns 200 with galleryId for valid JPEG upload', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('galleryId')
    expect(typeof data.galleryId).toBe('string')
  })

  it('returns 400 when no photo provided', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({ photo: null })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/photo/i)
  })

  it('returns 400 for oversized file (>5MB)', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0xFF)
    const bigFile = new MockFile([bigBuffer], 'big.jpg', { type: 'image/jpeg' })
    const req = makeMockRequest({ photo: bigFile })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/5MB|size/i)
  })

  it('returns 400 for invalid file type (.txt)', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const textFile = new MockFile([Buffer.from('not an image')], 'test.txt', { type: 'text/plain' })
    const req = makeMockRequest({ photo: textFile })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/JPEG|PNG|WebP|HEIC|type|allowed/i)
  })

  it('returns 400 when originalName is missing', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({ originalName: null })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/name|required/i)
  })

  it('returns 400 when misspelledName is missing', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({ misspelledName: null })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/name|required/i)
  })

  it('successful upload creates gallery record with approved=1', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    const row = testDb.prepare('SELECT * FROM gallery WHERE id = ?').get(data.galleryId) as any
    expect(row).toBeDefined()
    expect(row.approved).toBe(1)
    expect(row.original_name).toBe('Nissan')
    expect(row.misspelled_name).toBe('Neesan')
  })

  it('uploaded file URL is stored in /uploads/ path', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = makeMockRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)

    const row = testDb.prepare('SELECT real_photo_url FROM gallery WHERE id = ?').get(data.galleryId) as any
    expect(row.real_photo_url).toMatch(/^\/uploads\//)
  })
})
