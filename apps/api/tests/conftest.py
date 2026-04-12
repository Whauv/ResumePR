from __future__ import annotations

import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
API_SRC = API_ROOT / "src"

for path in (API_ROOT, API_SRC):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
