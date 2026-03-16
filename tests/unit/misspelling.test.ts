import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the fallback path (no OPENAI_API_KEY set) and the public interface
// The module uses fetch internally — we mock it to return controlled JSON

const KNOWN_PATTERNS = [
  'phonetic confusion',
  'letter swap/doubling',
  'letter doubling',
  'complete mishear',
  'overly formal',
  'homophone drift',
  'over-simplification',
  'accent mark enthusiasm',
  'stopped listening',
  'Phonetic confusion',
  'Letter swap/doubling',
  'Letter doubling',
  'Complete mishear',
  'Overly formal',
  'Homophone drift',
  'Over-simplification',
  'Accent mark enthusiasm',
  'Stopped listening',
]

function makeFakeMisspellingResponse(name: string) {
  return {
    name_input: name,
    options: [
      { rank: 1, misspelling: name + 'z', pattern: 'Phonetic confusion', baristas_excuse: 'The music was too loud honestly.' },
      { rank: 2, misspelling: name + 'xx', pattern: 'Letter doubling', baristas_excuse: 'My hand slipped twice I swear.' },
      { rank: 3, misspelling: name.slice(0, 3) + 'y', pattern: 'Over-simplification', baristas_excuse: 'There were twelve people behind you.' },
    ],
  }
}

describe('generateMisspellings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Ensure OPENAI_API_KEY triggers the real fetch path
    process.env.OPENAI_API_KEY = 'sk-test-fake-key'
  })

  it('returns 3 options when API call succeeds', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)
    expect(result.options).toHaveLength(3)
  })

  it('each option has rank, misspelling, pattern, baristas_excuse', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)

    for (const opt of result.options) {
      expect(opt).toHaveProperty('rank')
      expect(opt).toHaveProperty('misspelling')
      expect(opt).toHaveProperty('pattern')
      expect(opt).toHaveProperty('baristas_excuse')
    }
  })

  it('misspelling is different from the original name', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)

    for (const opt of result.options) {
      expect(opt.misspelling).not.toBe(name)
    }
  })

  it('handles short names like "Al" via fallback', async () => {
    delete process.env.OPENAI_API_KEY
    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('Al')
    expect(result.options).toHaveLength(3)
    expect(result.name_input).toBe('Al')
  })

  it('handles long names like "Bartholomew" via fallback', async () => {
    delete process.env.OPENAI_API_KEY
    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('Bartholomew')
    expect(result.options).toHaveLength(3)
    expect(result.name_input).toBe('Bartholomew')
  })

  it('handles names with spaces like "Mary Jane" via fallback', async () => {
    delete process.env.OPENAI_API_KEY
    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('Mary Jane')
    expect(result.options).toHaveLength(3)
    expect(result.name_input).toBe('Mary Jane')
  })

  it('handles non-ASCII names like "Björn" via fallback', async () => {
    delete process.env.OPENAI_API_KEY
    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('Björn')
    expect(result.options).toHaveLength(3)
    expect(result.name_input).toBe('Björn')
  })

  it('options are ranked 1, 2, 3', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)
    const ranks = result.options.map(o => o.rank)
    expect(ranks).toContain(1)
    expect(ranks).toContain(2)
    expect(ranks).toContain(3)
  })

  it('baristas_excuse is a non-empty string', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)

    for (const opt of result.options) {
      expect(typeof opt.baristas_excuse).toBe('string')
      expect(opt.baristas_excuse.trim().length).toBeGreaterThan(0)
    }
  })

  it('pattern is a non-empty string', async () => {
    const name = 'Nissan'
    const fakeResponse = makeFakeMisspellingResponse(name)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(fakeResponse) } }],
      }),
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings(name)

    for (const opt of result.options) {
      expect(typeof opt.pattern).toBe('string')
      expect(opt.pattern.trim().length).toBeGreaterThan(0)
    }
  })

  it('falls back gracefully when API call fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('TestName')
    // Fallback still returns 3 options
    expect(result.options).toHaveLength(3)
  })

  it('falls back when API returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    }) as any

    const { generateMisspellings } = await import('@/lib/misspelling')
    const result = await generateMisspellings('TestName')
    expect(result.options).toHaveLength(3)
  })
})
