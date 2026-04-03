from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import ParsedResume, ResumeUploadResponse
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
    return connection


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
