# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: architect-wizard.spec.ts >> Architect Wizard — 6-step flow >> step 2 → step 3: ingest tickers shows accepted list
- Location: tests/e2e/architect-wizard.spec.ts:103:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel(/goal/i)

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
      - heading "ארכיטקט תיק" [level=1] [ref=e31]
      - heading "הגדר פרופיל משקיע" [level=2] [ref=e38]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]: ה-Buckets שלי
          - combobox [ref=e42]
        - generic [ref=e43]:
          - generic [ref=e44]: תאר את המטרה
          - textbox [ref=e45]
        - generic [ref=e46]:
          - generic [ref=e47]: סכום יעד (₪)
          - spinbutton [ref=e48]
        - generic [ref=e49]:
          - generic [ref=e50]: הפקדה חודשית (₪)
          - spinbutton [ref=e51]
        - button "התחל" [ref=e52] [cursor=pointer]
```

# Test source

```ts
  5   | const SESSION = {
  6   |   id: 1,
  7   |   bucket_id: 1,
  8   |   status: 'DRAFT',
  9   |   created_at: '2026-01-01T00:00:00Z',
  10  |   updated_at: '2026-01-01T00:00:00Z',
  11  |   drawdown_acknowledged_at: null,
  12  | }
  13  | 
  14  | const CANDIDATES_RESULT = {
  15  |   session_id: 1,
  16  |   accepted: [
  17  |     { ticker: 'VTI', name: 'Vanguard Total Market', domicile: 'US', distribution: 'dist', ucits: false, ter: 0.03 },
  18  |     { ticker: 'BND', name: 'Vanguard Total Bond', domicile: 'US', distribution: 'dist', ucits: false, ter: 0.03 },
  19  |   ],
  20  |   rejected: [],
  21  |   engineer_prompt: 'Analyze VTI, BND for a long-term portfolio.',
  22  | }
  23  | 
  24  | const ALLOCATION_RESULT = {
  25  |   session_id: 1,
  26  |   status: 'PENDING_REVIEW',
  27  |   holdings: [
  28  |     { ticker: 'VTI', weight_pct: 70, rationale: 'Broad US equity exposure' },
  29  |     { ticker: 'BND', weight_pct: 30, rationale: 'Stabilizer' },
  30  |   ],
  31  |   ucits_advisory: null,
  32  |   cooling_off_until: null,
  33  | }
  34  | 
  35  | const DRAWDOWN_RESULT = {
  36  |   simulation_id: 0,
  37  |   bucket_id: 0,
  38  |   scenarios: [
  39  |     { name: '2000 Dot-Com', drawdown_pct: -47.0, loss_usd: 47000, proxy_used: 'VTI' },
  40  |     { name: '2008 GFC', drawdown_pct: -55.0, loss_usd: 55000, proxy_used: 'VTI' },
  41  |     { name: '2020 COVID', drawdown_pct: -34.0, loss_usd: 34000, proxy_used: 'VTI' },
  42  |     { name: '2022 Rate Hike', drawdown_pct: -19.5, loss_usd: 19500, proxy_used: 'VTI' },
  43  |   ],
  44  |   worst_case_pct: -55.0,
  45  |   worst_case_loss_usd: 55000,
  46  | }
  47  | 
  48  | const CONFIRM_RESULT = {
  49  |   session_id: 1,
  50  |   holdings_written: 2,
  51  |   cooling_off_until: null,
  52  | }
  53  | 
  54  | const BUCKETS = {
  55  |   items: [
  56  |     { id: 1, name: 'Retirement', horizon_type: 'LONG', target_amount: 1000000, current_value_usd: 100000, holdings: [] },
  57  |   ],
  58  | }
  59  | 
  60  | // ── Helpers ───────────────────────────────────────────────────────────────────
  61  | 
  62  | async function mockApis(page: import('@playwright/test').Page) {
  63  |   await page.route('**/api/settings/', (r) =>
  64  |     r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  65  |   )
  66  |   await page.route('**/api/buckets/', (r) => r.fulfill({ json: BUCKETS }))
  67  |   await page.route('**/api/architect/sessions', (r) => r.fulfill({ json: SESSION }))
  68  |   await page.route('**/api/architect/sessions/1/ingest', (r) => r.fulfill({ json: CANDIDATES_RESULT }))
  69  |   await page.route('**/api/architect/sessions/1/allocation', (r) => r.fulfill({ json: ALLOCATION_RESULT }))
  70  |   await page.route('**/api/architect/sessions/1/drawdown', (r) =>
  71  |     r.fulfill({
  72  |       json: {
  73  |         ...DRAWDOWN_RESULT,
  74  |         session: { ...SESSION, drawdown_acknowledged_at: '2026-01-01T01:00:00Z' },
  75  |       },
  76  |     }),
  77  |   )
  78  |   await page.route('**/api/architect/sessions/1/confirm', (r) => r.fulfill({ json: CONFIRM_RESULT }))
  79  | }
  80  | 
  81  | // ── Tests ─────────────────────────────────────────────────────────────────────
  82  | 
  83  | test.describe('Architect Wizard — 6-step flow', () => {
  84  |   test.beforeEach(async ({ page }) => {
  85  |     await mockApis(page)
  86  |     await page.goto('/architect')
  87  |   })
  88  | 
  89  |   test('step 1: investor profile form is visible', async ({ page }) => {
  90  |     await expect(page.getByRole('heading', { name: /architect/i })).toBeVisible()
  91  |     // Step 1 title
  92  |     await expect(page.getByText(/define investor profile/i)).toBeVisible()
  93  |   })
  94  | 
  95  |   test('step 1 → step 2: start session after filling profile', async ({ page }) => {
  96  |     await page.getByLabel(/goal/i).fill('Retire comfortably at 65')
  97  |     await page.getByLabel(/target amount/i).fill('1000000')
  98  |     await page.getByLabel(/monthly deposit/i).fill('5000')
  99  |     await page.getByRole('button', { name: /start/i }).click()
  100 |     await expect(page.getByText(/enter candidates/i)).toBeVisible()
  101 |   })
  102 | 
  103 |   test('step 2 → step 3: ingest tickers shows accepted list', async ({ page }) => {
  104 |     // Skip to step 2 by clicking Start
> 105 |     await page.getByLabel(/goal/i).fill('Retire comfortably')
      |                                    ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  106 |     await page.getByLabel(/target amount/i).fill('500000')
  107 |     await page.getByLabel(/monthly deposit/i).fill('2000')
  108 |     await page.getByRole('button', { name: /start/i }).click()
  109 | 
  110 |     await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
  111 |     await page.getByRole('button', { name: /submit/i }).click()
  112 | 
  113 |     await expect(page.getByText(/accepted/i)).toBeVisible()
  114 |     await expect(page.getByText('VTI')).toBeVisible()
  115 |     await expect(page.getByText('BND')).toBeVisible()
  116 |   })
  117 | 
  118 |   test('step 3 copy-prompt button is present', async ({ page }) => {
  119 |     await page.getByLabel(/goal/i).fill('Retire comfortably')
  120 |     await page.getByLabel(/target amount/i).fill('500000')
  121 |     await page.getByLabel(/monthly deposit/i).fill('2000')
  122 |     await page.getByRole('button', { name: /start/i }).click()
  123 | 
  124 |     await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
  125 |     await page.getByRole('button', { name: /submit/i }).click()
  126 | 
  127 |     await expect(page.getByRole('button', { name: /copy prompt/i })).toBeVisible()
  128 |   })
  129 | })
  130 | 
  131 | test.describe('Architect Wizard — drawdown gate', () => {
  132 |   test('confirm button is disabled until drawdown reviewed', async ({ page }) => {
  133 |     await mockApis(page)
  134 |     await page.goto('/architect')
  135 | 
  136 |     // Navigate to step 5/6 area by driving through the wizard
  137 |     await page.getByLabel(/goal/i).fill('Growth')
  138 |     await page.getByLabel(/target amount/i).fill('200000')
  139 |     await page.getByLabel(/monthly deposit/i).fill('1000')
  140 |     await page.getByRole('button', { name: /start/i }).click()
  141 | 
  142 |     await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
  143 |     await page.getByRole('button', { name: /submit/i }).click()
  144 | 
  145 |     // Step 3 → 4: next
  146 |     await page.getByRole('button', { name: /next/i }).click()
  147 | 
  148 |     // Step 4: paste JSON allocation
  149 |     const allocationJson = JSON.stringify([
  150 |       { ticker: 'VTI', weight_pct: 70 },
  151 |       { ticker: 'BND', weight_pct: 30 },
  152 |     ])
  153 |     await page.getByRole('button', { name: /paste json/i }).click()
  154 |     await page.evaluate((json) => {
  155 |       const el = document.querySelector('textarea[placeholder]')
  156 |       if (el) {
  157 |         ;(el as HTMLTextAreaElement).value = json
  158 |         el.dispatchEvent(new Event('input', { bubbles: true }))
  159 |       }
  160 |     }, allocationJson)
  161 |     await page.getByRole('button', { name: /submit/i }).click()
  162 | 
  163 |     // On step 5: drawdown button should appear, confirm should not be present yet
  164 |     await expect(page.getByRole('button', { name: /run drawdown/i })).toBeVisible()
  165 |     const confirmBtn = page.getByRole('button', { name: /confirm/i })
  166 |     // Confirm is absent until drawdown reviewed
  167 |     await expect(confirmBtn).not.toBeVisible()
  168 |   })
  169 | })
  170 | 
```