from __future__ import annotations

import io
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from resumepr_api.models.schemas import VersionDiffResponse, VersionListResponse
from resumepr_api.services.db import get_connection
from resumepr_api.services.export import build_docx_resume, draw_pdf_resume
from resumepr_api.services.versions import (
    ORDER_BY_CREATED_DESC,
    diff_versions,
    fetch_previous_version,
    fetch_version,
    fetch_versions_by_resume,
    row_to_summary,
    row_to_version,
)

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

router = APIRouter(prefix="/api/versions", tags=["versions"])


@router.get("/{resume_id}", response_model=VersionListResponse)
def list_versions(request: Request, resume_id: str) -> VersionListResponse:
    user_id = request.state.user_id
    connection = get_connection()
    try:
        rows = fetch_versions_by_resume(connection, resume_id, user_id, order_by=ORDER_BY_CREATED_DESC)
    finally:
        connection.close()

    return VersionListResponse(versions=[row_to_summary(row) for row in rows])


@router.get("/{version_id}/diff", response_model=VersionDiffResponse)
def get_version_diff(request: Request, version_id: str) -> VersionDiffResponse:
    user_id = request.state.user_id
    connection = get_connection()
    try:
        row = fetch_version(connection, version_id, user_id)
        if not row:
            raise HTTPException(status_code=404, detail="Version not found.")

        previous_row = fetch_previous_version(
            connection, row["base_resume_id"], user_id, row["version_number"]
        )
    finally:
        connection.close()

    previous = row_to_version(previous_row) if previous_row else None
    return diff_versions(row_to_version(row), previous)


@router.post("/{version_id}/export")
def export_version(
    request: Request,
    version_id: str,
    format: str = Query(..., pattern="^(pdf|docx)$"),
    template: str = Query("modern", pattern="^(modern|classic|minimal)$"),
):
    user_id = request.state.user_id
    connection = get_connection()
    try:
        row = fetch_version(connection, version_id, user_id, extra_columns=("preserved_docx_blob",))
        resume_row = (
            connection.execute(
                "SELECT file_name, file_type, original_file FROM resumes WHERE id = ? AND user_id = ?",
                (row["base_resume_id"], user_id),
            ).fetchone()
            if row
            else None
        )
    finally:
        connection.close()

    if not row:
        raise HTTPException(status_code=404, detail="Version not found.")

    version = row_to_version(row)
    version_number = version.metadata.version_number
    preserved_blob = row["preserved_docx_blob"]

    if resume_row and resume_row["file_type"] == "docx" and preserved_blob:
        if format == "docx":
            buffer = io.BytesIO(preserved_blob)
            buffer.seek(0)
            file_stem = Path(resume_row["file_name"] or f"resume-{version_number}").stem
            return StreamingResponse(
                buffer,
                media_type=DOCX_MEDIA_TYPE,
                headers={"Content-Disposition": f'attachment; filename="{file_stem}-v{version_number}.docx"'},
            )
        raise HTTPException(
            status_code=400,
            detail="Exact-format PDF export is not available yet. Download DOCX to preserve the original layout and fonts.",
        )

    if resume_row and resume_row["file_type"] == "pdf":
        raise HTTPException(
            status_code=400,
            detail="Exact format-preserving export is only supported for DOCX source resumes. PDF uploads cannot be safely rewritten while keeping the original typography and layout.",
        )

    if format == "pdf":
        buffer = io.BytesIO()
        draw_pdf_resume(buffer, version.resume_json, template)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="resume-{version_number}.pdf"'},
        )

    buffer = build_docx_resume(version.resume_json, template)
    return StreamingResponse(
        buffer,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="resume-{version_number}.docx"'},
    )
