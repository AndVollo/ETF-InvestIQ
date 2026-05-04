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

from app.routes.auth import router as auth_router
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
from app.routes.universe_admin import router as universe_admin_router
from app.routes.valuation import router as valuation_router

logger = get_logger(__name__)


def _run_migrations() -> None:
    """Run Alembic upgrade head."""
    from alembic import command
    from alembic.config import Config

    logger.info("migration_start", db_url=settings.database_url_sync)
    
    # In PyInstaller frozen mode, bundled data lives under sys._MEIPASS.
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    cfg_path = base / "alembic.ini"
    
    if not cfg_path.exists():
        logger.error("alembic_ini_not_found", path=str(cfg_path))
        return

    cfg = Config(str(cfg_path))
    cfg.set_main_option("script_location", str(base / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url_sync)
    
    try:
        logger.info("alembic_upgrade_executing")
        command.upgrade(cfg, "head")
        logger.info("alembic_upgrade_success")
    except Exception as exc:
        logger.error("alembic_upgrade_failed", error=str(exc))
        import traceback
        logger.error("migration_traceback", traceback=traceback.format_exc())
        sys.exit(1)


async def _seed_universe() -> None:
    from app.db.seed_universe import seed_if_empty
    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await seed_if_empty(session)
    except Exception as exc:
        logger.error("universe_seed_failed", error=str(exc))


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging(debug=settings.debug)
    logger.info("startup", version=settings.app_version, db_path=str(settings.db_path))
    _run_migrations()
    await _seed_universe()
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

# Routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(universe_router, prefix="/api/v1")
app.include_router(universe_admin_router, prefix="/api/v1")
app.include_router(valuation_router, prefix="/api/v1")
app.include_router(buckets_router, prefix="/api/v1")
app.include_router(holdings_router, prefix="/api/v1")
app.include_router(deposits_router, prefix="/api/v1")
app.include_router(sectors_router, prefix="/api/v1")
app.include_router(drawdown_router, prefix="/api/v1")
app.include_router(architect_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(dividends_router, prefix="/api/v1")

@app.get("/ping")
async def ping():
    return {"status": "ok"}
