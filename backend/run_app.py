import sys
import os
import multiprocessing
import uvicorn

# Ensure the current directory is in sys.path for bundled execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.main import app
except Exception as exc:
    import traceback
    print(f"FATAL: Application import failed: {exc}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="info", factory=False)
