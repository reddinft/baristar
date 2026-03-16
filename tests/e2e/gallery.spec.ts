import { test, expect } from '@playwright/test'

const MOCK_GALLERY_ITEMS = [
  {
    id: 'gallery-item-1',
    original_name: 'Nissan',
    misspelled_name: 'Neesan',
    caption: 'The barista tried so hard.',
    real_photo_url: '/placeholder-cup.svg',
    generated_image_url: '/placeholder-cup.svg',
    session_id: null,
    votes: 5,
    created_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 'gallery-item-2',
    original_name: 'Sarah',
    misspelled_name: 'Saarah',
    caption: null,
    real_photo_url: '/placeholder-cup.svg',
    generated_image_url: null,
    session_id: null,
    votes: 2,
    created_at: Math.floor(Date.now() / 1000) - 3600,
  },
]

test.describe('Gallery Page', () => {
  test('/gallery page loads without error', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }),
      })
    })

    const res = await page.goto('/gallery')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('"Wall of Shame" heading is visible', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    // Use the h1 specifically to avoid strict mode violation with nav link also containing the text
    await expect(page.locator('h1', { hasText: 'Wall of Shame' })).toBeVisible({ timeout: 10000 })
  })

  test('empty state message shown when no items', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    // Empty state shows "Nothing here yet." or "Be the first"
    const emptyState = page.getByText('Nothing here yet', { exact: false })
      .or(page.getByText('Be the first', { exact: false }))
    await expect(emptyState.first()).toBeVisible({ timeout: 10000 })
  })

  test('gallery cards are rendered with mocked items', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_GALLERY_ITEMS, total: 2, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')

    // Both names should appear
    await expect(page.getByText('Nissan', { exact: false }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Sarah', { exact: false }).first()).toBeVisible({ timeout: 10000 })
  })

  test('gallery cards show misspelling names', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_GALLERY_ITEMS, total: 2, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    await expect(page.getByText('Neesan', { exact: false }).first()).toBeVisible({ timeout: 10000 })
  })

  test('VS compare layout sections are present in cards', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_GALLERY_ITEMS, total: 2, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    // The gallery card has "Real life" and "AI version" panels + "VS" badge
    await expect(page.getByText('VS', { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test('get your cup CTA link is present', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    // The gallery header has a "Get your cup →" button linking back to /
    const ctaLink = page.locator('a[href="/"]').first()
    await expect(ctaLink).toBeVisible({ timeout: 10000 })
  })

  test('vote button is present on gallery cards', async ({ page }) => {
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_GALLERY_ITEMS, total: 2, limit: 20, offset: 0 }),
      })
    })

    await page.goto('/gallery')
    await expect(page.getByText('Neesan', { exact: false }).first()).toBeVisible({ timeout: 10000 })

    // Vote button shows "votes" text
    const voteBtn = page.locator('button', { hasText: /vote/i }).first()
    await expect(voteBtn).toBeVisible()
  })
})
