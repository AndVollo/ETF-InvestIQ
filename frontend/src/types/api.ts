// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

// ── Buckets ───────────────────────────────────────────────────────────────────
export interface Bucket {
  id: number
  name: string
  horizon_type: 'SHORT' | 'MEDIUM' | 'LONG'
  initial_investment: number | null
  target_amount: number | null
  target_currency: string
  target_date: string | null
  description: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface BucketCreate {
  name: string
  horizon_type: 'SHORT' | 'MEDIUM' | 'LONG'
  initial_investment?: number
  target_amount?: number
  target_currency?: string
  target_date?: string
  description?: string
}

export interface HoldingDriftItem {
  id: number
  ticker: string
  units: number
  avg_cost_usd: number | null
  target_pct: number
  current_price_usd: number | null
  current_value_usd: number
  current_pct: number
  drift_pct: number
  notes: string | null
}

export interface BucketHoldingsResponse {
  bucket_id: number
  total_value_usd: number
  total_value_ils: number | null
  holdings: HoldingDriftItem[]
}

export interface BucketSummaryResponse {
  id: number
  name: string
  horizon_type: string
  total_value_usd: number
  total_value_ils: number | null
  holdings_count: number
  target_amount: number | null
  target_currency: string
  target_date: string | null
  goal_progress_pct: number | null
  is_archived: boolean
}

// ── Holdings ──────────────────────────────────────────────────────────────────
export interface Holding {
  id: number
  bucket_id: number
  ticker: string
  units: number
  avg_cost_usd: number | null
  target_pct: number
  is_archived: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HoldingCreate {
  bucket_id: number
  ticker: string
  units: number
  avg_cost_usd?: number
  target_pct: number
  notes?: string
}

// ── Deposits ──────────────────────────────────────────────────────────────────
export interface OrderItem {
  ticker: string
  units: number
  est_price_usd: number
  est_total_usd: number
}

export interface PostDepositDrift {
  ticker: string
  target_pct: number
  projected_pct: number
  drift_pct: number
}

export interface DepositPlan {
  plan_token: string
  bucket_id: number
  amount_input: number
  currency: string
  amount_usd: number
  fx_rate: number | null
  orders: OrderItem[]
  total_allocated_usd: number
  remainder_usd: number
  post_deposit_drifts: PostDepositDrift[]
  prices_stale: boolean
  warning: string | null
  expires_at: string
}

export interface DepositConfirmResponse {
  deposit_id: number
  bucket_id: number
  amount_usd: number
  orders_placed: number
  obsidian_file_path: string | null
}

export interface DepositLogResponse {
  id: number
  bucket_id: number
  amount: number
  currency: string
  fx_rate: number | null
  orders: OrderItem[]
  obsidian_file_path: string | null
  created_at: string
}

// ── Universe ──────────────────────────────────────────────────────────────────
export type Domicile = 'US' | 'IE' | 'LU'
export type Distribution = 'Distributing' | 'Accumulating'

export interface ETFScoreResponse {
  ticker: string
  name: string
  bucket: string
  isin: string | null
  domicile: Domicile
  distribution: Distribution
  ucits: boolean
  ter: number | null
  aum_b: number | null
  inception: string | null
  description_en: string
  description_he: string
  composite_score: number | null
  component_scores: {
    cost: number | null
    sharpe_3y: number | null
    tracking_error: number | null
    liquidity_aum: number | null
    sharpe_computed: boolean
  }
  stale: boolean
  rank: number
}

export interface ETFReturn {
  period: string
  value: number | null
}

export interface HoldingItem {
  symbol: string
  name: string | null
  weight: number
}

export interface ETFDetailResponse extends ETFScoreResponse {
  returns: ETFReturn[]
  top_holdings: HoldingItem[]
  sector_weights: Record<string, number>
}

export interface BucketInfo {
  name: string
  description_en: string
  description_he: string
  max_pct: number | null
  allowed_horizon: string[]
  etf_count: number
}

export interface UniverseListResponse {
  version: string
  total_etfs: number
  buckets: BucketInfo[]
  etfs: ETFScoreResponse[]
}

// ── Universe Admin ────────────────────────────────────────────────────────────
export interface UniverseETFAdmin {
  id: number
  ticker: string
  name: string
  isin: string | null
  domicile: Domicile
  distribution: Distribution
  ucits: boolean
  ter: number
  aum_b: number
  inception: string | null
  description_en: string | null
  description_he: string | null
  bucket_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UniverseETFCreatePayload {
  ticker: string
  name: string
  isin?: string | null
  domicile: Domicile
  distribution: Distribution
  ucits: boolean
  ter: number
  aum_b: number
  inception?: string | null
  description_en?: string | null
  description_he?: string | null
  bucket_name: string
}

export type UniverseETFUpdatePayload = Partial<UniverseETFCreatePayload> & { is_active?: boolean }

export interface BlacklistEntry {
  id: number
  ticker: string
  reason: string
  created_at: string
}

export interface BlacklistEntryCreate {
  ticker: string
  reason: string
}

export interface DiscoveryPromptResponse {
  prompt: string
  bucket_options: string[]
  finviz_screener_url: string
}

export interface BulkImportItem {
  ticker: string
  name: string
  bucket_name: string
  domicile?: Domicile
  distribution?: Distribution
  ucits?: boolean
  ter?: number
  aum_b?: number
  isin?: string | null
  inception?: string | null
  description_en?: string | null
  description_he?: string | null
}

export interface BulkImportRequest {
  items: BulkImportItem[]
}

export interface BulkImportResultItem {
  ticker: string
  status: 'added' | 'skipped_duplicate' | 'skipped_blacklisted' | 'error'
  detail: string | null
}

export interface BulkImportResponse {
  added: number
  skipped: number
  errors: number
  results: BulkImportResultItem[]
}

// ── Valuation ─────────────────────────────────────────────────────────────────
export type ValuationClassification = 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'INSUFFICIENT_HISTORY'

export interface ValuationResponse {
  ticker: string
  z_score: number | null
  percentile_52w: number | null
  sma200_deviation: number | null
  classification: ValuationClassification
  has_3y_history: boolean
  calculated_at: string
  stale: boolean
}

// ── Sectors ───────────────────────────────────────────────────────────────────
export interface SectorExposureItem {
  sector: string
  pct: number
  data_estimated: boolean
}

export interface CapWarning {
  cap_type: string
  actual_pct: number
  cap_pct: number
  message_key: string
  params: Record<string, unknown>
}

export interface HiddenStock {
  symbol: string
  total_exposure_pct: number
  appears_in: string[]
  message_key: string
  params: Record<string, unknown>
}

export interface BucketSectorResponse {
  bucket_id: number
  total_value_usd: number
  sector_exposures: SectorExposureItem[]
  cap_warnings: CapWarning[]
  hidden_stocks: HiddenStock[]
  data_stale: boolean
}

// ── Drawdown ──────────────────────────────────────────────────────────────────
export interface DrawdownHoldingDetail {
  ticker: string
  proxy_ticker: string | null
  proxy_used: boolean
  data_available: boolean
  scenario_drawdown_pct: number | null
  holding_weight_pct: number
}

export interface DrawdownScenario {
  name: string
  period_start: string
  period_end: string
  portfolio_drawdown_pct: number | null
  portfolio_loss_usd: number | null
  holdings: DrawdownHoldingDetail[]
}

export interface DrawdownSimulationResponse {
  simulation_id: number
  bucket_id: number
  portfolio_value_usd: number
  scenarios: DrawdownScenario[]
  worst_case_pct: number | null
  worst_case_amount_usd: number | null
  simulated_at: string
}

// ── Architect ─────────────────────────────────────────────────────────────────
export interface ArchitectStartResponse {
  session_id: number
  bucket_id: number
  discovery_prompt: string
  status: string
}

export interface CandidateDetail {
  ticker: string
  composite_score: number | null
  valuation: string | null
  z_score: number | null
  ter: number | null
  bucket: string | null
  is_valid: boolean
  rejection_reason: string | null
}

export interface CandidateIngestResponse {
  session_id: number
  accepted: CandidateDetail[]
  rejected: CandidateDetail[]
}

export interface AllocationItem {
  ticker: string
  weight_pct: number
}

export interface UcitsAdvisory {
  message_key: string
  params: {
    us_pct: number
    suggestions: Record<string, string[]>
  }
}

export interface AllocationIngestResponse {
  session_id: number
  status: string
  cap_warnings: string[]
  cooling_off_until: string | null
  validation_passed: boolean
  ucits_advisory: UcitsAdvisory | null
}

export interface ArchitectConfirmResponse {
  session_id: number
  bucket_id: number
  status: string
  holdings_written: number
  confirmed_at: string
}

export interface ArchitectSessionResponse {
  session_id: number
  bucket_id: number | null
  status: string
  investor_profile: {
    goal_description: string
    horizon_type: string
    current_capital: number | null
    target_amount: number | null
    monthly_deposit: number | null
    currency: string
  } | null
  shortlist: CandidateDetail[] | null
  final_allocation: AllocationItem[] | null
  rationale: string | null
  drawdown_acknowledged_at: string | null
  created_at: string
  updated_at: string
}

// ── Dividends ─────────────────────────────────────────────────────────────────
export interface HoldingDividend {
  ticker: string
  units: number
  forward_yield_pct: number | null
  annual_income_usd: number
  data_available: boolean
}

export interface DividendAnnualResponse {
  bucket_id: number
  total_annual_usd: number
  holdings: HoldingDividend[]
}

export interface DividendRecord {
  date: string
  amount_usd: number
}

export interface DividendHistoryResponse {
  ticker: string
  years: number
  records: DividendRecord[]
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface SettingResponse {
  key: string
  value: unknown
}

export interface SettingsListResponse {
  settings: SettingResponse[]
}

// ── API Error ─────────────────────────────────────────────────────────────────
export interface ApiError {
  message_key: string
  params: Record<string, unknown>
}
