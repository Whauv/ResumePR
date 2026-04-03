from __future__ import annotations

import json
import sqlite3
from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import (
    ApplyEditsRequest,
    ApplyEditsResponse,
    EditSuggestion,
    JobParseResponse,
    ParsedResume,
    ResumeUploadResponse,
    ResumeVersion,
    ResumeVersionListResponse,
    ResumeVersionMetadata,
)
from services.parser import parse_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])

DB_PATH = Path(__file__).resolve().parents[1] / "resumes.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            parsed_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS resume_versions (
            version_id TEXT PRIMARY KEY,
            base_resume_id TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            job_id TEXT NOT NULL,
            company_name TEXT,
            role TEXT,
            accepted_count INTEGER NOT NULL,
            rejected_count INTEGER NOT NULL,
            resume_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS suggestion_batches (
            id TEXT PRIMARY KEY,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS suggestions (
            id TEXT PRIMARY KEY,
            batch_id TEXT NOT NULL,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            suggestion_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            source_url TEXT,
            parsed_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def apply_suggestion_to_resume(resume_data: dict, suggestion: EditSuggestion) -> None:
    if suggestion.section == "summary":
        resume_data["summary"] = suggestion.suggested_text
        return

    if suggestion.section == "skills":
        resume_data["skills"] = [
            skill.strip()
            for skill in suggestion.suggested_text.split(",")
            if skill.strip()
        ]
        return

    if suggestion.section == "experience":
        experience_entries = resume_data.get("experience", [])
        if suggestion.section_index >= len(experience_entries):
            return
        bullets = experience_entries[suggestion.section_index].get("bullets", [])
        if 0 <= suggestion.bullet_index < len(bullets):
            bullets[suggestion.bullet_index] = suggestion.suggested_text


def build_version_metadata(
    version_number: int,
    job_id: str,
    company_name: str,
    role: str,
    accepted_count: int,
    rejected_count: int,
    created_at: str,
) -> ResumeVersionMetadata:
    return ResumeVersionMetadata(
        version_number=version_number,
        job_id=job_id,
        company_name=company_name,
        role=role,
        timestamp=created_at,
        accepted_count=accepted_count,
        rejected_count=rejected_count,
    )


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)) -> ResumeUploadResponse:
    extension = Path(file.filename or "").suffix.lower()
    file_type_map = {".pdf": "pdf", ".docx": "docx"}
    file_type = file_type_map.get(extension)

    if not file_type:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    file_bytes = await file.read()
    try:
        parsed_data = parse_resume(file_bytes, file_type)
        parsed_resume = ParsedResume.model_validate(parsed_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to parse resume.") from exc

    resume_id = str(uuid4())
    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO resumes (id, file_name, file_type, parsed_json) VALUES (?, ?, ?, ?)",
            (resume_id, file.filename or "resume", file_type, json.dumps(parsed_resume.model_dump())),
        )
        connection.commit()
    finally:
        connection.close()

    return ResumeUploadResponse(
        resume_id=resume_id,
        file_name=file.filename or "resume",
        file_type=file_type,
        parsed_resume=parsed_resume,
    )


@router.post("/apply-edits", response_model=ApplyEditsResponse)
def apply_edits(request: ApplyEditsRequest) -> ApplyEditsResponse:
    if not request.accepted_edit_ids:
        raise HTTPException(status_code=400, detail="At least one accepted edit is required.")

    connection = get_connection()
    try:
        resume_row = connection.execute(
            "SELECT parsed_json FROM resumes WHERE id = ?",
            (request.resume_id,),
        ).fetchone()
        if not resume_row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        placeholders = ",".join("?" for _ in request.accepted_edit_ids)
        suggestion_rows = connection.execute(
            f"SELECT id, batch_id, job_id, suggestion_json FROM suggestions WHERE id IN ({placeholders}) AND resume_id = ?",
            (*request.accepted_edit_ids, request.resume_id),
        ).fetchall()
        if not suggestion_rows:
            raise HTTPException(status_code=404, detail="No matching suggestions found.")

        batch_ids = {row[1] for row in suggestion_rows}
        if len(batch_ids) != 1:
            raise HTTPException(status_code=400, detail="Accepted edits must come from a single suggestion batch.")

        batch_id = suggestion_rows[0][1]
        job_id = suggestion_rows[0][2]

        total_suggestions = connection.execute(
            "SELECT COUNT(*) FROM suggestions WHERE batch_id = ?",
            (batch_id,),
        ).fetchone()[0]

        job_row = connection.execute(
            "SELECT parsed_json FROM jobs WHERE id = ?",
            (job_id,),
        ).fetchone()
        if not job_row:
            raise HTTPException(status_code=404, detail="Associated job not found.")

        version_count = connection.execute(
            "SELECT COUNT(*) FROM resume_versions WHERE base_resume_id = ?",
            (request.resume_id,),
        ).fetchone()[0]
    finally:
        connection.close()

    resume_data = json.loads(resume_row[0])
    suggestions = [EditSuggestion.model_validate(json.loads(row[3])) for row in suggestion_rows]
    for suggestion in suggestions:
        apply_suggestion_to_resume(resume_data, suggestion)

    updated_resume = ParsedResume.model_validate(resume_data)
    version_id = str(uuid4())
    version_number = int(version_count) + 1
    accepted_count = len(suggestions)
    rejected_count = int(total_suggestions) - accepted_count
    job_payload = JobParseResponse.model_validate({"job_id": job_id, **json.loads(job_row[0])})
    created_at = datetime.now(UTC).isoformat()
    metadata = build_version_metadata(
        version_number=version_number,
        job_id=job_id,
        company_name=job_payload.company_name,
        role=job_payload.job_title,
        accepted_count=accepted_count,
        rejected_count=rejected_count,
        created_at=created_at,
    )

    connection = get_connection()
    try:
        connection.execute(
            """
            INSERT INTO resume_versions (
                version_id, base_resume_id, version_number, job_id, company_name, role,
                accepted_count, rejected_count, resume_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                version_id,
                request.resume_id,
                version_number,
                job_id,
                job_payload.company_name,
                job_payload.job_title,
                accepted_count,
                rejected_count,
                json.dumps(updated_resume.model_dump()),
                created_at,
            ),
        )
        connection.commit()
    finally:
        connection.close()

    return ApplyEditsResponse(
        version_id=version_id,
        updated_resume=updated_resume,
        metadata=metadata,
    )


@router.get("/{resume_id}/versions", response_model=ResumeVersionListResponse)
def list_versions(resume_id: str) -> ResumeVersionListResponse:
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT version_id, base_resume_id, version_number, job_id, company_name, role,
                   accepted_count, rejected_count, resume_json, created_at
            FROM resume_versions
            WHERE base_resume_id = ?
            ORDER BY version_number DESC
            """,
            (resume_id,),
        ).fetchall()
    finally:
        connection.close()

    versions = [
        ResumeVersion(
            version_id=row[0],
            base_resume_id=row[1],
            metadata=build_version_metadata(
                version_number=row[2],
                job_id=row[3],
                company_name=row[4] or "",
                role=row[5] or "",
                accepted_count=row[6],
                rejected_count=row[7],
                created_at=row[9],
            ),
            resume_json=ParsedResume.model_validate(json.loads(row[8])),
        )
        for row in rows
    ]
    return ResumeVersionListResponse(versions=versions)
