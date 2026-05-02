# Migration Prompts: Docker → Tauri Desktop App

> **קונטקסט:** הפרויקט נמצא בסוף Sprint 8. ב-MASTER_PRD סומן Docker כאופציונלי, ובכל זאת מומש בפרויקט. עכשיו רוצים לעבור ל-Tauri כדי להריץ כאפליקציית desktop אמיתית (macOS + Windows).
>
> **שיטת עבודה:** הרץ את 3 הפרומפטים בסדר. **אל תדלג**. כל פרומפט בונה על הקודם.

---

## 🚨 לפני שמתחילים — Backup

```bash
# גבה את הפרויקט הנוכחי
cd /path/to/smart-etf-manager
git status                          # ודא שהכל מקומיט
git checkout -b backup/pre-tauri    # branch גיבוי
git push origin backup/pre-tauri    # שלח לרימוט
git checkout main
git checkout -b feat/tauri-migration

# גבה את ה-DB
cp backend/data/portfolio.db ~/portfolio_backup_$(date +%Y%m%d).db
```

זה **חובה**. אם משהו ישתבש, תוכל לחזור.

---

## פרומפט 1: הסרת Docker (Cleanup)

העתק את כל הסעיף הזה ל-Claude Code:

```
TASK: Remove Docker completely from the Smart ETF Portfolio Manager project.

CONTEXT:
- Docker was added during development but is no longer the deployment strategy.
- The project is migrating to Tauri (desktop app).
- Single-user local-first architecture means Docker adds complexity without value.

ACTIONS REQUIRED:

1. Identify all Docker-related files. Run:
   find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore"

2. Remove the following files (delete, do not just stop tracking):
   - docker-compose.yml
   - docker-compose.dev.yml (if exists)
   - docker-compose.override.yml (if exists)
   - backend/Dockerfile
   - backend/.dockerignore
   - frontend/Dockerfile (if exists)
   - frontend/.dockerignore (if exists)
   - Any docker/ directory at the root

3. Update README.md:
   - Remove "Docker" from prerequisites
   - Remove all docker-compose run instructions
   - Replace with placeholder: "## Running the application
     [Will be filled by Tauri migration in next step]"

4. Update CLAUDE.md:
   - Remove the line "Docker Compose (אופציונלי) — להרצה לוקאלית מסודרת"
   - Remove any other Docker references in the document

5. Update MASTER_PRD.md (in /docs/):
   - Section 2.3: Remove "Docker Compose (אופציונלי)" line
   - Section 3 (project structure): Remove "docker-compose.yml" from the file tree
   - Section 12 (Sprint 0): Remove "Docker Compose (אופציונלי)" bullet

6. Update .gitignore:
   - Keep: node_modules/, dist/, *.pyc, __pycache__, .env
   - Remove any docker-volume related entries

7. If the database is currently inside a Docker volume:
   - Locate it: docker volume ls | grep portfolio
   - Copy data out: docker cp <container>:/data/portfolio.db ./backend/data/portfolio.db
   - Verify the copy: ls -lh backend/data/portfolio.db
   - Stop and remove the container: docker compose down -v

8. Verify backend can run natively without Docker:
   cd backend
   uv sync
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload --port 8000
   # Test: curl http://localhost:8000/api/v1/health

9. Verify frontend can run natively:
   cd frontend
   npm install
   npm run dev
   # Should open at http://localhost:5173

10. Commit the cleanup:
    git add -A
    git commit -m "chore: remove Docker, prepare for Tauri migration

    - Removed all docker-compose.yml and Dockerfile files
    - Updated documentation to reflect native local development
    - Verified backend and frontend run independently
    - Database migrated out of Docker volume"

CONSTRAINTS:
- Do NOT touch any application logic — only infrastructure files
- Do NOT modify any service files in backend/app/services/
- Do NOT modify any React components in frontend/src/
- Do NOT change the database schema
- After cleanup, all existing tests must still pass

VERIFICATION:
After completing, run:
- pytest backend/tests/  → all tests pass
- npm test in frontend/  → all tests pass
- npm run typecheck      → no errors
- npm run lint           → no errors

Report back with:
- List of files removed
- Confirmation that backend and frontend run natively
- Any issues encountered with the database migration
```

---

## פרומפט 2: הוספת Tauri (Setup)

⚠️ **רק אחרי שפרומפט 1 הסתיים בהצלחה.**

העתק את כל הסעיף הזה ל-Claude Code:

```
TASK: Integrate Tauri 2.0 to wrap the existing React frontend as a native desktop application for macOS and Windows.

CONTEXT:
- Frontend: React 18 + Vite + TypeScript (in /frontend/)
- Backend: FastAPI Python (in /backend/), runs on port 8000
- Goal: User clicks an icon → app opens as a native window
- Backend must run as a "sidecar" process — started/stopped automatically with the app
- Target platforms: macOS (Apple Silicon + Intel), Windows 10/11

ARCHITECTURE DECISION:
- Tauri 2.0 (NOT 1.x — 2.0 is the current stable as of 2026)
- Backend bundled as Python executable using PyInstaller
- Frontend built static and served from Tauri's webview
- Communication: Tauri shell + HTTP localhost (existing FastAPI calls work as-is)

PHASE A: Tauri Initialization

1. Verify Rust is installed (Tauri requires it for build):
   rustc --version
   # If missing: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

2. Install Tauri CLI globally:
   cargo install tauri-cli --version "^2.0"

3. Initialize Tauri inside frontend/:
   cd frontend
   cargo tauri init

   Configure with:
   - App name: Smart ETF Portfolio Manager
   - Window title: Smart ETF Manager
   - Web assets location: ../dist (default Vite build output)
   - Dev URL: http://localhost:5173
   - Frontend dev command: npm run dev
   - Frontend build command: npm run build

4. This creates frontend/src-tauri/ with:
   - Cargo.toml
   - tauri.conf.json
   - src/main.rs
   - icons/

PHASE B: Configure tauri.conf.json

Create/update frontend/src-tauri/tauri.conf.json with:

{
  "$schema": "https://schema.tauri.app/config/2.0.0",
  "productName": "Smart ETF Manager",
  "version": "0.8.0",
  "identifier": "com.smartetf.manager",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "Smart ETF Manager",
      "width": 1440,
      "height": 900,
      "minWidth": 1024,
      "minHeight": 700,
      "resizable": true,
      "fullscreen": false,
      "center": true,
      "decorations": true
    }],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "category": "Finance",
    "shortDescription": "Long-term ETF portfolio management",
    "longDescription": "A goal-anchored, tax-efficient ETF portfolio manager with sector analysis and drawdown simulation."
  }
}

PHASE C: Backend as Sidecar

The Python FastAPI backend must start/stop with the Tauri app.

1. Add PyInstaller to backend dependencies:
   cd backend
   uv add --dev pyinstaller

2. Create backend/build_sidecar.py:

   import PyInstaller.__main__
   import sys
   import platform
   
   target_arch = "x86_64" if platform.machine() == "x86_64" else "aarch64"
   target_os = "apple-darwin" if sys.platform == "darwin" else "pc-windows-msvc"
   target_triple = f"{target_arch}-{target_os}"
   
   PyInstaller.__main__.run([
       "app/main.py",
       "--name", f"smart-etf-backend-{target_triple}",
       "--onefile",
       "--noconfirm",
       "--clean",
       "--hidden-import", "uvicorn.logging",
       "--hidden-import", "uvicorn.loops",
       "--hidden-import", "uvicorn.loops.auto",
       "--hidden-import", "uvicorn.protocols",
       "--hidden-import", "uvicorn.protocols.http",
       "--hidden-import", "uvicorn.protocols.http.auto",
       "--hidden-import", "uvicorn.lifespan",
       "--hidden-import", "uvicorn.lifespan.on",
       "--collect-all", "yfinance",
       "--distpath", "../frontend/src-tauri/binaries",
   ])

3. Modify backend/app/main.py to support binary execution:

   if __name__ == "__main__":
       import uvicorn
       import os
       port = int(os.environ.get("PORT", 8000))
       uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

4. Build the sidecar binary:
   cd backend
   uv run python build_sidecar.py

5. Update tauri.conf.json bundle section to include sidecar:

   "bundle": {
     ...existing...,
     "externalBin": [
       "binaries/smart-etf-backend"
     ]
   }

6. Update frontend/src-tauri/src/main.rs to spawn the sidecar:

   use tauri::Manager;
   use tauri_plugin_shell::process::CommandEvent;
   use tauri_plugin_shell::ShellExt;
   
   fn main() {
       tauri::Builder::default()
           .plugin(tauri_plugin_shell::init())
           .setup(|app| {
               let sidecar_command = app
                   .shell()
                   .sidecar("smart-etf-backend")
                   .expect("failed to create sidecar")
                   .args(["--port", "8000"]);
               
               let (mut rx, _child) = sidecar_command
                   .spawn()
                   .expect("Failed to spawn sidecar");
               
               tauri::async_runtime::spawn(async move {
                   while let Some(event) = rx.recv().await {
                       if let CommandEvent::Stdout(line_bytes) = event {
                           let line = String::from_utf8_lossy(&line_bytes);
                           println!("[backend] {}", line);
                       }
                   }
               });
               
               Ok(())
           })
           .run(tauri::generate_context!())
           .expect("error while running tauri application");
   }

7. Add tauri-plugin-shell to Cargo.toml:
   
   [dependencies]
   tauri-plugin-shell = "2"

PHASE D: Update Frontend API Calls

Verify frontend/src/api/client.ts uses an environment-aware base URL:

const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction
  ? "http://127.0.0.1:8000"  // Tauri sidecar
  : "http://localhost:8000"; // Dev server

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
});

PHASE E: Database Path

The DB must be stored in the user's app data directory, NOT inside the bundled app:

1. Update backend/app/config.py:

   from pathlib import Path
   from pydantic_settings import BaseSettings
   
   def get_app_data_dir() -> Path:
       import sys
       if sys.platform == "darwin":
           return Path.home() / "Library" / "Application Support" / "SmartETFManager"
       elif sys.platform == "win32":
           return Path.home() / "AppData" / "Roaming" / "SmartETFManager"
       else:
           return Path.home() / ".local" / "share" / "SmartETFManager"
   
   class Settings(BaseSettings):
       app_data_dir: Path = get_app_data_dir()
       
       @property
       def db_path(self) -> Path:
           self.app_data_dir.mkdir(parents=True, exist_ok=True)
           return self.app_data_dir / "portfolio.db"
       
       @property
       def database_url(self) -> str:
           return f"sqlite:///{self.db_path}"

2. Update Alembic to use the same path: alembic.ini → set sqlalchemy.url programmatically
   in env.py via: config.set_main_option("sqlalchemy.url", settings.database_url)

3. On first launch, if DB doesn't exist, run migrations automatically:
   In backend/app/main.py startup event:
   
   @app.on_event("startup")
   async def run_migrations():
       from alembic.config import Config
       from alembic import command
       cfg = Config("alembic.ini")
       command.upgrade(cfg, "head")

PHASE F: Build & Test

1. Development mode:
   cd frontend
   cargo tauri dev
   # This starts: Vite dev server + Tauri window + spawns backend sidecar

2. Verify:
   - Tauri window opens (NOT a browser)
   - Title bar shows "Smart ETF Manager"
   - Frontend loads
   - API calls work (check Network tab via right-click → Inspect)
   - Backend logs appear in terminal

3. Production build:
   cd frontend
   cargo tauri build
   
   Outputs:
   - macOS: src-tauri/target/release/bundle/dmg/Smart ETF Manager_0.8.0_aarch64.dmg
   - macOS: src-tauri/target/release/bundle/macos/Smart ETF Manager.app
   - Windows: src-tauri/target/release/bundle/msi/Smart ETF Manager_0.8.0_x64_en-US.msi
   - Windows: src-tauri/target/release/bundle/nsis/Smart ETF Manager_0.8.0_x64-setup.exe

PHASE G: Icons

Create app icons. Place in frontend/src-tauri/icons/:
- 32x32.png
- 128x128.png
- 128x128@2x.png (256x256 actual)
- icon.icns (macOS — use tauri icon command)
- icon.ico (Windows — use tauri icon command)

Auto-generate from a single source PNG:
   cargo tauri icon ./assets/source-icon.png

PHASE H: README Update

Update root README.md with new instructions:

## Development

### Requirements
- Node.js 20+
- Python 3.11+ with uv (https://github.com/astral-sh/uv)
- Rust (https://rustup.rs/)

### Run in development
```
cd frontend
cargo tauri dev
```

### Build for production
```
cd frontend
cargo tauri build
```

The built app will be in `frontend/src-tauri/target/release/bundle/`.

### Database location
- macOS: `~/Library/Application Support/SmartETFManager/portfolio.db`
- Windows: `%APPDATA%\SmartETFManager\portfolio.db`

CONSTRAINTS:
- Do NOT modify any business logic in backend/app/services/
- Do NOT modify any React components except api/client.ts
- Do NOT change the database schema
- Window must support both light and dark mode (system preference)
- All existing tests must still pass

VERIFICATION CHECKLIST:
[ ] cargo tauri dev opens a native window (not browser)
[ ] Backend sidecar starts automatically
[ ] All API calls work
[ ] Database is created at the user's app data dir
[ ] cargo tauri build produces .dmg (macOS) or .msi (Windows)
[ ] Built app launches from Finder/Explorer
[ ] All existing pytest and vitest tests pass
[ ] No Docker references remain in the codebase

Report back:
- Any errors during sidecar build
- Path to the final .dmg or .msi
- Confirmation that the built app runs without dev tools
```

---

## פרומפט 3: עדכון MASTER_PRD ו-CLAUDE.md

⚠️ **רק אחרי ש-Tauri עובד.**

העתק את כל הסעיף הזה ל-Claude Code:

```
TASK: Update MASTER_PRD.md and CLAUDE.md to reflect the Tauri desktop app architecture.

CONTEXT:
The project has migrated from web-app-with-Docker to Tauri desktop app.
This must be documented as the official architecture going forward.

CHANGES TO MASTER_PRD.md:

1. Section 1.1 (What is the product) — add at the end:
   "**Distribution**: Native desktop application (Tauri 2.0) for macOS and Windows. 
    Single-user, local-first. All data stays on the user's machine."

2. Section 2.3 (Operational tools) — replace the entire section:
   - Git (mandatory, with branch protection)
   - GitHub Actions / Pre-commit hooks — ruff + mypy + pytest run automatically
   - Tauri 2.0 — packaging the app for desktop
   - PyInstaller — packaging the Python backend as a sidecar binary
   - Obsidian — file-level integration (not API)

3. Section 2.4 (What NOT to use) — remove "Docker" reference if present, add:
   - Electron (use Tauri instead — smaller, safer, lighter)
   - Cloud deployment (this is a local-first app, no servers)

4. Section 3 (Project structure) — update to include:
   ```
   frontend/
   ├── src-tauri/           ← Tauri shell (Rust)
   │   ├── Cargo.toml
   │   ├── tauri.conf.json
   │   ├── src/main.rs
   │   ├── icons/
   │   └── binaries/        ← PyInstaller-built Python sidecar
   ├── src/
   ...
   
   backend/
   ├── app/
   ├── build_sidecar.py     ← PyInstaller build script
   ...
   ```

5. Section 12 (Sprints) — update Sprint 0:
   Replace "Docker Compose (אופציונלי)" with:
   "Tauri 2.0 setup with sidecar architecture (PyInstaller for Python backend)"

6. ADD a new section 16 — "Distribution & Installation":
   
   ## 16. Distribution & Installation
   
   ### Build artifacts
   - macOS Apple Silicon: .dmg (Apple Silicon native)
   - macOS Intel: .dmg (x86_64)
   - Windows: .msi (preferred) and .exe (NSIS installer)
   
   ### Build commands
   - Development: `cargo tauri dev`
   - Production: `cargo tauri build`
   
   ### Code signing (deferred until publication)
   - macOS: Apple Developer certificate required for notarization
   - Windows: Code signing certificate required to avoid SmartScreen warnings
   - Currently NOT signed (single-user, local builds only)
   
   ### Installation paths
   - macOS: /Applications/Smart ETF Manager.app
   - Windows: C:\Program Files\Smart ETF Manager\
   
   ### User data location
   - macOS: ~/Library/Application Support/SmartETFManager/
   - Windows: %APPDATA%\SmartETFManager\
   
   ### Update strategy
   - Manual updates initially (download new .dmg/.msi)
   - Auto-updater can be added later via Tauri's built-in updater plugin
     (deferred until version 1.0)

CHANGES TO CLAUDE.md:

1. Section "🛠️ מחסנית טכנולוגית" — add subsection at the end:
   
   ### Desktop Packaging
   - Tauri 2.0 (Rust shell)
   - PyInstaller (Python backend → binary)
   - DO NOT replace with Electron (rejected: too heavy)
   - DO NOT use Docker for distribution (rejected: not user-friendly)

2. Section "⛔ קווים אדומים — אסור בהחלט" — add to "בקוד":
   
   18. **אל תשנה את base URL ב-api/client.ts** — חייב לתמוך גם dev (localhost) וגם production (127.0.0.1 sidecar)
   19. **אל תשמור DB בתוך bundle ה-app** — תמיד ב-user's app data dir
   20. **אל תוסיף תלויות backend שלא תואמות PyInstaller** (כמו ספריות native מסובכות)

3. Section "🆘 כשמשהו נשבר" — ADD new subsection at the end:
   
   ### Tauri sidecar לא עולה
   
   1. בדוק שהbinary נבנה: `ls frontend/src-tauri/binaries/`
   2. בדוק את הלוגים: cargo tauri dev מציג הכל ב-stdout
   3. נסה להריץ ידנית: `./frontend/src-tauri/binaries/smart-etf-backend`
   4. אם PyInstaller נכשל — בדוק hidden imports ב-build_sidecar.py
   5. בעיות פורט (8000 תפוס): שנה ל-port דינמי בעתיד
   
   ### Tauri build נכשל
   
   1. ודא ש-Rust מעודכן: `rustup update`
   2. נקה cache: `cd frontend && cargo clean`
   3. בדוק שהאייקונים קיימים ב-icons/
   4. אם זה Windows build על macOS — לא נתמך, חייב Windows machine

CONSTRAINTS:
- All changes must preserve the original document structure
- Section numbering must remain consistent
- Hebrew/English balance must remain (text in original language)
- No business logic descriptions should change

VERIFICATION:
After updating, verify:
[ ] No "Docker" references remain in MASTER_PRD.md
[ ] No "Docker" references remain in CLAUDE.md
[ ] Section 16 (Distribution) added correctly
[ ] Project structure tree includes src-tauri/
[ ] CLAUDE.md mentions Tauri in tech stack section

Commit:
git add docs/MASTER_PRD.md CLAUDE.md
git commit -m "docs: update PRD and CLAUDE.md for Tauri desktop architecture"
```

---

## הערות חשובות לפני שמתחילים

### 1. Sprint 8 בעיצומו — האם להפסיק?

**לא**. סיים את Sprint 8 קודם. אחר כך תתחיל את המעבר.

הסיבה: מעבר ל-Tauri באמצע Sprint = מצב לא יציב + תיקוני באגים מורכבים מאוד. סיים את ה-Obsidian + Audit, וודא שהכל עובד, ורק אחר כך התחל את ה-3 פרומפטים.

### 2. זה ספרינט בפני עצמו

קרא לזה **Sprint 8.5: Tauri Migration**. תכנן לזה 5-7 ימי עבודה. לא יום-יומיים.

### 3. PyInstaller זה החלק הקשה

הסיבה הכי שכיחה למשהו "שלא עובד" ב-Tauri עם Python backend הוא PyInstaller. ספריות כמו `yfinance`, `pandas`, `scipy` יש להן hidden imports שPyInstaller לא תמיד תופס. הפרומפט מטה כולל את ה-imports הנפוצים, אבל אם משהו נשבר — תוסיף עוד `--hidden-import` בהתאם.

### 4. הצפנה ועדכונים — לא עכשיו

לא תחתום על הקוד (code signing) ולא תוסיף auto-updater בשלב הזה. שניהם נדחים ל-v1.0 כשתפרסם. כרגע — bundle לא חתום, מתאים לשימוש אישי בלבד.

---

## סדר ההפעלה הסופי

```
1. סיים את Sprint 8 (Obsidian + Audit)
2. גבה הכל (branch backup/pre-tauri)
3. Sprint 8.5 — הרץ פרומפט 1 (Cleanup)
4. ודא ש-1 הצליח (אין Docker, app רץ native)
5. הרץ פרומפט 2 (Tauri Setup) — זה ייקח רוב הזמן
6. ודא ש-2 הצליח (cargo tauri dev עובד, build יוצר .dmg/.msi)
7. הרץ פרומפט 3 (Documentation)
8. תייג: git tag sprint-8.5-complete
9. המשך לSprint 9
```

הצלחה. אם משהו נשבר באמצע — תחזור עם הודעת השגיאה ואני אעזור לאבחן.