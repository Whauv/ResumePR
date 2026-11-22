from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Callable

from resumepr_api.config import default_db_path, get_settings

Migration = tuple[int, str, Callable[[sqlite3.Connection], None]]


def resolve_db_path() -> Path:
    return get_settings().db_path


def migration_001_initial_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            original_file BLOB,
            parsed_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS resume_versions (
            version_id TEXT PRIMARY KEY,
            base_resume_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            version_number INTEGER NOT NULL,
            job_id TEXT NOT NULL,
            company_name TEXT,
            role TEXT,
            accepted_count INTEGER NOT NULL,
            rejected_count INTEGER NOT NULL,
            preserved_docx_blob BLOB,
            resume_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            ats_score_before REAL DEFAULT 0,
            ats_score_after REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS suggestion_batches (
            id TEXT PRIMARY KEY,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS suggestions (
            id TEXT PRIMARY KEY,
            batch_id TEXT NOT NULL,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            suggestion_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            source_url TEXT,
            parsed_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            report_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """
    )


def migration_002_add_indexes(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE INDEX IF NOT EXISTS idx_resumes_user_created
        ON resumes(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_resume_versions_base_user_version
        ON resume_versions(base_resume_id, user_id, version_number DESC);

        CREATE INDEX IF NOT EXISTS idx_jobs_user_created
        ON jobs(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_analyses_resume_job_user
        ON analyses(resume_id, job_id, user_id);

        CREATE INDEX IF NOT EXISTS idx_suggestions_batch_user
        ON suggestions(batch_id, user_id);

        CREATE INDEX IF NOT EXISTS idx_suggestions_resume_user
        ON suggestions(resume_id, user_id);
        """
    )


MIGRATIONS: tuple[Migration, ...] = (
    (1, "initial_schema", migration_001_initial_schema),
    (2, "add_indexes", migration_002_add_indexes),
)

INDEX_NAMES = (
    "idx_resumes_user_created",
    "idx_resume_versions_base_user_version",
    "idx_jobs_user_created",
    "idx_analyses_resume_job_user",
    "idx_suggestions_batch_user",
    "idx_suggestions_resume_user",
)


def run_migrations(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    applied_versions = {
        row[0] for row in connection.execute("SELECT version FROM schema_migrations").fetchall()
    }

    for version, name, migration in MIGRATIONS:
        if version in applied_versions:
            continue
        migration(connection)
        connection.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (version, name),
        )


# Tracks DB paths already migrated in this process so migrations run once per
# database rather than on every connection. run_migrations itself stays
# idempotent, so this is purely an optimization.
_migrated_paths: set[str] = set()


def ensure_migrations(connection: sqlite3.Connection, db_path: Path) -> None:
    key = str(db_path)
    if key in _migrated_paths:
        return
    run_migrations(connection)
    _migrated_paths.add(key)


def get_connection() -> sqlite3.Connection:
    db_path = resolve_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    ensure_migrations(connection, db_path)
    return connection
