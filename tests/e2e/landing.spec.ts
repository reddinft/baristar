import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/gallery so landing page teaser doesn't fail
    await page.route('/api/gallery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 6, offset: 0 }),
      })
    })
    await page.goto('/')
  })

  test('page title contains "Baristar"', async ({ page }) => {
    await expect(page).toHaveTitle(/Baristar/i)
  })

  test('headline is visible', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    const h1Text = await page.locator('h1').textContent()
    expect(h1Text).toBeTruthy()
    expect(h1Text!.length).toBeGreaterThan(3)
  })

  test('tagline about barista/name is visible', async ({ page }) => {
    // Use getByText with partial match and .first() to avoid strict mode violation
    await expect(page.getByText('See what a barista would write on your cup', { exact: false })).toBeVisible()
  })

  test('name input is present and focusable', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await expect(input).toBeVisible()
    await input.focus()
    await expect(input).toBeFocused()
  })

  test('submit button "☕ Make My Cup" is present', async ({ page }) => {
    const btn = page.locator('button[type="submit"]')
    await expect(btn).toBeVisible()
    const text = await btn.textContent()
    expect(text).toMatch(/Make My Cup/i)
  })

  test('submitting empty name does not navigate away (HTML validation or JS guard)', async ({ page }) => {
    const btn = page.locator('button[type="submit"]')
    // The button should be disabled when no input
    await expect(btn).toBeDisabled()
  })

  test('input accepts typing', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await input.fill('Nissan')
    await expect(input).toHaveValue('Nissan')
  })

  test('submit button becomes enabled after typing a name', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await input.fill('Nissan')
    const btn = page.locator('button[type="submit"]')
    await expect(btn).not.toBeDisabled()
  })

  test('page describes the app purpose', async ({ page }) => {
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/name/i)
    expect(body).toMatch(/barista/i)
  })
})
