from __future__ import annotations

import io
import json

import pytest

from conftest import AUTH_HEADERS

Document = pytest.importorskip("docx").Document


def build_sample_docx() -> bytes:
    document = Document()
    document.add_paragraph("Jane Doe")
    document.add_paragraph("jane@example.com | (555) 123-4567 | Denver, CO")
    document.add_paragraph("SUMMARY")
    document.add_paragraph("Product-minded software engineer with React and Python experience.")
    document.add_paragraph("EXPERIENCE")
    document.add_paragraph("Software Engineer | Acme Corp | 2022 - Present")
    document.add_paragraph("- Built React dashboards for recruiting workflows")
    document.add_paragraph("SKILLS")
    document.add_paragraph("Python, React, FastAPI, SQL")

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_upload_docx_returns_parsed_resume(api_client):
    """Regression guard for the missing `pathlib` import that made every upload
    raise NameError before it could parse the file."""
    client, _ = api_client

    response = client.post(
        "/api/resume/upload",
        headers=AUTH_HEADERS,
        files={
            "file": (
                "resume.docx",
                build_sample_docx(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["parsed_resume"]["name"] == "Jane Doe"
    assert "Python" in payload["parsed_resume"]["skills"]


def test_upload_rejects_unsupported_extension(api_client):
    client, _ = api_client

    response = client.post(
        "/api/resume/upload",
        headers=AUTH_HEADERS,
        files={"file": ("resume.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
    assert "PDF and DOCX" in response.json()["detail"]


def _seed_version(connection, *, version_id, number, created_at):
    connection.execute(
        """
        INSERT INTO resume_versions (
            version_id, base_resume_id, user_id, version_number, job_id, company_name, role,
            accepted_count, rejected_count, resume_json, created_at, ats_score_before, ats_score_after
        ) VALUES (?, 'r1', 'user-1', ?, 'j1', 'Acme', 'Engineer', 1, 0, ?, ?, 10, 40)
        """,
        (version_id, number, json.dumps({"name": "Jane", "contact": {}, "summary": "", "experience": [], "education": [], "skills": []}), created_at),
    )


def test_resume_versions_endpoint_orders_by_version_number_desc(api_client):
    """Locks the divergent contract preserved during the service extraction:
    /api/resume/{id}/versions returns full ResumeVersion objects, newest version
    number first."""
    client, api_main = api_client
    from resumepr_api.services.db import get_connection

    connection = get_connection()
    try:
        _seed_version(connection, version_id="v1", number=1, created_at="2026-01-01T00:00:00Z")
        _seed_version(connection, version_id="v2", number=2, created_at="2026-01-02T00:00:00Z")
        connection.commit()
    finally:
        connection.close()

    response = client.get("/api/resume/r1/versions", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.text
    versions = response.json()["versions"]

    assert [v["metadata"]["version_number"] for v in versions] == [2, 1]
    # Full ResumeVersion shape (not the summary shape).
    assert versions[0]["base_resume_id"] == "r1"
    assert versions[0]["resume_json"]["name"] == "Jane"


def _resume_payload(summary="Original summary"):
    return {
        "name": "Jane Doe",
        "contact": {"email": "jane@example.com"},
        "summary": summary,
        "experience": [
            {"title": "Engineer", "company": "Acme", "dates": "2022 - Present", "bullets": ["Built APIs"]}
        ],
        "education": [],
        "skills": ["Python"],
    }


def _job_payload():
    return {
        "job_title": "Platform Engineer",
        "company_name": "BigCo",
        "required_skills": ["Python", "AWS"],
        "preferred_skills": [],
        "experience_years": 3,
        "education_requirement": "",
        "raw_text": "We need Python and AWS for a platform role.",
    }


def test_apply_edits_creates_version_with_accepted_summary(api_client):
    """End-to-end characterization of the apply-edits handler before/after its
    decomposition: one accepted summary edit produces v1 with the new text and
    the right accepted/rejected counts and job metadata."""
    client, _ = api_client
    from resumepr_api.services.db import get_connection

    accepted = {
        "id": "s1",
        "section": "summary",
        "section_index": 0,
        "bullet_index": 0,
        "original_text": "Original summary",
        "suggested_text": "AWS-focused platform engineer with Python depth.",
        "reason": "Adds target keywords.",
        "keywords_added": ["AWS"],
        "confidence": 0.9,
    }
    rejected = {**accepted, "id": "s2", "suggested_text": "Unused alternative."}

    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO resumes (id, user_id, file_name, file_type, original_file, parsed_json) VALUES (?, ?, ?, ?, ?, ?)",
            ("r1", "user-1", "cv.pdf", "pdf", b"", json.dumps(_resume_payload())),
        )
        connection.execute(
            "INSERT INTO jobs (id, user_id, source_url, parsed_json) VALUES (?, ?, ?, ?)",
            ("j1", "user-1", "", json.dumps(_job_payload())),
        )
        for suggestion in (accepted, rejected):
            connection.execute(
                "INSERT INTO suggestions (id, batch_id, resume_id, job_id, user_id, suggestion_json) VALUES (?, ?, ?, ?, ?, ?)",
                (suggestion["id"], "b1", "r1", "j1", "user-1", json.dumps(suggestion)),
            )
        connection.commit()
    finally:
        connection.close()

    response = client.post(
        "/api/resume/apply-edits",
        headers=AUTH_HEADERS,
        json={"resume_id": "r1", "accepted_edit_ids": ["s1"]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["updated_resume"]["summary"] == "AWS-focused platform engineer with Python depth."
    assert body["metadata"]["version_number"] == 1
    assert body["metadata"]["accepted_count"] == 1
    assert body["metadata"]["rejected_count"] == 1  # batch of 2, one accepted
    assert body["metadata"]["company_name"] == "BigCo"
    assert body["metadata"]["role"] == "Platform Engineer"


def test_apply_edits_requires_accepted_ids(api_client):
    client, _ = api_client
    response = client.post(
        "/api/resume/apply-edits",
        headers=AUTH_HEADERS,
        json={"resume_id": "r1", "accepted_edit_ids": []},
    )
    assert response.status_code == 400
