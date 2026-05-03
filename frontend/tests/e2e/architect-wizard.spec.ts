import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ── Payloads ──────────────────────────────────────────────────────────────────

const BUCKETS = [
  { id: 1, name: 'Retirement', horizon_type: 'LONG', target_amount: 1_000_000, is_archived: false },
]

const START_RESPONSE = {
  session_id: 1,
  bucket_id: 1,
  discovery_prompt: 'Analyze VTI, BND.',
  status: 'DRAFT',
}

const CANDIDATES_RESPONSE = {
  session_id: 1,
  accepted: [
    { ticker: 'VTI', composite_score: 0.82, valuation: 'fair', z_score: -0.3, ter: 0.03, bucket: 'us_equity', is_valid: true, rejection_reason: null },
    { ticker: 'BND', composite_score: 0.75, valuation: 'fair', z_score: 0.1, ter: 0.03, bucket: 'bond', is_valid: true, rejection_reason: null },
  ],
  rejected: [],
}

const ENGINEER_PROMPT_RESPONSE = {
  session_id: 1,
  engineer_prompt: 'You are a portfolio manager. Analyze VTI and BND.',
  status: 'CANDIDATES_INGESTED',
}

async function mockApis(page: Page) {
  // Use regex for reliable matching regardless of trailing slash or query params
  await page.route(/\/api\/v1\/settings/, (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route(/\/api\/v1\/buckets/, (r) => r.fulfill({ json: BUCKETS }))
  await page.route(/\/api\/v1\/architect\/sessions\/1\/candidates/, (r) =>
    r.fulfill({ json: CANDIDATES_RESPONSE }),
  )
  await page.route(/\/api\/v1\/architect\/sessions\/1\/engineer-prompt/, (r) =>
    r.fulfill({ json: ENGINEER_PROMPT_RESPONSE }),
  )
  await page.route(/\/api\/v1\/architect\/sessions\/1$/, (r) =>
    r.fulfill({ json: { id: 1, bucket_id: 1, status: 'CANDIDATES_INGESTED', shortlist: CANDIDATES_RESPONSE.accepted, drawdown_acknowledged_at: null } }),
  )
  await page.route(/\/api\/v1\/architect\/sessions$/, (r) =>
    r.fulfill({ json: START_RESPONSE }),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Architect Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    await mockApis(page)
    await page.goto('/architect')
  })

  test('step 1: page title and investor profile form visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Portfolio Architect' })).toBeVisible()
    await expect(page.getByText('Define Investor Profile')).toBeVisible()
    await expect(page.getByLabel('Describe your goal')).toBeVisible()
    await expect(page.getByLabel('Target Amount (₪)')).toBeVisible()
    await expect(page.getByLabel('Monthly Deposit (₪)')).toBeVisible()
  })

  test('step 1 → step 2: filling form and clicking Start shows candidate entry', async ({ page }) => {
    await page.getByLabel('Describe your goal').fill('Retire comfortably at 65')
    await page.getByLabel('Target Amount (₪)').fill('1000000')
    await page.getByLabel('Monthly Deposit (₪)').fill('5000')
    await page.getByRole('button', { name: 'Start' }).click()

    await expect(page.getByText('Enter Candidates')).toBeVisible()
    await expect(page.getByLabel('Tickers')).toBeVisible()
  })

  test('step 2 → step 3: ingest tickers shows accepted list and Copy Prompt button', async ({
    page,
  }) => {
    await page.getByLabel('Describe your goal').fill('Growth')
    await page.getByLabel('Target Amount (₪)').fill('500000')
    await page.getByLabel('Monthly Deposit (₪)').fill('2000')
    await page.getByRole('button', { name: 'Start' }).click()

    await page.getByLabel('Tickers').fill('VTI, BND')
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByText('Review Analysis')).toBeVisible({ timeout: 5000 })
    // Use exact:true so "VTI" matches only the ticker span, not the engineer prompt text
    await expect(page.getByText('VTI', { exact: true })).toBeVisible()
    await expect(page.getByText('BND', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy Prompt' })).toBeVisible()
  })

  test('step 3: accepted tickers are listed under Accepted column', async ({ page }) => {
    await page.getByLabel('Describe your goal').fill('Growth')
    await page.getByLabel('Target Amount (₪)').fill('200000')
    await page.getByLabel('Monthly Deposit (₪)').fill('1000')
    await page.getByRole('button', { name: 'Start' }).click()

    await page.getByLabel('Tickers').fill('VTI, BND')
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByText('Review Analysis')).toBeVisible({ timeout: 5000 })
    // Both accepted tickers appear in the accepted column
    await expect(page.getByText('Accepted')).toBeVisible()
    await expect(page.getByText('VTI', { exact: true })).toBeVisible()
    await expect(page.getByText('BND', { exact: true })).toBeVisible()
  })
})
