import { test, expect } from '@playwright/test'

// ── API mock payloads ─────────────────────────────────────────────────────────

const SESSION = {
  id: 1,
  bucket_id: 1,
  status: 'DRAFT',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  drawdown_acknowledged_at: null,
}

const CANDIDATES_RESULT = {
  session_id: 1,
  accepted: [
    { ticker: 'VTI', name: 'Vanguard Total Market', domicile: 'US', distribution: 'dist', ucits: false, ter: 0.03 },
    { ticker: 'BND', name: 'Vanguard Total Bond', domicile: 'US', distribution: 'dist', ucits: false, ter: 0.03 },
  ],
  rejected: [],
  engineer_prompt: 'Analyze VTI, BND for a long-term portfolio.',
}

const ALLOCATION_RESULT = {
  session_id: 1,
  status: 'PENDING_REVIEW',
  holdings: [
    { ticker: 'VTI', weight_pct: 70, rationale: 'Broad US equity exposure' },
    { ticker: 'BND', weight_pct: 30, rationale: 'Stabilizer' },
  ],
  ucits_advisory: null,
  cooling_off_until: null,
}

const DRAWDOWN_RESULT = {
  simulation_id: 0,
  bucket_id: 0,
  scenarios: [
    { name: '2000 Dot-Com', drawdown_pct: -47.0, loss_usd: 47000, proxy_used: 'VTI' },
    { name: '2008 GFC', drawdown_pct: -55.0, loss_usd: 55000, proxy_used: 'VTI' },
    { name: '2020 COVID', drawdown_pct: -34.0, loss_usd: 34000, proxy_used: 'VTI' },
    { name: '2022 Rate Hike', drawdown_pct: -19.5, loss_usd: 19500, proxy_used: 'VTI' },
  ],
  worst_case_pct: -55.0,
  worst_case_loss_usd: 55000,
}

const CONFIRM_RESULT = {
  session_id: 1,
  holdings_written: 2,
  cooling_off_until: null,
}

const BUCKETS = {
  items: [
    { id: 1, name: 'Retirement', horizon_type: 'LONG', target_amount: 1000000, current_value_usd: 100000, holdings: [] },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function mockApis(page: import('@playwright/test').Page) {
  await page.route('**/api/settings/', (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route('**/api/buckets/', (r) => r.fulfill({ json: BUCKETS }))
  await page.route('**/api/architect/sessions', (r) => r.fulfill({ json: SESSION }))
  await page.route('**/api/architect/sessions/1/ingest', (r) => r.fulfill({ json: CANDIDATES_RESULT }))
  await page.route('**/api/architect/sessions/1/allocation', (r) => r.fulfill({ json: ALLOCATION_RESULT }))
  await page.route('**/api/architect/sessions/1/drawdown', (r) =>
    r.fulfill({
      json: {
        ...DRAWDOWN_RESULT,
        session: { ...SESSION, drawdown_acknowledged_at: '2026-01-01T01:00:00Z' },
      },
    }),
  )
  await page.route('**/api/architect/sessions/1/confirm', (r) => r.fulfill({ json: CONFIRM_RESULT }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Architect Wizard — 6-step flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')
  })

  test('step 1: investor profile form is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /architect/i })).toBeVisible()
    // Step 1 title
    await expect(page.getByText(/define investor profile/i)).toBeVisible()
  })

  test('step 1 → step 2: start session after filling profile', async ({ page }) => {
    await page.getByLabel(/goal/i).fill('Retire comfortably at 65')
    await page.getByLabel(/target amount/i).fill('1000000')
    await page.getByLabel(/monthly deposit/i).fill('5000')
    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.getByText(/enter candidates/i)).toBeVisible()
  })

  test('step 2 → step 3: ingest tickers shows accepted list', async ({ page }) => {
    // Skip to step 2 by clicking Start
    await page.getByLabel(/goal/i).fill('Retire comfortably')
    await page.getByLabel(/target amount/i).fill('500000')
    await page.getByLabel(/monthly deposit/i).fill('2000')
    await page.getByRole('button', { name: /start/i }).click()

    await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
    await page.getByRole('button', { name: /submit/i }).click()

    await expect(page.getByText(/accepted/i)).toBeVisible()
    await expect(page.getByText('VTI')).toBeVisible()
    await expect(page.getByText('BND')).toBeVisible()
  })

  test('step 3 copy-prompt button is present', async ({ page }) => {
    await page.getByLabel(/goal/i).fill('Retire comfortably')
    await page.getByLabel(/target amount/i).fill('500000')
    await page.getByLabel(/monthly deposit/i).fill('2000')
    await page.getByRole('button', { name: /start/i }).click()

    await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
    await page.getByRole('button', { name: /submit/i }).click()

    await expect(page.getByRole('button', { name: /copy prompt/i })).toBeVisible()
  })
})

test.describe('Architect Wizard — drawdown gate', () => {
  test('confirm button is disabled until drawdown reviewed', async ({ page }) => {
    await mockApis(page)
    await page.goto('/architect')

    // Navigate to step 5/6 area by driving through the wizard
    await page.getByLabel(/goal/i).fill('Growth')
    await page.getByLabel(/target amount/i).fill('200000')
    await page.getByLabel(/monthly deposit/i).fill('1000')
    await page.getByRole('button', { name: /start/i }).click()

    await page.getByPlaceholder(/VTI, BND/i).fill('VTI, BND')
    await page.getByRole('button', { name: /submit/i }).click()

    // Step 3 → 4: next
    await page.getByRole('button', { name: /next/i }).click()

    // Step 4: paste JSON allocation
    const allocationJson = JSON.stringify([
      { ticker: 'VTI', weight_pct: 70 },
      { ticker: 'BND', weight_pct: 30 },
    ])
    await page.getByRole('button', { name: /paste json/i }).click()
    await page.evaluate((json) => {
      const el = document.querySelector('textarea[placeholder]')
      if (el) {
        ;(el as HTMLTextAreaElement).value = json
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, allocationJson)
    await page.getByRole('button', { name: /submit/i }).click()

    // On step 5: drawdown button should appear, confirm should not be present yet
    await expect(page.getByRole('button', { name: /run drawdown/i })).toBeVisible()
    const confirmBtn = page.getByRole('button', { name: /confirm/i })
    // Confirm is absent until drawdown reviewed
    await expect(confirmBtn).not.toBeVisible()
  })
})
