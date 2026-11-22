from __future__ import annotations

import sqlite3
import typing
from pathlib import Path


def test_get_settings_reads_env_fresh(monkeypatch):
    from resumepr_api.config import default_db_path, get_settings

    # Defaults when nothing is set.
    monkeypatch.delenv("RESUMEPR_DB_PATH", raising=False)
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    defaults = get_settings()
    assert defaults.db_path == default_db_path()
    assert defaults.groq_model == "llama-3.3-70b-versatile"
    assert "http://localhost:5173" in defaults.cors_allowed_origins

    # Overrides are picked up on the next call (no caching).
    monkeypatch.setenv("RESUMEPR_DB_PATH", "/tmp/custom.db")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://a.com, https://b.com")
    overridden = get_settings()
    assert overridden.db_path == Path("/tmp/custom.db")
    assert overridden.cors_allowed_origins == ("https://a.com", "https://b.com")


def test_env_path_points_at_project_env_file():
    """`.env` lives at apps/api/.env, not beside main.py (apps/api/src/resumepr_api)."""
    import resumepr_api.main as api_main

    assert api_main.ENV_PATH.name == ".env"
    assert api_main.ENV_PATH.parent.name == "api"


def test_analysis_helper_annotations_resolve():
    """Regression guard for the missing `import sqlite3` in analysis.py: the
    annotation stays a string under `from __future__ import annotations`, so this
    only fails if the name cannot be resolved."""
    from resumepr_api.routers import analysis

    hints = typing.get_type_hints(analysis.fetch_resume_and_job)
    assert hints["connection"] is sqlite3.Connection
