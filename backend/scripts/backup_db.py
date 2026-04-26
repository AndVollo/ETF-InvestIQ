#!/usr/bin/env python3
"""Create a timestamped backup of the SQLite database."""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def backup() -> Path:
    db_path = Path("smart_etf.db")
    if not db_path.exists():
        print(f"Database not found: {db_path.resolve()}")
        sys.exit(1)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = Path(f"smart_etf_backup_{stamp}.db")
    shutil.copy2(db_path, backup_path)
    print(f"Backup created: {backup_path.resolve()}")
    return backup_path


if __name__ == "__main__":
    backup()
