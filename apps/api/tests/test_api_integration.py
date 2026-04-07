from __future__ import annotations

import importlib
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest

TestClient = pytest.importorskip("fastapi.testclient").TestClient


def test_health_and_protected_export_flow():
    previous_db = os.environ.get("RESUMEPR_DB_PATH")
    previous_origins = os.environ.get("CORS_ALLOWED_ORIGINS")

    scratch_dir = Path(__file__).resolve().parents[1]
    db_path = scratch_dir / f"integration-{uuid4().hex}.db"
    os.environ["RESUMEPR_DB_PATH"] = str(db_path)
    os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173"

    import main as api_main

    api_main = importlib.reload(api_main)
    api_main.verify_bearer_token = lambda _token: {"uid": "user-1"}

    try:
        with TestClient(api_main.app) as client:
            health_response = client.get("/health")
            assert health_response.status_code == 200
            assert health_response.headers["x-request-id"]

            unauthorized = client.get("/api/versions/resume-1")
            assert unauthorized.status_code == 401
            assert unauthorized.json()["request_id"]
            assert unauthorized.headers["x-request-id"] == unauthorized.json()["request_id"]

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
            assert versions_response.headers["x-request-id"]
            payload = versions_response.json()
            assert payload["versions"][0]["version_id"] == "version-1"

            export_response = client.post(
                "/api/versions/version-1/export?format=docx&template=modern",
                headers=headers,
            )
            assert export_response.status_code == 200
            assert export_response.headers["x-request-id"]
            assert (
                export_response.headers["content-type"]
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            assert export_response.content == b"edited-docx"
    finally:
        if previous_db is None:
            os.environ.pop("RESUMEPR_DB_PATH", None)
        else:
            os.environ["RESUMEPR_DB_PATH"] = previous_db

        if previous_origins is None:
            os.environ.pop("CORS_ALLOWED_ORIGINS", None)
        else:
            os.environ["CORS_ALLOWED_ORIGINS"] = previous_origins

        if db_path.exists():
            db_path.unlink()


def test_validation_and_unhandled_errors_include_request_id():
    previous_db = os.environ.get("RESUMEPR_DB_PATH")

    scratch_dir = Path(__file__).resolve().parents[1]
    db_path = scratch_dir / f"integration-{uuid4().hex}.db"
    os.environ["RESUMEPR_DB_PATH"] = str(db_path)

    import main as api_main

    api_main = importlib.reload(api_main)
    api_main.verify_bearer_token = lambda _token: {"uid": "user-1"}

    @api_main.app.get("/boom")
    def boom():
        raise RuntimeError("boom")

    try:
        with TestClient(api_main.app, raise_server_exceptions=False) as client:
            headers = {"Authorization": "Bearer fake-token"}

            validation_response = client.post("/api/analysis/gap", headers=headers, json={})
            assert validation_response.status_code == 422
            validation_payload = validation_response.json()
            assert validation_payload["detail"] == "Request validation failed."
            assert validation_payload["request_id"]
            assert validation_response.headers["x-request-id"] == validation_payload["request_id"]
            assert validation_payload["errors"]

            unhandled_response = client.get("/boom", headers=headers)
            assert unhandled_response.status_code == 500
            unhandled_payload = unhandled_response.json()
            assert unhandled_payload["detail"] == "Internal server error."
            assert unhandled_payload["request_id"]
            assert unhandled_response.headers["x-request-id"] == unhandled_payload["request_id"]
    finally:
        if previous_db is None:
            os.environ.pop("RESUMEPR_DB_PATH", None)
        else:
            os.environ["RESUMEPR_DB_PATH"] = previous_db

        if db_path.exists():
            db_path.unlink()
