from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

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
            user_id TEXT NOT NULL DEFAULT '',
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
            user_id TEXT NOT NULL DEFAULT '',
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
            user_id TEXT NOT NULL DEFAULT '',
            suggestion_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for table_name in ("analyses", "suggestion_batches", "suggestions"):
        columns = {row[1] for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()}
        if "user_id" not in columns:
            connection.execute(f"ALTER TABLE {table_name} ADD COLUMN user_id TEXT NOT NULL DEFAULT ''")
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


def fetch_resume_and_job(connection: sqlite3.Connection, user_id: str, resume_id: str, job_id: str) -> tuple[ParsedResume, ParsedJob]:
    resume_row = connection.execute(
        "SELECT parsed_json FROM resumes WHERE id = ? AND user_id = ?",
        (resume_id, user_id),
    ).fetchone()
    job_row = connection.execute(
        "SELECT parsed_json FROM jobs WHERE id = ? AND user_id = ?",
        (job_id, user_id),
    ).fetchone()
    resume_payload = resume_row[0] if resume_row else None
    job_payload = job_row[0] if job_row else None

    if not resume_payload:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not job_payload:
        raise HTTPException(status_code=404, detail="Job not found.")

    return (
        ParsedResume.model_validate(json.loads(resume_payload)),
        ParsedJob.model_validate(json.loads(job_payload)),
    )


@router.post("/gap", response_model=GapAnalysisResponse)
def create_gap_analysis(http_request: Request, request: GapAnalysisRequest) -> GapAnalysisResponse:
    user_id = http_request.state.user_id
    connection = get_connection()
    try:
        resume_json, job_json = fetch_resume_and_job(connection, user_id, request.resume_id, request.job_id)
    finally:
        connection.close()
    report = GapReport.model_validate(analyze_gap(resume_json.model_dump(), job_json.model_dump()))

    analysis_id = str(uuid4())
    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO analyses (id, resume_id, job_id, user_id, report_json) VALUES (?, ?, ?, ?, ?)",
            (analysis_id, request.resume_id, request.job_id, user_id, json.dumps(report.model_dump())),
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
def create_suggestions(http_request: Request, request: SuggestRequest) -> SuggestResponse:
    user_id = http_request.state.user_id
    connection = get_connection()
    try:
        resume_json, job_json = fetch_resume_and_job(connection, user_id, request.resume_id, request.job_id)
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
            "INSERT INTO suggestion_batches (id, resume_id, job_id, user_id) VALUES (?, ?, ?, ?)",
            (batch_id, request.resume_id, request.job_id, user_id),
        )
        connection.executemany(
            "INSERT INTO suggestions (id, batch_id, resume_id, job_id, user_id, suggestion_json) VALUES (?, ?, ?, ?, ?, ?)",
            [
                (
                    suggestion.id,
                    batch_id,
                    request.resume_id,
                    request.job_id,
                    user_id,
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
