import { test, expect } from '@playwright/test'

const MOCK_SESSION_ID = 'test-session-abc123'

const MOCK_GENERATE_RESPONSE = {
  sessionId: MOCK_SESSION_ID,
  originalName: 'Nissan',
  primaryMisspelling: 'Neesan',
  imageUrl: '/placeholder-cup.svg',
  misspellings: [
    { name: 'Neesan', excuse: 'The music was very loud.', pattern: 'Phonetic confusion', rank: 1 },
    { name: 'Nissaan', excuse: 'My hand slipped twice.', pattern: 'Letter doubling', rank: 2 },
    { name: 'Ni-San', excuse: 'You seemed distinguished.', pattern: 'Overly formal', rank: 3 },
  ],
}

const MOCK_SESSION_RESPONSE = {
  sessionId: MOCK_SESSION_ID,
  originalName: 'Nissan',
  primaryMisspelling: 'Neesan',
  misspellings: [
    { name: 'Neesan', excuse: 'The music was very loud.', pattern: 'Phonetic confusion', rank: 1 },
    { name: 'Nissaan', excuse: 'My hand slipped twice.', pattern: 'Letter doubling', rank: 2 },
    { name: 'Ni-San', excuse: 'You seemed distinguished.', pattern: 'Overly formal', rank: 3 },
  ],
  imageUrl: '/placeholder-cup.svg',
  createdAt: Math.floor(Date.now() / 1000),
}

test.describe('Generate Flow (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/generate
    await page.route('/api/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GENERATE_RESPONSE),
      })
    })

    // Mock /api/session/:id
    await page.route(`/api/session/${MOCK_SESSION_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SESSION_RESPONSE),
      })
    })

    // Mock gallery API for landing page teaser
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 6, offset: 0 }),
      })
    })
  })

  test('typing name and submitting shows loading state', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('input[type="text"]')
    await input.fill('Nissan')

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Loading state should appear — the component renders "Our barista is concentrating..."
    await expect(page.getByText('Our barista is concentrating', { exact: false })).toBeVisible({ timeout: 5000 })
  })

  test('after API response, redirected to result page', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('input[type="text"]')
    await input.fill('Nissan')

    await page.locator('button[type="submit"]').click()

    // Wait for navigation to the result page
    await page.waitForURL(`**/result/${MOCK_SESSION_ID}`, { timeout: 15000 })
    expect(page.url()).toContain(`/result/${MOCK_SESSION_ID}`)
  })

  test('result page shows the primary misspelling "Neesan" prominently', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)

    // Wait for the page to render — use the large display div (not the button)
    await expect(page.locator('div').filter({ hasText: /^Neesan$/ }).first()).toBeVisible({ timeout: 10000 })
  })

  test("barista's excuse is visible on result page", async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)
    await expect(page.getByText('The music was very loud.', { exact: false })).toBeVisible({ timeout: 10000 })
  })

  test('cycling through misspelling tabs shows alternate names', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)

    // Wait for page to load — use the excuse text as anchor
    await expect(page.getByText('The music was very loud.', { exact: false })).toBeVisible({ timeout: 10000 })

    // Find and click the "Nissaan" tab button
    const nissaanBtn = page.locator('button', { hasText: 'Nissaan' })
    await expect(nissaanBtn).toBeVisible()
    await nissaanBtn.click()

    // After clicking, the excuse should update
    await expect(page.getByText('My hand slipped twice.', { exact: false })).toBeVisible({ timeout: 5000 })
  })

  test('Share on X button is present on result page', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)
    await expect(page.getByText('The music was very loud.', { exact: false })).toBeVisible({ timeout: 10000 })

    // Share on X is a button with "Share on X" text (uses window.open instead of an <a> link)
    const shareBtn = page.locator('button', { hasText: 'Share on X' })
    await expect(shareBtn).toBeVisible()
  })

  test('VS compare section or cup upload area is present', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)
    await expect(page.getByText('The music was very loud.', { exact: false })).toBeVisible({ timeout: 10000 })

    // The page has an upload section for VS compare — "Got a real one?" or "Upload Your Real Cup"
    const uploadSection = page.getByText('Got a real one', { exact: false })
      .or(page.getByText('Upload Your Real Cup', { exact: false }))
      .or(page.getByText('battle', { exact: false }))
    await expect(uploadSection.first()).toBeVisible()
  })

  test('coffee cup image is displayed on result page', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)
    await expect(page.getByText('The music was very loud.', { exact: false })).toBeVisible({ timeout: 10000 })

    // The result page renders a cup image (img or svg)
    const cupImg = page.locator('img, svg').first()
    await expect(cupImg).toBeVisible()
  })

  test('original name "Nissan" is shown on result page', async ({ page }) => {
    await page.goto(`/result/${MOCK_SESSION_ID}`)
    await expect(page.getByText('Nissan', { exact: false }).first()).toBeVisible({ timeout: 10000 })
  })
})
