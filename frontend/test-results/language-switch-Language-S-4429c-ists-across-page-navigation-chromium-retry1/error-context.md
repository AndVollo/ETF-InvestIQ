# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: language-switch.spec.ts >> Language Switch (EN ↔ HE) >> language persists across page navigation
- Location: tests/e2e/language-switch.spec.ts:75:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'דשבורד' })
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for getByRole('heading', { name: 'דשבורד' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Unexpected Application Error!" [level=2] [ref=e3]
  - heading "404 Not Found" [level=3] [ref=e4]
  - paragraph [ref=e5]: 💿 Hey developer 👋
  - paragraph [ref=e6]:
    - text: You can provide a way better UX than this when your app throws errors by providing your own
    - code [ref=e7]: ErrorBoundary
    - text: or
    - code [ref=e8]: errorElement
    - text: prop on your route.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | async function mockApis(page: import('@playwright/test').Page) {
  4  |   await page.route('**/api/settings/', (r) =>
  5  |     r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  6  |   )
  7  |   await page.route('**/api/settings/**', (r) =>
  8  |     r.fulfill({ json: { key: 'language', value: 'en' } }),
  9  |   )
  10 |   await page.route('**/api/buckets/', (r) => r.fulfill({ json: { items: [] } }))
  11 | }
  12 | 
  13 | test.describe('Language Switch (EN ↔ HE)', () => {
  14 |   test.beforeEach(async ({ page }) => {
  15 |     await mockApis(page)
  16 |   })
  17 | 
  18 |   test('default language is English — nav labels are in English', async ({ page }) => {
  19 |     await page.goto('/settings')
  20 |     // The settings page title should be in English by default
  21 |     await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  22 |     await expect(page.getByText(/general/i)).toBeVisible()
  23 |   })
  24 | 
  25 |   test('switching to Hebrew changes nav labels to Hebrew', async ({ page }) => {
  26 |     await page.goto('/settings')
  27 | 
  28 |     const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
  29 |     await langSelect.selectOption('he')
  30 | 
  31 |     // After switching to Hebrew the heading should change
  32 |     await expect(page.getByRole('heading', { name: 'הגדרות' })).toBeVisible({ timeout: 3000 })
  33 |   })
  34 | 
  35 |   test('switching to Hebrew makes layout direction RTL', async ({ page }) => {
  36 |     await page.goto('/settings')
  37 | 
  38 |     const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
  39 |     await langSelect.selectOption('he')
  40 | 
  41 |     // The <html> or root element should have dir="rtl" after language switch
  42 |     const dir = await page.locator('html').getAttribute('dir')
  43 |     expect(dir).toBe('rtl')
  44 |   })
  45 | 
  46 |   test('switching back to English restores LTR', async ({ page }) => {
  47 |     await page.goto('/settings')
  48 | 
  49 |     const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
  50 |     await langSelect.selectOption('he')
  51 |     await langSelect.selectOption('en')
  52 | 
  53 |     const dir = await page.locator('html').getAttribute('dir')
  54 |     expect(dir).toBe('ltr')
  55 |   })
  56 | 
  57 |   test('Hebrew: navigation sidebar shows Hebrew labels', async ({ page }) => {
  58 |     await page.goto('/settings')
  59 | 
  60 |     const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
  61 |     await langSelect.selectOption('he')
  62 | 
  63 |     // Sidebar navigation should have Hebrew labels
  64 |     await expect(page.getByRole('link', { name: 'דשבורד' })).toBeVisible({ timeout: 3000 })
  65 |     await expect(page.getByRole('link', { name: 'הגדרות' })).toBeVisible()
  66 |   })
  67 | 
  68 |   test('English: navigation sidebar shows English labels', async ({ page }) => {
  69 |     await page.goto('/settings')
  70 | 
  71 |     await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
  72 |     await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  73 |   })
  74 | 
  75 |   test('language persists across page navigation', async ({ page }) => {
  76 |     await page.goto('/settings')
  77 | 
  78 |     const langSelect = page.locator('select').filter({ hasText: /english|עברית/i }).first()
  79 |     await langSelect.selectOption('he')
  80 | 
  81 |     // Navigate to dashboard
  82 |     await page.goto('/dashboard')
  83 |     // Dashboard title should still be in Hebrew
> 84 |     await expect(page.getByRole('heading', { name: 'דשבורד' })).toBeVisible({ timeout: 3000 })
     |                                                                 ^ Error: expect(locator).toBeVisible() failed
  85 |   })
  86 | })
  87 | 
```