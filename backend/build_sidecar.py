"""
Build the FastAPI backend as a PyInstaller binary for the Tauri sidecar.

Output:
    ../frontend/src-tauri/binaries/smart-etf-backend-<target_triple>

Tauri's sidecar resolver looks for `<name>-<target_triple>` based on the
host's rustc -vV target. Run this on each platform you want to support.

Usage:
    cd backend
    uv run python build_sidecar.py
"""
from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from pathlib import Path

import PyInstaller.__main__


def _target_triple() -> str:
    """Get rustc's host triple — Tauri uses this exact suffix."""
    try:
        out = subprocess.check_output(["rustc", "-vV"], text=True)
        for line in out.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    # Fallback if rustc isn't on PATH (sufficient for one-off builds).
    arch = "aarch64" if platform.machine() in ("arm64", "aarch64") else "x86_64"
    if sys.platform == "darwin":
        return f"{arch}-apple-darwin"
    if sys.platform == "win32":
        return f"{arch}-pc-windows-msvc"
    return f"{arch}-unknown-linux-gnu"


def main() -> None:
    here = Path(__file__).resolve().parent
    target = _target_triple()
    name = f"smart-etf-backend-{target}"
    dist = here.parent / "frontend" / "src-tauri" / "binaries"
    dist.mkdir(parents=True, exist_ok=True)

    PyInstaller.__main__.run([
        str(here / "run_app.py"),
        "--name", name,
        "--onefile",
        "--noconfirm",
        "--clean",
        # uvicorn picks transports/loops/protocols dynamically — bundle them.
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.loops.asyncio",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.http.h11_impl",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "aiosqlite",
        "--collect-all", "yfinance",
        "--collect-all", "pandas",
        "--collect-data", "alembic",
        # Ship the Alembic migration scripts and the universe YAML.
        "--add-data", f"{here / 'alembic'}{':' if sys.platform != 'win32' else ';'}alembic",
        "--add-data", f"{here / 'alembic.ini'}{':' if sys.platform != 'win32' else ';'}.",
        "--add-data", f"{here / 'data'}{':' if sys.platform != 'win32' else ';'}data",
        "--add-data", f"{here / 'templates'}{':' if sys.platform != 'win32' else ';'}templates",
        "--distpath", str(dist),
    ])

    built = dist / (name + (".exe" if sys.platform == "win32" else ""))
    print(f"\n✓ sidecar built: {built}")
    if built.exists() and not sys.platform == "win32":
        # Tauri requires the binary to be executable.
        built.chmod(0o755)

    # Cleanup PyInstaller's intermediate output.
    for d in (here / "build", here / f"{name}.spec"):
        if d.is_dir():
            shutil.rmtree(d, ignore_errors=True)
        elif d.exists():
            d.unlink()


if __name__ == "__main__":
    main()
