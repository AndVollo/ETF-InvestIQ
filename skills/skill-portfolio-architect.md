---
name: skill-portfolio-architect
description: Human-in-the-Loop AI pipeline for ETF portfolio construction — prompt templates, JSON schemas, 3-step flow
type: project
---

# Skill: Portfolio Architect 3.0 — AI Pipeline

## Purpose
Orchestrates the 3-step process of building an ETF portfolio using AI (Claude/ChatGPT) as analyst + backend as mathematical validator.

## The 3-Step Flow

### Step 1 — Discovery (AI finds candidates)
**Endpoint:** `POST /api/architect/discovery-prompt`  
**Input:** `InvestorProfile` (horizon, risk, deposit, goal_ils, focus_areas)  
**Output:** `{prompt: "..."}` — copy to LLM  
**Expected AI output JSON:**
```json
{"candidate_tickers": ["VT","AVUV","VNQ","SCHD","..."]}
```
**Ingest:** `POST /api/architect/ingest-candidates` → `{"candidate_tickers": [...]}`

### Step 2 — Engineering Filter (backend validates)
**Endpoint:** `GET /api/architect/analysis`  
**Computes:** Pearson correlation matrix (3yr daily returns) + Z-Score/SMA200 valuation + ETF metadata  
**Flags:** Pairs with |r| > 0.85 as "redundant"

**Endpoint:** `POST /api/architect/architect-prompt`  
**Output:** `{prompt: "..."}` — contains all mathematical data, copy to LLM  
**Expected AI output JSON:**
```json
{
  "portfolio_rationale": "Explanation of allocation decisions...",
  "target_allocation": [
    {"ticker": "VT",   "weight_pct": 45.0},
    {"ticker": "AVUV", "weight_pct": 20.0},
    {"ticker": "AVDV", "weight_pct": 15.0},
    {"ticker": "VNQ",  "weight_pct": 10.0},
    {"ticker": "SCHD", "weight_pct": 10.0}
  ]
}
```
**Validation:** weights must sum to 100% (±0.5%)

### Step 3 — Review & Save
**Endpoint:** `POST /api/architect/ingest-allocation` → preview (no DB write)  
**Endpoint:** `POST /api/architect/save` → clears old holdings, inserts new allocation

## QA Rules Applied During Architect
- REITs total must not exceed `settings.reits_cap_pct` (default 15%)
- Covered call ETF names trigger HTTP 400 warning
- Allocation sum validated by Pydantic `ArchitectAllocation` model

## Prompt Engineering Notes
- Discovery prompt forces: global index + small-cap value + REIT mix
- Architect prompt embeds: correlation high-pairs, Z-scores, TER, category
- Both prompts use "OUTPUT FORMAT — return ONLY this JSON" to suppress LLM verbosity

## Files
- `backend/routes/architect.py` — all 6 endpoints
- `backend/services/correlation_service.py` — Pearson matrix
- `backend/services/valuation_service.py` — Z-Score, SMA200, 52w percentile
- `frontend/js/components/architect.js` — wizard UI (3 steps)

## Trigger Phrases
"portfolio architect", "ai etf selection", "discovery prompt", "ingest candidates", "correlation matrix", "etf allocation"
