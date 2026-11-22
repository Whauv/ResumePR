from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

# pyproject.toml's pythonpath handles imports under normal invocation; this
# belt-and-suspenders insert keeps imports working if pytest's rootdir is
# resolved elsewhere (e.g. invoked from the repo root without the config).
API_ROOT = Path(__file__).resolve().parents[1]
API_SRC = API_ROOT / "src"

for path in (API_ROOT, API_SRC):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)


# Shared auth header for protected endpoints. The `api_client` fixture bypasses
# real Firebase verification, so any bearer token is accepted.
AUTH_HEADERS = {"Authorization": "Bearer fake-token"}


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    """Reloaded FastAPI app wired to a throwaway SQLite DB with auth bypassed.

    Yields ``(client, api_main)`` so tests can both drive HTTP requests and
    reach the module (e.g. to seed the DB via ``get_connection``). ``monkeypatch``
    and ``tmp_path`` revert env vars and remove the DB file automatically.
    """
    TestClient = pytest.importorskip("fastapi.testclient").TestClient

    db_path = tmp_path / "test.db"
    monkeypatch.setenv("RESUMEPR_DB_PATH", str(db_path))
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

    import resumepr_api.main as api_main

    api_main = importlib.reload(api_main)
    monkeypatch.setattr(api_main, "verify_bearer_token", lambda _token: {"uid": "user-1"})

    with TestClient(api_main.app) as client:
        yield client, api_main
