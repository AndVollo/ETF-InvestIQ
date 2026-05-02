from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from app.services.dividend_service import (
    _fetch_dividend_history_sync,
    _fetch_dividend_info_sync,
    get_annual_income,
    get_dividend_history,
)


# ── _fetch_dividend_info_sync ─────────────────────────────────────────────────

def test_fetch_dividend_info_returns_yield_and_price():
    mock_info = {"dividendYield": 0.032, "regularMarketPrice": 250.0}
    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.info = mock_info
        result = _fetch_dividend_info_sync("VTI")
    assert result["forward_yield"] == pytest.approx(0.032)
    assert result["price"] == pytest.approx(250.0)


def test_fetch_dividend_info_falls_back_to_trailing_yield():
    mock_info = {"trailingAnnualDividendYield": 0.018, "previousClose": 100.0}
    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.info = mock_info
        result = _fetch_dividend_info_sync("BND")
    assert result["forward_yield"] == pytest.approx(0.018)
    assert result["price"] == pytest.approx(100.0)


def test_fetch_dividend_info_returns_zeros_on_exception():
    with patch("app.services.dividend_service.yf.Ticker", side_effect=Exception("network")):
        result = _fetch_dividend_info_sync("BROKEN")
    assert result["forward_yield"] == 0.0
    assert result["price"] == 0.0


def test_fetch_dividend_info_zero_when_no_yield_field():
    mock_info = {"regularMarketPrice": 50.0}
    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.info = mock_info
        result = _fetch_dividend_info_sync("NOVID")
    assert result["forward_yield"] == 0.0
    assert result["price"] == pytest.approx(50.0)


# ── _fetch_dividend_history_sync ──────────────────────────────────────────────

def test_fetch_dividend_history_returns_records():
    from datetime import datetime, timezone

    idx = pd.DatetimeIndex(
        [datetime(2024, 3, 15, tzinfo=timezone.utc), datetime(2023, 6, 20, tzinfo=timezone.utc)],
        tz="UTC",
    )
    series = pd.Series([1.20, 1.10], index=idx)

    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.dividends = series
        result = _fetch_dividend_history_sync("VTI", 3)

    assert len(result) == 2
    assert result[0]["amount_usd"] == pytest.approx(1.20)
    assert result[0]["date"] == "2024-03-15"


def test_fetch_dividend_history_filters_old_records():
    from datetime import datetime, timezone

    idx = pd.DatetimeIndex(
        [datetime(2024, 1, 1, tzinfo=timezone.utc), datetime(2010, 1, 1, tzinfo=timezone.utc)],
        tz="UTC",
    )
    series = pd.Series([0.5, 0.3], index=idx)

    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.dividends = series
        result = _fetch_dividend_history_sync("VTI", 5)

    assert len(result) == 1
    assert result[0]["date"] == "2024-01-01"


def test_fetch_dividend_history_empty_for_no_dividends():
    with patch("app.services.dividend_service.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.dividends = pd.Series([], dtype=float)
        result = _fetch_dividend_history_sync("BRK-B", 5)
    assert result == []


def test_fetch_dividend_history_returns_empty_on_exception():
    with patch("app.services.dividend_service.yf.Ticker", side_effect=RuntimeError("fail")):
        result = _fetch_dividend_history_sync("BROKEN", 5)
    assert result == []


# ── get_annual_income ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_annual_income_computes_correctly():
    mock_holding = MagicMock()
    mock_holding.ticker = "VTI"
    mock_holding.units = 10.0

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_holding]

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    with patch(
        "app.services.dividend_service._fetch_dividend_info_sync",
        return_value={"forward_yield": 0.04, "price": 250.0},
    ):
        response = await get_annual_income(bucket_id=1, db=mock_db)

    assert response.bucket_id == 1
    assert len(response.holdings) == 1
    h = response.holdings[0]
    assert h.ticker == "VTI"
    assert h.annual_income_usd == pytest.approx(100.0)  # 10 * 250 * 0.04
    assert h.forward_yield_pct == pytest.approx(4.0)
    assert h.data_available is True


@pytest.mark.asyncio
async def test_get_annual_income_zero_units():
    mock_holding = MagicMock()
    mock_holding.ticker = "BND"
    mock_holding.units = 0.0

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_holding]

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    with patch(
        "app.services.dividend_service._fetch_dividend_info_sync",
        return_value={"forward_yield": 0.035, "price": 75.0},
    ):
        response = await get_annual_income(bucket_id=2, db=mock_db)

    assert response.total_annual_usd == pytest.approx(0.0)
    assert response.holdings[0].annual_income_usd == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_get_annual_income_no_dividend_data_available():
    mock_holding = MagicMock()
    mock_holding.ticker = "GROWTH"
    mock_holding.units = 5.0

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_holding]

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    with patch(
        "app.services.dividend_service._fetch_dividend_info_sync",
        return_value={"forward_yield": 0.0, "price": 0.0},
    ):
        response = await get_annual_income(bucket_id=3, db=mock_db)

    h = response.holdings[0]
    assert h.data_available is False
    assert h.forward_yield_pct is None
    assert h.annual_income_usd == 0.0


@pytest.mark.asyncio
async def test_get_annual_income_sums_total():
    holdings_data = [
        MagicMock(ticker="VTI", units=10.0),
        MagicMock(ticker="BND", units=20.0),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = holdings_data

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    infos = [
        {"forward_yield": 0.04, "price": 250.0},  # VTI: 100.00
        {"forward_yield": 0.035, "price": 75.0},   # BND: 52.50
    ]

    call_count = 0

    def mock_info(_ticker: str) -> dict:
        nonlocal call_count
        result = infos[call_count]
        call_count += 1
        return result

    with patch("app.services.dividend_service._fetch_dividend_info_sync", side_effect=mock_info):
        response = await get_annual_income(bucket_id=4, db=mock_db)

    assert response.total_annual_usd == pytest.approx(152.5)


# ── get_dividend_history ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_dividend_history_returns_records():
    mock_db = AsyncMock()
    records_raw = [
        {"date": "2024-03-15", "amount_usd": 1.20},
        {"date": "2023-09-15", "amount_usd": 1.10},
    ]

    with patch(
        "app.services.dividend_service._fetch_dividend_history_sync",
        return_value=records_raw,
    ):
        response = await get_dividend_history("VTI", 3, mock_db)

    assert response.ticker == "VTI"
    assert response.years == 3
    assert len(response.records) == 2
    assert response.records[0].amount_usd == pytest.approx(1.20)


@pytest.mark.asyncio
async def test_get_dividend_history_clamps_years():
    mock_db = AsyncMock()

    with patch(
        "app.services.dividend_service._fetch_dividend_history_sync",
        return_value=[],
    ) as mock_fetch:
        await get_dividend_history("VTI", 0, mock_db)
        called_years = mock_fetch.call_args[0][1]
        assert called_years == 1

    with patch(
        "app.services.dividend_service._fetch_dividend_history_sync",
        return_value=[],
    ) as mock_fetch:
        await get_dividend_history("VTI", 99, mock_db)
        called_years = mock_fetch.call_args[0][1]
        assert called_years == 10


@pytest.mark.asyncio
async def test_get_dividend_history_empty_for_no_dividends():
    mock_db = AsyncMock()

    with patch(
        "app.services.dividend_service._fetch_dividend_history_sync",
        return_value=[],
    ):
        response = await get_dividend_history("BRK-B", 5, mock_db)

    assert response.records == []
