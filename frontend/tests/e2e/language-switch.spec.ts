import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Use Architect page for language tests: it renders immediately without API loading spinners
async function mockApis(page: Page) {
  await page.route(/\/api\/v1\/settings/, (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route(/\/api\/v1\/buckets/, (r) => r.fulfill({ json: [] }))
}

// The sidebar has two buttons: "עב" (Hebrew) and "EN" (English)

test.describe('Language Switch (EN ↔ HE)', () => {
  test('default language is Hebrew — dir is RTL', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('default language is Hebrew — nav labels are Hebrew', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await expect(page.getByRole('link', { name: /דשבורד/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /הגדרות/ })).toBeVisible()
  })

  test('default language is Hebrew — page heading is in Hebrew', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await expect(page.getByRole('heading', { name: 'ארכיטקט תיק' })).toBeVisible()
  })

  test('clicking EN button switches layout to LTR', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('clicking EN button switches page heading to English', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByRole('heading', { name: 'Portfolio Architect' })).toBeVisible({ timeout: 3000 })
  })

  test('clicking EN button switches nav labels to English', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('clicking עב button from English restores RTL', async ({ page }) => {
    await mockApis(page)
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    await page.goto('/architect')
    await page.getByRole('button', { name: 'עב' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('language persists across client-side navigation', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')

    // Switch to English
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    // Navigate via sidebar link (client-side)
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('language persists across hard page reload', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')

    // Switch to English
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    // Hard reload re-reads localStorage
    await page.reload()
    await mockApis(page)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })
})
