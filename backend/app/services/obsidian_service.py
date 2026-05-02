from __future__ import annotations

import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates" / "obsidian"
_DECISION_TEMPLATE = _TEMPLATES_DIR / "decision_entry.md"
_ARCHITECT_TEMPLATE = _TEMPLATES_DIR / "architect_decision.md"


def _safe_filename(name: str) -> str:
    return re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "_")


def _resolve_vault(vault_path: str) -> Path | None:
    if not vault_path:
        return None
    vault = Path(vault_path).expanduser()
    if not vault.exists():
        logger.warning("obsidian_vault_not_found", path=str(vault))
        return None
    if not vault.is_dir():
        logger.warning("obsidian_vault_not_directory", path=str(vault))
        return None
    return vault


def _render_orders_table(orders: list[dict[str, Any]]) -> str:
    if not orders:
        return "(no orders)"
    header = "| Ticker | Units | Price (USD) | Total (USD) |"
    sep = "|--------|-------|-------------|-------------|"
    rows = [
        f"| {o['ticker']} | {o['units']} | {o['est_price_usd']} | {o['est_total_usd']} |"
        for o in orders
    ]
    return "\n".join([header, sep] + rows)


def _render_snapshot(snapshot: list[dict[str, Any]] | None) -> str:
    if not snapshot:
        return "(snapshot unavailable)"
    header = "| Ticker | Units | Value (USD) | Weight % |"
    sep = "|--------|-------|-------------|----------|"
    rows = [
        f"| {r['ticker']} | {r['units']} | {r.get('current_value_usd', 0):.2f} | {r.get('current_pct', 0):.2f}% |"
        for r in snapshot
    ]
    return "\n".join([header, sep] + rows)


def _render_sectors(sector_exposures: list[dict[str, Any]] | None) -> str:
    if not sector_exposures:
        return "(sector data unavailable)"
    return "\n".join(f"- {s['sector']}: {s['pct']:.2f}%" for s in sector_exposures)


def _render_allocation_table(allocation: list[dict[str, Any]]) -> str:
    if not allocation:
        return "(no allocation)"
    header = "| Ticker | Weight % |"
    sep = "|--------|----------|"
    rows = [f"| {a['ticker']} | {a['weight_pct']:.2f}% |" for a in allocation]
    return "\n".join([header, sep] + rows)


def _render_warnings(warnings: list[str] | None) -> str:
    if not warnings:
        return "(no cap warnings)"
    return "\n".join(f"- {w}" for w in warnings)


def _load_template(path: Path, fallback: str) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("obsidian_template_missing", path=str(path))
        return fallback


def _atomic_write(filepath: Path, content: str) -> None:
    """Write a file atomically: stage to <name>.tmp, then os.replace().

    PRD §12 Sprint 8 demands atomic writes — Obsidian sometimes opens files
    while we're writing them, and a crash mid-write would otherwise leave
    a half-rendered journal entry that the user might mistake for real data.
    """
    tmp = filepath.with_suffix(filepath.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, filepath)


async def write_deposit_journal(
    *,
    bucket_name: str,
    orders: list[dict[str, Any]],
    amount_input: float,
    currency: str,
    amount_usd: float,
    portfolio_snapshot: list[dict[str, Any]] | None,
    sector_exposures: list[dict[str, Any]] | None,
    worst_case_pct: float | None,
    worst_case_amount: float | None,
    vault_path: str,
    journal_subfolder: str,
) -> str | None:
    """Write a deposit journal entry. Returns absolute path or None if vault unavailable."""
    vault = _resolve_vault(vault_path)
    if vault is None:
        return None

    subfolder = vault / journal_subfolder
    subfolder.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    filename = f"{today}-{_safe_filename(bucket_name)}-deposit.md"
    filepath = subfolder / filename

    template = _load_template(
        _DECISION_TEMPLATE,
        "# {{action_type}} — {{date}}\n\n{{summary}}\n\n{{orders_table}}",
    )

    worst_case_text = (
        f"{worst_case_pct:.1f}% (${worst_case_amount:,.0f} USD)"
        if worst_case_pct is not None and worst_case_amount is not None
        else "Not computed"
    )

    content = (
        template
        .replace("{{date}}", today)
        .replace("{{bucket_name}}", bucket_name)
        .replace("{{action_type}}", "Deposit")
        .replace("{{summary}}", (
            f"Deposited {amount_input:,.2f} {currency} "
            f"(≈ ${amount_usd:,.2f} USD) across {len(orders)} order(s)."
        ))
        .replace("{{orders_table}}", _render_orders_table(orders))
        .replace("{{post_deposit_snapshot}}", _render_snapshot(portfolio_snapshot))
        .replace("{{sector_snapshot}}", _render_sectors(sector_exposures))
        .replace("{{worst_case_pct}}", worst_case_text)
        .replace("{{worst_case_amount}}", "")
        .replace("{{currency}}", currency)
        .replace("{{rationale}}", "Deposit executed via Smart ETF Portfolio Manager.")
        .replace("{{version}}", settings.app_version)
        .replace("{{timestamp_utc}}", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"))
    )

    try:
        _atomic_write(filepath, content)
        logger.info("obsidian_entry_written", kind="deposit", path=str(filepath))
        return str(filepath)
    except OSError as exc:
        logger.warning("obsidian_write_failed", path=str(filepath), error=str(exc))
        return None


async def write_architect_journal(
    *,
    bucket_name: str,
    session_id: int,
    status: str,
    goal_description: str,
    allocation: list[dict[str, Any]],
    rationale: str,
    cap_warnings: list[str] | None,
    cooling_off_until: datetime | None,
    vault_path: str,
    journal_subfolder: str,
) -> str | None:
    """Write an architect-decision journal entry. Returns absolute path or None."""
    vault = _resolve_vault(vault_path)
    if vault is None:
        return None

    subfolder = vault / journal_subfolder
    subfolder.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    filename = f"{today}-{_safe_filename(bucket_name)}-architect-{session_id}.md"
    filepath = subfolder / filename

    template = _load_template(
        _ARCHITECT_TEMPLATE,
        "# Architect Decision — {{date}}\n\n{{rationale}}\n\n{{allocation_table}}",
    )

    cooling_off_note = (
        f"Cooling-off active until {cooling_off_until.isoformat()}"
        if cooling_off_until is not None
        else "No cooling-off triggered."
    )

    content = (
        template
        .replace("{{date}}", today)
        .replace("{{bucket_name}}", bucket_name)
        .replace("{{session_id}}", str(session_id))
        .replace("{{status}}", status)
        .replace("{{goal_description}}", goal_description or "(no goal description)")
        .replace("{{allocation_table}}", _render_allocation_table(allocation))
        .replace("{{rationale}}", rationale or "(no rationale)")
        .replace("{{cap_warnings}}", _render_warnings(cap_warnings))
        .replace("{{cooling_off_note}}", cooling_off_note)
        .replace("{{version}}", settings.app_version)
        .replace("{{timestamp_utc}}", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"))
    )

    try:
        _atomic_write(filepath, content)
        logger.info("obsidian_entry_written", kind="architect", path=str(filepath))
        return str(filepath)
    except OSError as exc:
        logger.warning("obsidian_write_failed", path=str(filepath), error=str(exc))
        return None
