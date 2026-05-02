#!/usr/bin/env python3
"""Create a timestamped backup of the SQLite database.

Importable: callers can use `create_backup()` directly (e.g. from a
FastAPI route). Standalone usage: `uv run python scripts/backup_db.py`.
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


def create_backup(target_dir: Path | None = None) -> Path:
    """Copy the live DB to a timestamped file. Returns the new file path.

    Backups land next to the source DB by default (same dir, same drive
    so shutil.copy2 is atomic on POSIX). Pass ``target_dir`` to override.
    """
    db_path = settings.db_path
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    dest_dir = target_dir if target_dir is not None else db_path.parent
    dest_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = dest_dir / f"{db_path.stem}_backup_{stamp}.db"
    shutil.copy2(db_path, backup_path)
    return backup_path


if __name__ == "__main__":
    try:
        path = create_backup()
        print(f"Backup created: {path}")
    except FileNotFoundError as exc:
        print(exc)
        sys.exit(1)
