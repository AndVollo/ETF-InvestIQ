import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const BUCKETS = [
  { id: 1, name: 'Retirement', horizon_type: 'LONG', target_amount: 1_000_000, is_archived: false },
]

const DEPOSIT_PLAN = {
  plan_token: 'tok_abc123',
  bucket_id: 1,
  amount_input: 5000,
  currency: 'USD',
  amount_usd: 5000,
  fx_rate: null,
  orders: [
    { ticker: 'VTI', units: 14, est_price_usd: 245.5, est_total_usd: 3437.0 },
    { ticker: 'BND', units: 16, est_price_usd: 96.5, est_total_usd: 1544.0 },
  ],
  total_allocated_usd: 4981.0,
  remainder_usd: 19.0,
  post_deposit_drifts: [],
  prices_stale: false,
  warning: null,
  expires_at: '2026-01-01T01:00:00Z',
}

const CONFIRM_RESPONSE = {
  deposit_id: 42,
  bucket_id: 1,
  amount_usd: 5000,
  orders_placed: 2,
  obsidian_file_path: null,
}

async function mockApis(page: Page, planOverride: Partial<typeof DEPOSIT_PLAN> = {}) {
  await page.route(/\/api\/v1\/settings/, (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route(/\/api\/v1\/buckets/, (r) => r.fulfill({ json: BUCKETS }))
  await page.route(/\/api\/v1\/deposits\/calculate/, (r) =>
    r.fulfill({ json: { ...DEPOSIT_PLAN, ...planOverride } }),
  )
  await page.route(/\/api\/v1\/deposits\/confirm/, (r) => r.fulfill({ json: CONFIRM_RESPONSE }))
  await page.route(/\/api\/v1\/deposits\/history/, (r) => r.fulfill({ json: [] }))
}

test.describe('Smart Deposit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    await mockApis(page)
    await page.goto('/deposit')
  })

  test('page title is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Smart Deposit' })).toBeVisible()
  })

  test('bucket selector is populated after data loads', async ({ page }) => {
    await expect(page.locator('option', { hasText: 'Retirement' })).toBeAttached({ timeout: 5000 })
  })

  test('deposit history section is always visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Deposit History' })).toBeVisible()
    await expect(page.getByText('No deposit history')).toBeVisible()
  })

  test('calculate plan shows purchase plan with tickers', async ({ page }) => {
    await page.locator('select').first().selectOption({ label: 'Retirement' })
    await page.getByLabel('Deposit Amount').fill('5000')
    await page.getByRole('button', { name: 'Calculate Plan' }).click()

    await expect(page.getByText('Purchase Plan')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('VTI')).toBeVisible()
    await expect(page.getByText('BND')).toBeVisible()
  })

  test('total allocated and remainder shown after calculation', async ({ page }) => {
    await page.locator('select').first().selectOption({ label: 'Retirement' })
    await page.getByLabel('Deposit Amount').fill('5000')
    await page.getByRole('button', { name: 'Calculate Plan' }).click()

    await expect(page.getByText('Total Allocated')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Remainder')).toBeVisible()
  })

  test('confirm button triggers success toast', async ({ page }) => {
    await page.locator('select').first().selectOption({ label: 'Retirement' })
    await page.getByLabel('Deposit Amount').fill('5000')
    await page.getByRole('button', { name: 'Calculate Plan' }).click()

    await expect(page.getByText('Purchase Plan')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /confirm/i }).click()

    await expect(page.getByText(/deposit executed|2 orders/i)).toBeVisible({ timeout: 5000 })
  })

  test('stale prices warning shown when flag is set', async ({ page }) => {
    await page.route(/\/api\/v1\/deposits\/calculate/, (r) =>
      r.fulfill({ json: { ...DEPOSIT_PLAN, prices_stale: true } }),
    )
    await page.locator('select').first().selectOption({ label: 'Retirement' })
    await page.getByLabel('Deposit Amount').fill('5000')
    await page.getByRole('button', { name: 'Calculate Plan' }).click()

    await expect(page.getByText(/prices may be stale/i)).toBeVisible({ timeout: 5000 })
  })
})
