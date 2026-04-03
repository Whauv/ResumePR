from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from models.schemas import (
    GapAnalysisRequest,
    GapAnalysisResponse,
    GapReport,
    ParsedJob,
    ParsedResume,
)
from services.gap_analyzer import analyze_gap

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

DB_PATH = Path(__file__).resolve().parents[1] / "resumes.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            resume_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            report_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def fetch_record(connection: sqlite3.Connection, table: str, record_id: str) -> str | None:
    try:
        row = connection.execute(
            f"SELECT parsed_json FROM {table} WHERE id = ?",
            (record_id,),
        ).fetchone()
    except sqlite3.OperationalError:
        return None
    return row[0] if row else None


@router.post("/gap", response_model=GapAnalysisResponse)
def create_gap_analysis(request: GapAnalysisRequest) -> GapAnalysisResponse:
    connection = get_connection()
    try:
        resume_payload = fetch_record(connection, "resumes", request.resume_id)
        job_payload = fetch_record(connection, "jobs", request.job_id)
    finally:
        connection.close()

    if not resume_payload:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not job_payload:
        raise HTTPException(status_code=404, detail="Job not found.")

    resume_json = ParsedResume.model_validate(json.loads(resume_payload))
    job_json = ParsedJob.model_validate(json.loads(job_payload))
    report = GapReport.model_validate(analyze_gap(resume_json.model_dump(), job_json.model_dump()))

    analysis_id = str(uuid4())
    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO analyses (id, resume_id, job_id, report_json) VALUES (?, ?, ?, ?)",
            (analysis_id, request.resume_id, request.job_id, json.dumps(report.model_dump())),
        )
        connection.commit()
    finally:
        connection.close()

    return GapAnalysisResponse(
        analysis_id=analysis_id,
        resume_id=request.resume_id,
        job_id=request.job_id,
        report=report,
    )
