import { test, expect } from '@playwright/test'

const BUCKETS = {
  items: [
    {
      id: 1,
      name: 'Retirement',
      horizon_type: 'LONG',
      target_amount: 1000000,
      current_value_usd: 150000,
      holdings: [
        { ticker: 'VTI', weight_pct: 70, current_value_usd: 105000 },
        { ticker: 'BND', weight_pct: 30, current_value_usd: 45000 },
      ],
    },
  ],
}

const DEPOSIT_PLAN = {
  plan_id: 42,
  bucket_id: 1,
  total_deposit_usd: 5000,
  orders: [
    { ticker: 'VTI', units: 14, price_usd: 245.5, total_usd: 3437.0, rationale: 'underweight' },
    { ticker: 'BND', units: 16, price_usd: 96.5, total_usd: 1544.0, rationale: 'underweight' },
  ],
  total_allocated_usd: 4981.0,
  remainder_usd: 19.0,
  prices_stale: false,
  post_drift: [
    { ticker: 'VTI', current_pct: 70.0, target_pct: 70.0, post_pct: 70.1 },
    { ticker: 'BND', current_pct: 30.0, target_pct: 30.0, post_pct: 29.9 },
  ],
}

const CONFIRM_RESULT = {
  plan_id: 42,
  orders_written: 2,
  obsidian_path: '/Obsidian_Smart ETF/deposits/2026-01-01.md',
}

async function mockApis(page: import('@playwright/test').Page) {
  await page.route('**/api/settings/', (r) =>
    r.fulfill({ json: { settings: [{ key: 'base_currency', value: 'USD' }] } }),
  )
  await page.route('**/api/buckets/', (r) => r.fulfill({ json: BUCKETS }))
  await page.route('**/api/deposit/plan', (r) => r.fulfill({ json: DEPOSIT_PLAN }))
  await page.route('**/api/deposit/confirm/**', (r) => r.fulfill({ json: CONFIRM_RESULT }))
  await page.route('**/api/deposit/history', (r) => r.fulfill({ json: { items: [] } }))
}

test.describe('Smart Deposit', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page)
    await page.goto('/deposit')
  })

  test('page title is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /smart deposit/i })).toBeVisible()
  })

  test('bucket selector is populated', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    await expect(select.locator('option', { hasText: 'Retirement' })).toBeAttached()
  })

  test('calculate plan shows orders table', async ({ page }) => {
    // Select bucket
    await page.locator('select').first().selectOption('1')
    // Enter amount
    await page.getByLabel(/deposit amount/i).fill('5000')
    // Calculate
    await page.getByRole('button', { name: /calculate plan/i }).click()

    // Purchase plan section should appear
    await expect(page.getByText(/purchase plan/i)).toBeVisible()
    await expect(page.getByText('VTI')).toBeVisible()
    await expect(page.getByText('BND')).toBeVisible()
    await expect(page.getByText(/total allocated/i)).toBeVisible()
  })

  test('remainder is shown after calculating', async ({ page }) => {
    await page.locator('select').first().selectOption('1')
    await page.getByLabel(/deposit amount/i).fill('5000')
    await page.getByRole('button', { name: /calculate plan/i }).click()

    await expect(page.getByText(/remainder/i)).toBeVisible()
  })

  test('confirm button triggers success toast', async ({ page }) => {
    await page.locator('select').first().selectOption('1')
    await page.getByLabel(/deposit amount/i).fill('5000')
    await page.getByRole('button', { name: /calculate plan/i }).click()

    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Success message
    await expect(page.getByText(/deposit executed|orders/i)).toBeVisible({ timeout: 5000 })
  })

  test('stale prices warning shown when flag is set', async ({ page }) => {
    await page.route('**/api/deposit/plan', (r) =>
      r.fulfill({ json: { ...DEPOSIT_PLAN, prices_stale: true } }),
    )
    await page.locator('select').first().selectOption('1')
    await page.getByLabel(/deposit amount/i).fill('5000')
    await page.getByRole('button', { name: /calculate plan/i }).click()

    await expect(page.getByText(/prices may be stale/i)).toBeVisible()
  })
})
