from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import AppError, app_error_handler, generic_error_handler
from app.core.logging import configure_logging, get_logger
from app.db.session import engine
from app.db.base import Base
from app.routes.app_settings import router as settings_router
from app.routes.architect import router as architect_router
from app.routes.buckets import router as buckets_router
from app.routes.deposits import router as deposits_router
from app.routes.drawdown import router as drawdown_router
from app.routes.health import router as health_router
from app.routes.holdings import router as holdings_router
from app.routes.sectors import router as sectors_router
from app.routes.dividends import router as dividends_router
from app.routes.universe import router as universe_router
from app.routes.valuation import router as valuation_router

logger = get_logger(__name__)


def _run_migrations() -> None:
    """Run Alembic upgrade head — used in frozen (Tauri sidecar) mode where
    the user can't invoke `alembic upgrade head` themselves. In dev we keep
    using the create_all fallback so the test conftest stays cheap."""
    from alembic import command
    from alembic.config import Config

    # In PyInstaller frozen mode, bundled data lives under sys._MEIPASS.
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    cfg_path = base / "alembic.ini"
    cfg = Config(str(cfg_path))
    # Override the relative script_location with the absolute bundled path.
    cfg.set_main_option("script_location", str(base / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url_sync)
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging(debug=settings.debug)
    logger.info("startup", version=settings.app_version, db_path=str(settings.db_path))

    if getattr(sys, "frozen", False):
        _run_migrations()
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield

    await engine.dispose()
    logger.info("shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_error_handler)  # type: ignore[arg-type]

# Sprint 1
app.include_router(health_router, prefix="/api/v1")
# Sprint 2
app.include_router(universe_router, prefix="/api/v1")
app.include_router(valuation_router, prefix="/api/v1")
# Sprint 3
app.include_router(buckets_router, prefix="/api/v1")
app.include_router(holdings_router, prefix="/api/v1")
app.include_router(deposits_router, prefix="/api/v1")
# Sprint 4
app.include_router(sectors_router, prefix="/api/v1")
app.include_router(drawdown_router, prefix="/api/v1")
app.include_router(architect_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
# Sprint 7
app.include_router(dividends_router, prefix="/api/v1")


if __name__ == "__main__":
    # Entrypoint for the PyInstaller-bundled Tauri sidecar.
    # The Tauri shell spawns this binary on app launch.
    import os

    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
