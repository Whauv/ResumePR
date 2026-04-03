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
    SuggestRequest,
    SuggestResponse,
)
from services.ai_suggester import generate_suggestions
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


def fetch_resume_and_job(connection: sqlite3.Connection, resume_id: str, job_id: str) -> tuple[ParsedResume, ParsedJob]:
    resume_payload = fetch_record(connection, "resumes", resume_id)
    job_payload = fetch_record(connection, "jobs", job_id)

    if not resume_payload:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not job_payload:
        raise HTTPException(status_code=404, detail="Job not found.")

    return (
        ParsedResume.model_validate(json.loads(resume_payload)),
        ParsedJob.model_validate(json.loads(job_payload)),
    )


@router.post("/gap", response_model=GapAnalysisResponse)
def create_gap_analysis(request: GapAnalysisRequest) -> GapAnalysisResponse:
    connection = get_connection()
    try:
        resume_json, job_json = fetch_resume_and_job(connection, request.resume_id, request.job_id)
    finally:
        connection.close()
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


@router.post("/suggest", response_model=SuggestResponse)
def create_suggestions(request: SuggestRequest) -> SuggestResponse:
    connection = get_connection()
    try:
        resume_json, job_json = fetch_resume_and_job(connection, request.resume_id, request.job_id)
    finally:
        connection.close()

    gap_report = GapReport.model_validate(analyze_gap(resume_json.model_dump(), job_json.model_dump()))
    try:
        suggestions = generate_suggestions(
            resume_json.model_dump(),
            job_json.model_dump(),
            gap_report.model_dump(),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    batch_id = str(uuid4())
    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO suggestion_batches (id, resume_id, job_id) VALUES (?, ?, ?)",
            (batch_id, request.resume_id, request.job_id),
        )
        connection.executemany(
            "INSERT INTO suggestions (id, batch_id, resume_id, job_id, suggestion_json) VALUES (?, ?, ?, ?, ?)",
            [
                (
                    suggestion.id,
                    batch_id,
                    request.resume_id,
                    request.job_id,
                    json.dumps(suggestion.model_dump()),
                )
                for suggestion in suggestions
            ],
        )
        connection.commit()
    finally:
        connection.close()

    return SuggestResponse(
        suggestion_batch_id=batch_id,
        resume_id=request.resume_id,
        job_id=request.job_id,
        suggestions=suggestions,
    )
