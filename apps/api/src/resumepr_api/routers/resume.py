from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from resumepr_api.models.schemas import (
    ApplyEditsRequest,
    ApplyEditsResponse,
    EditSuggestion,
    GapReport,
    JobParseResponse,
    ParsedResume,
    ResumeUploadResponse,
    ResumeVersionListResponse,
    ResumeVersionMetadata,
)
from resumepr_api.services.db import get_connection
from resumepr_api.services.export import preserve_docx_format_with_edits
from resumepr_api.services.gap_analyzer import analyze_gap
from resumepr_api.services.parser import parse_resume
from resumepr_api.services.versions import (
    ORDER_BY_VERSION_DESC,
    fetch_versions_by_resume,
    row_to_version,
)

router = APIRouter(prefix="/api/resume", tags=["resume"])


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
    ats_score_before: float = 0.0,
    ats_score_after: float = 0.0,
) -> ResumeVersionMetadata:
    return ResumeVersionMetadata(
        version_number=version_number,
        job_id=job_id,
        company_name=company_name,
        role=role,
        timestamp=created_at,
        accepted_count=accepted_count,
        rejected_count=rejected_count,
        ats_score_before=ats_score_before,
        ats_score_after=ats_score_after,
    )


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(request: Request, file: UploadFile = File(...)) -> ResumeUploadResponse:
    user_id = request.state.user_id
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
            "INSERT INTO resumes (id, user_id, file_name, file_type, original_file, parsed_json) VALUES (?, ?, ?, ?, ?, ?)",
            (resume_id, user_id, file.filename or "resume", file_type, file_bytes, json.dumps(parsed_resume.model_dump())),
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


@dataclass
class _ApplyEditsInputs:
    raw_resume_json: str
    source_file_type: str
    original_file_bytes: bytes | None
    suggestions: list[EditSuggestion]
    job_id: str
    job_payload: JobParseResponse
    version_number: int
    accepted_count: int
    rejected_count: int


def _load_apply_edits_inputs(user_id: str, request: ApplyEditsRequest) -> _ApplyEditsInputs:
    """Read and validate everything apply-edits needs in one DB round-trip."""
    connection = get_connection()
    try:
        resume_row = connection.execute(
            "SELECT parsed_json, file_type, original_file FROM resumes WHERE id = ? AND user_id = ?",
            (request.resume_id, user_id),
        ).fetchone()
        if not resume_row:
            raise HTTPException(status_code=404, detail="Resume not found.")

        placeholders = ",".join("?" for _ in request.accepted_edit_ids)
        suggestion_rows = connection.execute(
            f"SELECT id, batch_id, job_id, suggestion_json FROM suggestions WHERE id IN ({placeholders}) AND resume_id = ? AND user_id = ?",
            (*request.accepted_edit_ids, request.resume_id, user_id),
        ).fetchall()
        if not suggestion_rows:
            raise HTTPException(status_code=404, detail="No matching suggestions found.")

        batch_ids = {row["batch_id"] for row in suggestion_rows}
        if len(batch_ids) != 1:
            raise HTTPException(status_code=400, detail="Accepted edits must come from a single suggestion batch.")

        batch_id = suggestion_rows[0]["batch_id"]
        job_id = suggestion_rows[0]["job_id"]

        total_suggestions = connection.execute(
            "SELECT COUNT(*) FROM suggestions WHERE batch_id = ? AND user_id = ?",
            (batch_id, user_id),
        ).fetchone()[0]

        job_row = connection.execute(
            "SELECT parsed_json FROM jobs WHERE id = ? AND user_id = ?",
            (job_id, user_id),
        ).fetchone()
        if not job_row:
            raise HTTPException(status_code=404, detail="Associated job not found.")

        version_count = connection.execute(
            "SELECT COUNT(*) FROM resume_versions WHERE base_resume_id = ? AND user_id = ?",
            (request.resume_id, user_id),
        ).fetchone()[0]
    finally:
        connection.close()

    suggestions = [EditSuggestion.model_validate(json.loads(row["suggestion_json"])) for row in suggestion_rows]
    accepted_count = len(suggestions)
    return _ApplyEditsInputs(
        raw_resume_json=resume_row["parsed_json"],
        source_file_type=(resume_row["file_type"] or "").lower(),
        original_file_bytes=resume_row["original_file"],
        suggestions=suggestions,
        job_id=job_id,
        job_payload=JobParseResponse.model_validate({"job_id": job_id, **json.loads(job_row["parsed_json"])}),
        version_number=int(version_count) + 1,
        accepted_count=accepted_count,
        rejected_count=int(total_suggestions) - accepted_count,
    )


def _preserved_docx_blob(inputs: _ApplyEditsInputs) -> bytes | None:
    if inputs.source_file_type == "docx" and inputs.original_file_bytes:
        try:
            return preserve_docx_format_with_edits(inputs.original_file_bytes, inputs.suggestions)
        except Exception:
            return None
    return None


def _persist_new_version(
    *,
    version_id: str,
    resume_id: str,
    user_id: str,
    inputs: _ApplyEditsInputs,
    updated_resume: ParsedResume,
    created_at: str,
    ats_score_before: float,
    ats_score_after: float,
    preserved_docx_blob: bytes | None,
) -> None:
    connection = get_connection()
    try:
        connection.execute(
            """
            INSERT INTO resume_versions (
                version_id, base_resume_id, user_id, version_number, job_id, company_name, role,
                accepted_count, rejected_count, resume_json, created_at, ats_score_before, ats_score_after
                , preserved_docx_blob
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                version_id,
                resume_id,
                user_id,
                inputs.version_number,
                inputs.job_id,
                inputs.job_payload.company_name,
                inputs.job_payload.job_title,
                inputs.accepted_count,
                inputs.rejected_count,
                json.dumps(updated_resume.model_dump()),
                created_at,
                ats_score_before,
                ats_score_after,
                preserved_docx_blob,
            ),
        )
        connection.commit()
    finally:
        connection.close()


@router.post("/apply-edits", response_model=ApplyEditsResponse)
def apply_edits(http_request: Request, request: ApplyEditsRequest) -> ApplyEditsResponse:
    user_id = http_request.state.user_id
    if not request.accepted_edit_ids:
        raise HTTPException(status_code=400, detail="At least one accepted edit is required.")

    inputs = _load_apply_edits_inputs(user_id, request)

    resume_data = json.loads(inputs.raw_resume_json)
    for suggestion in inputs.suggestions:
        apply_suggestion_to_resume(resume_data, suggestion)

    preserved_docx_blob = _preserved_docx_blob(inputs)
    updated_resume = ParsedResume.model_validate(resume_data)
    original_resume = ParsedResume.model_validate(json.loads(inputs.raw_resume_json))
    gap_before = GapReport.model_validate(analyze_gap(original_resume.model_dump(), inputs.job_payload.model_dump()))
    gap_after = GapReport.model_validate(analyze_gap(updated_resume.model_dump(), inputs.job_payload.model_dump()))
    created_at = datetime.now(UTC).isoformat()
    version_id = str(uuid4())

    _persist_new_version(
        version_id=version_id,
        resume_id=request.resume_id,
        user_id=user_id,
        inputs=inputs,
        updated_resume=updated_resume,
        created_at=created_at,
        ats_score_before=gap_before.overall_score,
        ats_score_after=gap_after.overall_score,
        preserved_docx_blob=preserved_docx_blob,
    )

    metadata = build_version_metadata(
        version_number=inputs.version_number,
        job_id=inputs.job_id,
        company_name=inputs.job_payload.company_name,
        role=inputs.job_payload.job_title,
        accepted_count=inputs.accepted_count,
        rejected_count=inputs.rejected_count,
        created_at=created_at,
        ats_score_before=gap_before.overall_score,
        ats_score_after=gap_after.overall_score,
    )

    return ApplyEditsResponse(version_id=version_id, updated_resume=updated_resume, metadata=metadata)


@router.get("/{resume_id}/versions", response_model=ResumeVersionListResponse)
def list_versions(request: Request, resume_id: str) -> ResumeVersionListResponse:
    user_id = request.state.user_id
    connection = get_connection()
    try:
        rows = fetch_versions_by_resume(connection, resume_id, user_id, order_by=ORDER_BY_VERSION_DESC)
    finally:
        connection.close()

    return ResumeVersionListResponse(versions=[row_to_version(row) for row in rows])
