from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_TEMPLATE_PATH = Path(__file__).parent.parent.parent / "templates" / "obsidian" / "decision_entry.md"


def _safe_filename(name: str) -> str:
    return re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "_")


def _render_orders_table(orders: list[dict[str, Any]]) -> str:
    if not orders:
        return "(no orders)"
    header = "| Ticker | Units | Price (USD) | Total (USD) |"
    sep =    "|--------|-------|-------------|-------------|"
    rows = [
        f"| {o['ticker']} | {o['units']} | {o['est_price_usd']} | {o['est_total_usd']} |"
        for o in orders
    ]
    return "\n".join([header, sep] + rows)


def _render_snapshot(snapshot: list[dict[str, Any]] | None) -> str:
    if not snapshot:
        return "(snapshot unavailable)"
    header = "| Ticker | Units | Value (USD) | Weight % |"
    sep =    "|--------|-------|-------------|----------|"
    rows = [
        f"| {r['ticker']} | {r['units']} | {r.get('current_value_usd', 0):.2f} | {r.get('current_pct', 0):.2f}% |"
        for r in snapshot
    ]
    return "\n".join([header, sep] + rows)


def _render_sectors(sector_exposures: list[dict[str, Any]] | None) -> str:
    if not sector_exposures:
        return "(sector data unavailable)"
    lines = [f"- {s['sector']}: {s['pct']:.2f}%" for s in sector_exposures]
    return "\n".join(lines)


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
    """Write an Obsidian markdown journal entry. Returns absolute file path or None."""
    if not vault_path:
        return None

    vault = Path(vault_path).expanduser()
    if not vault.exists():
        logger.warning("obsidian_vault_not_found", path=str(vault))
        return None

    subfolder = vault / journal_subfolder
    subfolder.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    safe_name = _safe_filename(bucket_name)
    filename = f"{today}-{safe_name}-deposit.md"
    filepath = subfolder / filename

    # Load template
    try:
        template = _TEMPLATE_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("obsidian_template_missing", path=str(_TEMPLATE_PATH))
        template = "# {{action_type}} — {{date}}\n\n{{summary}}\n\n{{orders_table}}"

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
        .replace("{{worst_case_amount}}", "")  # already embedded above
        .replace("{{currency}}", currency)
        .replace("{{rationale}}", "Deposit executed via Smart ETF Portfolio Manager.")
        .replace("{{version}}", settings.app_version)
        .replace("{{timestamp_utc}}", datetime.utcnow().strftime("%Y-%m-%d %H:%M"))
    )

    try:
        filepath.write_text(content, encoding="utf-8")
        logger.info("obsidian_entry_written", path=str(filepath))
        return str(filepath)
    except OSError as exc:
        logger.warning("obsidian_write_failed", path=str(filepath), error=str(exc))
        return None
