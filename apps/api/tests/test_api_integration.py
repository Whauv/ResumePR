from __future__ import annotations

import importlib
import json

import pytest

TestClient = pytest.importorskip("fastapi.testclient").TestClient


def test_health_and_protected_export_flow(monkeypatch, tmp_path):
    db_path = tmp_path / "integration.db"
    monkeypatch.setenv("RESUMEPR_DB_PATH", str(db_path))
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

    import main as api_main

    api_main = importlib.reload(api_main)
    monkeypatch.setattr(api_main, "verify_bearer_token", lambda _token: {"uid": "user-1"})

    with TestClient(api_main.app) as client:
        health_response = client.get("/health")
        assert health_response.status_code == 200

        unauthorized = client.get("/api/versions/resume-1")
        assert unauthorized.status_code == 401

        from services.db import get_connection

        connection = get_connection()
        try:
            connection.execute(
                """
                INSERT INTO resumes (id, user_id, file_name, file_type, original_file, parsed_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "resume-1",
                    "user-1",
                    "resume.docx",
                    "docx",
                    b"original-docx",
                    json.dumps(
                        {
                            "name": "Jane Doe",
                            "contact": {"email": "jane@example.com"},
                            "summary": "Summary",
                            "experience": [],
                            "education": [],
                            "skills": ["Python"],
                        }
                    ),
                ),
            )
            connection.execute(
                """
                INSERT INTO resume_versions (
                    version_id, base_resume_id, user_id, version_number, job_id, company_name, role,
                    accepted_count, rejected_count, preserved_docx_blob, resume_json, created_at,
                    ats_score_before, ats_score_after
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "version-1",
                    "resume-1",
                    "user-1",
                    1,
                    "job-1",
                    "Example Co",
                    "Engineer",
                    2,
                    1,
                    b"edited-docx",
                    json.dumps(
                        {
                            "name": "Jane Doe",
                            "contact": {"email": "jane@example.com"},
                            "summary": "Updated summary",
                            "experience": [],
                            "education": [],
                            "skills": ["Python", "FastAPI"],
                        }
                    ),
                    "2026-04-06T12:00:00+00:00",
                    52,
                    74,
                ),
            )
            connection.commit()
        finally:
            connection.close()

        headers = {"Authorization": "Bearer fake-token"}
        versions_response = client.get("/api/versions/resume-1", headers=headers)
        assert versions_response.status_code == 200
        payload = versions_response.json()
        assert payload["versions"][0]["version_id"] == "version-1"

        export_response = client.post(
            "/api/versions/version-1/export?format=docx&template=modern",
            headers=headers,
        )
        assert export_response.status_code == 200
        assert (
            export_response.headers["content-type"]
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        assert export_response.content == b"edited-docx"
