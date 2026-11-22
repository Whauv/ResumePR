"""Centralized runtime configuration.

Every setting is read from the environment in one place. ``get_settings()``
reads the environment fresh on each call (rather than caching) so that tests
which set env vars and reload modules see the current values, matching the
previous ad-hoc ``os.getenv`` behavior.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# .../apps/api/src/resumepr_api
PACKAGE_ROOT = Path(__file__).resolve().parent

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def default_db_path() -> Path:
    return PACKAGE_ROOT / "resumes.db"


@dataclass(frozen=True)
class Settings:
    log_level: str
    cors_allowed_origins: tuple[str, ...]
    db_path: Path
    firebase_service_account_json: str | None
    groq_api_key: str | None
    groq_model: str
    gemini_api_key: str | None


def get_settings() -> Settings:
    raw_db_path = os.getenv("RESUMEPR_DB_PATH", "").strip()
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", DEFAULT_CORS_ORIGINS)
    return Settings(
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        cors_allowed_origins=tuple(
            origin.strip() for origin in raw_origins.split(",") if origin.strip()
        ),
        db_path=Path(raw_db_path) if raw_db_path else default_db_path(),
        firebase_service_account_json=os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        groq_model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
    )
