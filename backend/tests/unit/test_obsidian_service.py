from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.services import obsidian_service


# ── Helpers ───────────────────────────────────────────────────────────────────

def _orders() -> list[dict]:
    return [
        {"ticker": "VTI", "units": 1, "est_price_usd": 250.0, "est_total_usd": 250.0},
        {"ticker": "BND", "units": 2, "est_price_usd": 75.0, "est_total_usd": 150.0},
    ]


def _snapshot() -> list[dict]:
    return [
        {"ticker": "VTI", "units": 10, "current_value_usd": 2500.0, "current_pct": 60.0},
        {"ticker": "BND", "units": 20, "current_value_usd": 1500.0, "current_pct": 40.0},
    ]


def _allocation() -> list[dict]:
    return [
        {"ticker": "VTI", "weight_pct": 60.0},
        {"ticker": "BND", "weight_pct": 40.0},
    ]


# ── _safe_filename ────────────────────────────────────────────────────────────

def test_safe_filename_strips_special_chars():
    assert obsidian_service._safe_filename("My Bucket / 2026!") == "My_Bucket__2026"


def test_safe_filename_underscores_spaces():
    assert obsidian_service._safe_filename("Long Term Growth") == "Long_Term_Growth"


# ── _resolve_vault ────────────────────────────────────────────────────────────

def test_resolve_vault_returns_none_for_empty():
    assert obsidian_service._resolve_vault("") is None


def test_resolve_vault_returns_none_for_missing(tmp_path: Path):
    missing = tmp_path / "does_not_exist"
    assert obsidian_service._resolve_vault(str(missing)) is None


def test_resolve_vault_rejects_file(tmp_path: Path):
    f = tmp_path / "file.txt"
    f.write_text("x")
    assert obsidian_service._resolve_vault(str(f)) is None


def test_resolve_vault_returns_path_when_valid(tmp_path: Path):
    assert obsidian_service._resolve_vault(str(tmp_path)) == tmp_path


# ── Renderers ─────────────────────────────────────────────────────────────────

def test_render_orders_table_with_orders():
    out = obsidian_service._render_orders_table(_orders())
    assert "| VTI |" in out
    assert "| BND |" in out
    assert out.startswith("| Ticker |")


def test_render_orders_table_empty():
    assert obsidian_service._render_orders_table([]) == "(no orders)"


def test_render_snapshot_handles_missing_data():
    assert obsidian_service._render_snapshot(None) == "(snapshot unavailable)"


def test_render_sectors_handles_missing_data():
    assert obsidian_service._render_sectors(None) == "(sector data unavailable)"


def test_render_allocation_table_formats_correctly():
    out = obsidian_service._render_allocation_table(_allocation())
    assert "| VTI | 60.00% |" in out
    assert "| BND | 40.00% |" in out


def test_render_warnings_empty_returns_none_message():
    assert obsidian_service._render_warnings(None) == "(no cap warnings)"
    assert obsidian_service._render_warnings([]) == "(no cap warnings)"


def test_render_warnings_lists_items():
    out = obsidian_service._render_warnings(["warn.tech_over_cap", "warn.reit_over_cap"])
    assert "- warn.tech_over_cap" in out
    assert "- warn.reit_over_cap" in out


# ── write_deposit_journal ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_deposit_journal_returns_none_when_no_path():
    result = await obsidian_service.write_deposit_journal(
        bucket_name="X",
        orders=_orders(),
        amount_input=1000.0,
        currency="USD",
        amount_usd=1000.0,
        portfolio_snapshot=None,
        sector_exposures=None,
        worst_case_pct=None,
        worst_case_amount=None,
        vault_path="",
        journal_subfolder="Journal",
    )
    assert result is None


@pytest.mark.asyncio
async def test_write_deposit_journal_writes_file(tmp_path: Path):
    result = await obsidian_service.write_deposit_journal(
        bucket_name="Long Term",
        orders=_orders(),
        amount_input=1000.0,
        currency="ILS",
        amount_usd=275.0,
        portfolio_snapshot=_snapshot(),
        sector_exposures=[{"sector": "Tech", "pct": 30.0}],
        worst_case_pct=-25.0,
        worst_case_amount=-1000.0,
        vault_path=str(tmp_path),
        journal_subfolder="Journal",
    )
    assert result is not None
    p = Path(result)
    assert p.exists()
    assert p.parent.name == "Journal"
    content = p.read_text(encoding="utf-8")
    assert "Long Term" in content
    assert "VTI" in content
    assert "BND" in content
    assert "Tech: 30.00%" in content


@pytest.mark.asyncio
async def test_write_deposit_journal_returns_none_when_vault_missing(tmp_path: Path):
    missing = tmp_path / "absent"
    result = await obsidian_service.write_deposit_journal(
        bucket_name="X",
        orders=_orders(),
        amount_input=1.0,
        currency="USD",
        amount_usd=1.0,
        portfolio_snapshot=None,
        sector_exposures=None,
        worst_case_pct=None,
        worst_case_amount=None,
        vault_path=str(missing),
        journal_subfolder="J",
    )
    assert result is None


@pytest.mark.asyncio
async def test_write_deposit_journal_creates_subfolder(tmp_path: Path):
    subfolder_name = "Deeply/Nested/Journal"
    result = await obsidian_service.write_deposit_journal(
        bucket_name="X",
        orders=_orders(),
        amount_input=1.0,
        currency="USD",
        amount_usd=1.0,
        portfolio_snapshot=None,
        sector_exposures=None,
        worst_case_pct=None,
        worst_case_amount=None,
        vault_path=str(tmp_path),
        journal_subfolder=subfolder_name,
    )
    assert result is not None
    assert (tmp_path / subfolder_name).is_dir()


# ── write_architect_journal ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_architect_journal_returns_none_when_no_path():
    result = await obsidian_service.write_architect_journal(
        bucket_name="X",
        session_id=1,
        status="CONFIRMED",
        goal_description="Retire by 60",
        allocation=_allocation(),
        rationale="Standard 60/40",
        cap_warnings=None,
        cooling_off_until=None,
        vault_path="",
        journal_subfolder="Journal",
    )
    assert result is None


@pytest.mark.asyncio
async def test_write_architect_journal_writes_file(tmp_path: Path):
    result = await obsidian_service.write_architect_journal(
        bucket_name="Retirement Bucket",
        session_id=42,
        status="CONFIRMED",
        goal_description="Long-term growth with bond cushion.",
        allocation=_allocation(),
        rationale="Standard 60/40 portfolio.",
        cap_warnings=["warn.tech_over_cap"],
        cooling_off_until=None,
        vault_path=str(tmp_path),
        journal_subfolder="Journal",
    )
    assert result is not None
    p = Path(result)
    assert p.exists()
    assert "architect-42" in p.name
    content = p.read_text(encoding="utf-8")
    assert "Retirement Bucket" in content
    assert "Long-term growth" in content
    assert "Standard 60/40" in content
    assert "warn.tech_over_cap" in content
    assert "No cooling-off triggered" in content


@pytest.mark.asyncio
async def test_write_architect_journal_includes_cooling_off_timestamp(tmp_path: Path):
    cooling = datetime.now(timezone.utc) + timedelta(hours=24)
    result = await obsidian_service.write_architect_journal(
        bucket_name="X",
        session_id=7,
        status="PENDING_REVIEW",
        goal_description="Goal",
        allocation=_allocation(),
        rationale="Aggressive shift",
        cap_warnings=None,
        cooling_off_until=cooling,
        vault_path=str(tmp_path),
        journal_subfolder="Journal",
    )
    assert result is not None
    content = Path(result).read_text(encoding="utf-8")
    assert "Cooling-off active until" in content
    assert cooling.isoformat() in content


# ── Atomic write ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_deposit_journal_uses_atomic_replace(tmp_path: Path):
    """No .tmp file is left behind after a successful write."""
    result = await obsidian_service.write_deposit_journal(
        bucket_name="X",
        orders=_orders(),
        amount_input=1.0,
        currency="USD",
        amount_usd=1.0,
        portfolio_snapshot=None,
        sector_exposures=None,
        worst_case_pct=None,
        worst_case_amount=None,
        vault_path=str(tmp_path),
        journal_subfolder="J",
    )
    assert result is not None
    journal_dir = tmp_path / "J"
    leftover = list(journal_dir.glob("*.tmp"))
    assert leftover == []


def test_atomic_write_does_not_leave_tmp_on_success(tmp_path: Path):
    target = tmp_path / "out.md"
    obsidian_service._atomic_write(target, "hello")
    assert target.read_text(encoding="utf-8") == "hello"
    assert not target.with_suffix(".md.tmp").exists()


def test_atomic_write_overwrites_existing(tmp_path: Path):
    target = tmp_path / "out.md"
    target.write_text("old", encoding="utf-8")
    obsidian_service._atomic_write(target, "new")
    assert target.read_text(encoding="utf-8") == "new"


@pytest.mark.asyncio
async def test_write_architect_journal_handles_empty_rationale(tmp_path: Path):
    result = await obsidian_service.write_architect_journal(
        bucket_name="X",
        session_id=1,
        status="CONFIRMED",
        goal_description="",
        allocation=_allocation(),
        rationale="",
        cap_warnings=None,
        cooling_off_until=None,
        vault_path=str(tmp_path),
        journal_subfolder="Journal",
    )
    assert result is not None
    content = Path(result).read_text(encoding="utf-8")
    assert "(no goal description)" in content
    assert "(no rationale)" in content
