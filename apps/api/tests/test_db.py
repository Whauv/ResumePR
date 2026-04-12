from __future__ import annotations

import sqlite3

from resumepr_api.services.db import INDEX_NAMES, run_migrations


def test_run_migrations_creates_expected_tables_and_indexes():
    connection = sqlite3.connect(":memory:")
    run_migrations(connection)

    table_names = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    index_names = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index'"
        ).fetchall()
    }

    assert {"resumes", "resume_versions", "jobs", "analyses", "suggestions", "suggestion_batches"} <= table_names
    assert {"schema_migrations"} <= table_names
    assert set(INDEX_NAMES) <= index_names


def test_run_migrations_is_idempotent():
    connection = sqlite3.connect(":memory:")
    run_migrations(connection)
    run_migrations(connection)

    versions = connection.execute("SELECT version FROM schema_migrations ORDER BY version").fetchall()
    assert [row[0] for row in versions] == [1, 2]
