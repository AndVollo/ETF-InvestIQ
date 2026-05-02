# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smart-deposit.spec.ts >> Smart Deposit >> page title is visible
- Location: tests/e2e/smart-deposit.spec.ts:58:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /smart deposit/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /smart deposit/i })

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
      - heading "הפקדה חכמה" [level=1] [ref=e31]
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Bucket
            - combobox [ref=e36]
          - generic [ref=e37]:
            - generic [ref=e38]: סכום הפקדה
            - spinbutton [ref=e39]: "1000"
          - generic [ref=e40]:
            - generic [ref=e41]: מטבע
            - combobox [ref=e42]:
              - option "דולר" [selected]
              - option "שקל"
        - button "חשב תוכנית" [ref=e43] [cursor=pointer]
      - generic [ref=e44]:
        - heading "היסטוריית הפקדות" [level=2] [ref=e45]
        - paragraph [ref=e46]: אין היסטוריית הפקדות
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const BUCKETS = {
  4   |   items: [
  5   |     {
  6   |       id: 1,
  7   |       name: 'Retirement',
  8   |       horizon_type: 'LONG',
  9   |       target_amount: 1000000,
  10  |       current_value_usd: 150000,
  11  |       holdings: [
  12  |         { ticker: 'VTI', weight_pct: 70, current_value_usd: 105000 },
  13  |         { ticker: 'BND', weight_pct: 30, current_value_usd: 45000 },
  14  |       ],
  15  |     },
  16  |   ],
  17  | }
  18  | 
  19  | const DEPOSIT_PLAN = {
  20  |   plan_id: 42,
  21  |   bucket_id: 1,
  22  |   total_deposit_usd: 5000,
  23  |   orders: [
  24  |     { ticker: 'VTI', units: 14, price_usd: 245.5, total_usd: 3437.0, rationale: 'underweight' },
  25  |     { ticker: 'BND', units: 16, price_usd: 96.5, total_usd: 1544.0, rationale: 'underweight' },
  26  |   ],
  27  |   total_allocated_usd: 4981.0,
  28  |   remainder_usd: 19.0,
  29  |   prices_stale: false,
  30  |   post_drift: [
  31  |     { ticker: 'VTI', current_pct: 70.0, target_pct: 70.0, post_pct: 70.1 },
  32  |     { ticker: 'BND', current_pct: 30.0, target_pct: 30.0, post_pct: 29.9 },
  33  |   ],
  34  | }
  35  | 
  36  | const CONFIRM_RESULT = {
  37  |   plan_id: 42,
  38  |   orders_written: 2,
  39  |   obsidian_path: '/Obsidian_Smart ETF/deposits/2026-01-01.md',
  40  | }
  41  | 
  42  | async function mockApis(page: import('@playwright/test').Page) {
  43  |   await page.route('**/api/settings/', (r) =>
  44  |     r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  45  |   )
  46  |   await page.route('**/api/buckets/', (r) => r.fulfill({ json: BUCKETS }))
  47  |   await page.route('**/api/deposit/plan', (r) => r.fulfill({ json: DEPOSIT_PLAN }))
  48  |   await page.route('**/api/deposit/confirm/**', (r) => r.fulfill({ json: CONFIRM_RESULT }))
  49  |   await page.route('**/api/deposit/history', (r) => r.fulfill({ json: { items: [] } }))
  50  | }
  51  | 
  52  | test.describe('Smart Deposit', () => {
  53  |   test.beforeEach(async ({ page }) => {
  54  |     await mockApis(page)
  55  |     await page.goto('/deposit')
  56  |   })
  57  | 
  58  |   test('page title is visible', async ({ page }) => {
> 59  |     await expect(page.getByRole('heading', { name: /smart deposit/i })).toBeVisible()
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  60  |   })
  61  | 
  62  |   test('bucket selector is populated', async ({ page }) => {
  63  |     const select = page.locator('select').first()
  64  |     await expect(select).toBeVisible()
  65  |     await expect(select.locator('option', { hasText: 'Retirement' })).toBeAttached()
  66  |   })
  67  | 
  68  |   test('calculate plan shows orders table', async ({ page }) => {
  69  |     // Select bucket
  70  |     await page.locator('select').first().selectOption('1')
  71  |     // Enter amount
  72  |     await page.getByLabel(/deposit amount/i).fill('5000')
  73  |     // Calculate
  74  |     await page.getByRole('button', { name: /calculate plan/i }).click()
  75  | 
  76  |     // Purchase plan section should appear
  77  |     await expect(page.getByText(/purchase plan/i)).toBeVisible()
  78  |     await expect(page.getByText('VTI')).toBeVisible()
  79  |     await expect(page.getByText('BND')).toBeVisible()
  80  |     await expect(page.getByText(/total allocated/i)).toBeVisible()
  81  |   })
  82  | 
  83  |   test('remainder is shown after calculating', async ({ page }) => {
  84  |     await page.locator('select').first().selectOption('1')
  85  |     await page.getByLabel(/deposit amount/i).fill('5000')
  86  |     await page.getByRole('button', { name: /calculate plan/i }).click()
  87  | 
  88  |     await expect(page.getByText(/remainder/i)).toBeVisible()
  89  |   })
  90  | 
  91  |   test('confirm button triggers success toast', async ({ page }) => {
  92  |     await page.locator('select').first().selectOption('1')
  93  |     await page.getByLabel(/deposit amount/i).fill('5000')
  94  |     await page.getByRole('button', { name: /calculate plan/i }).click()
  95  | 
  96  |     await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible()
  97  |     await page.getByRole('button', { name: /confirm/i }).click()
  98  | 
  99  |     // Success message
  100 |     await expect(page.getByText(/deposit executed|orders/i)).toBeVisible({ timeout: 5000 })
  101 |   })
  102 | 
  103 |   test('stale prices warning shown when flag is set', async ({ page }) => {
  104 |     await page.route('**/api/deposit/plan', (r) =>
  105 |       r.fulfill({ json: { ...DEPOSIT_PLAN, prices_stale: true } }),
  106 |     )
  107 |     await page.locator('select').first().selectOption('1')
  108 |     await page.getByLabel(/deposit amount/i).fill('5000')
  109 |     await page.getByRole('button', { name: /calculate plan/i }).click()
  110 | 
  111 |     await expect(page.getByText(/prices may be stale/i)).toBeVisible()
  112 |   })
  113 | })
  114 | 
```