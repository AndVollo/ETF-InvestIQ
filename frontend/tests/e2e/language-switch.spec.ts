import { test, expect } from '@playwright/test'

async function mockApis(page: import('@playwright/test').Page) {
  await page.route('**/api/settings/', (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route('**/api/settings/**', (r) =>
    r.fulfill({ json: { key: 'language', value: 'en' } }),
  )
  await page.route('**/api/buckets/', (r) => r.fulfill({ json: { items: [] } }))
}

test.describe('Language Switch (EN ↔ HE)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page)
  })

  test('default language is English — nav labels are in English', async ({ page }) => {
    await page.goto('/settings')
    // The settings page title should be in English by default
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
    await expect(page.getByText(/general/i)).toBeVisible()
  })

  test('switching to Hebrew changes nav labels to Hebrew', async ({ page }) => {
    await page.goto('/settings')

    const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
    await langSelect.selectOption('he')

    // After switching to Hebrew the heading should change
    await expect(page.getByRole('heading', { name: 'הגדרות' })).toBeVisible({ timeout: 3000 })
  })

  test('switching to Hebrew makes layout direction RTL', async ({ page }) => {
    await page.goto('/settings')

    const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
    await langSelect.selectOption('he')

    // The <html> or root element should have dir="rtl" after language switch
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('switching back to English restores LTR', async ({ page }) => {
    await page.goto('/settings')

    const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
    await langSelect.selectOption('he')
    await langSelect.selectOption('en')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Hebrew: navigation sidebar shows Hebrew labels', async ({ page }) => {
    await page.goto('/settings')

    const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
    await langSelect.selectOption('he')

    // Sidebar navigation should have Hebrew labels
    await expect(page.getByRole('link', { name: 'דשבורד' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('link', { name: 'הגדרות' })).toBeVisible()
  })

  test('English: navigation sidebar shows English labels', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('language persists across page navigation', async ({ page }) => {
    await page.goto('/settings')

    const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
    await langSelect.selectOption('he')

    // Navigate to dashboard
    await page.goto('/dashboard')
    // Dashboard title should still be in Hebrew
    await expect(page.getByRole('heading', { name: 'דשבורד' })).toBeVisible({ timeout: 3000 })
  })
})
