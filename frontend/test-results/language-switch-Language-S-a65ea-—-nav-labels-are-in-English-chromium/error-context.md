# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: language-switch.spec.ts >> Language Switch (EN ↔ HE) >> default language is English — nav labels are in English
- Location: tests/e2e/language-switch.spec.ts:18:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /settings/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /settings/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]: InvestIQ
    - navigation [ref=e6]:
      - link "◉ דשבורד" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]: ◉
        - text: דשבורד
      - link "⬡ Buckets" [ref=e9] [cursor=pointer]:
        - /url: /buckets
        - generic [ref=e10]: ⬡
        - text: Buckets
      - link "↓ הפקדה חכמה" [ref=e11] [cursor=pointer]:
        - /url: /deposit
        - generic [ref=e12]: ↓
        - text: הפקדה חכמה
      - link "🌐 Universe Browser" [ref=e13] [cursor=pointer]:
        - /url: /universe
        - generic [ref=e14]: 🌐
        - text: Universe Browser
      - link "✦ ארכיטקט" [ref=e15] [cursor=pointer]:
        - /url: /architect
        - generic [ref=e16]: ✦
        - text: ארכיטקט
      - link "▦ ניתוח סקטורים" [ref=e17] [cursor=pointer]:
        - /url: /sectors
        - generic [ref=e18]: ▦
        - text: ניתוח סקטורים
      - link "↘ סימולציית מפולת" [ref=e19] [cursor=pointer]:
        - /url: /drawdown
        - generic [ref=e20]: ↘
        - text: סימולציית מפולת
      - link "📋 יומן החלטות" [ref=e21] [cursor=pointer]:
        - /url: /audit
        - generic [ref=e22]: 📋
        - text: יומן החלטות
      - link "⚙ הגדרות" [ref=e23] [cursor=pointer]:
        - /url: /settings
        - generic [ref=e24]: ⚙
        - text: הגדרות
    - generic [ref=e25]:
      - button "עב" [ref=e26] [cursor=pointer]
      - generic [ref=e27]: "|"
      - button "EN" [ref=e28] [cursor=pointer]
  - main [ref=e29]:
    - generic [ref=e30]:
      - heading "הגדרות" [level=1] [ref=e31]
      - generic [ref=e32]:
        - button "כללי" [ref=e33] [cursor=pointer]
        - button "מקורות נתונים" [ref=e34] [cursor=pointer]
        - button "Obsidian" [ref=e35] [cursor=pointer]
        - button "מתקדם" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]: שפה
          - combobox [ref=e41]:
            - option "עברית" [selected]
            - option "English"
        - generic [ref=e42]:
          - generic [ref=e43]: ערכת נושא
          - combobox [ref=e45]:
            - option "בהיר"
            - option "כהה"
            - option "מערכת" [selected]
        - generic [ref=e46]:
          - generic [ref=e47]: מטבע בסיס
          - combobox [ref=e49]:
            - option "דולר" [selected]
            - option "שקל"
        - generic [ref=e50]:
          - heading "מצב מס" [level=2] [ref=e51]
          - generic [ref=e52] [cursor=pointer]:
            - checkbox "אזרח/ית ארה\"ב (PFIC risk) כשמסומן, המערכת לא תציע מקבילות UCITS איריות בגלל סיכון PFIC." [ref=e53]
            - generic [ref=e54]:
              - generic [ref=e55]: אזרח/ית ארה"ב (PFIC risk)
              - generic [ref=e56]: כשמסומן, המערכת לא תציע מקבילות UCITS איריות בגלל סיכון PFIC.
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
> 21 |     await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
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
  84 |     await expect(page.getByRole('heading', { name: 'דשבורד' })).toBeVisible({ timeout: 3000 })
  85 |   })
  86 | })
  87 | 
```