// ── Buckets ───────────────────────────────────────────────────────────────────
export interface Bucket {
  id: number
  name: string
  horizon_type: 'SHORT' | 'MEDIUM' | 'LONG'
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
export interface ETFScoreResponse {
  ticker: string
  bucket: string
  ter: number | null
  composite_score: number | null
  component_scores: {
    cost: number | null
    sharpe_3y: number | null
    tracking_error: number | null
    liquidity_aum: number | null
  }
  stale: boolean
}

export interface UniverseListResponse {
  version: string
  total_etfs: number
  buckets: Record<string, ETFScoreResponse[]>
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

export interface BucketSectorResponse {
  bucket_id: number
  total_value_usd: number
  sector_exposures: SectorExposureItem[]
  cap_warnings: CapWarning[]
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

export interface AllocationIngestResponse {
  session_id: number
  status: string
  cap_warnings: string[]
  cooling_off_until: string | null
  validation_passed: boolean
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
  shortlist: CandidateDetail[] | null
  final_allocation: AllocationItem[] | null
  rationale: string | null
  created_at: string
  updated_at: string
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
