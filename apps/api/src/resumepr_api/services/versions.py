"""Canonical persistence + mapping for resume versions.

Centralizes the column list, row->model mapping, and the version queries that
were previously duplicated (and divergent) across the resume and versions
routers. Rows are sqlite3.Row, so columns are accessed by name.
"""

from __future__ import annotations

import json
import sqlite3

from resumepr_api.models.schemas import (
    ParsedResume,
    ResumeVersion,
    ResumeVersionMetadata,
    VersionDiffItem,
    VersionDiffResponse,
    VersionSummary,
)
from resumepr_api.services.text_utils import join_dash

VERSION_COLUMNS = (
    "version_id",
    "base_resume_id",
    "user_id",
    "version_number",
    "job_id",
    "company_name",
    "role",
    "accepted_count",
    "rejected_count",
    "resume_json",
    "created_at",
    "ats_score_before",
    "ats_score_after",
)
_COLUMN_SQL = ", ".join(VERSION_COLUMNS)

# Allowed ORDER BY clauses (internal constants, never user input).
ORDER_BY_VERSION_DESC = "version_number DESC"
ORDER_BY_CREATED_DESC = "created_at DESC"


def row_to_metadata(row: sqlite3.Row) -> ResumeVersionMetadata:
    return ResumeVersionMetadata(
        version_number=row["version_number"],
        job_id=row["job_id"],
        company_name=row["company_name"] or "",
        role=row["role"] or "",
        timestamp=row["created_at"],
        accepted_count=row["accepted_count"],
        rejected_count=row["rejected_count"],
        ats_score_before=float(row["ats_score_before"] or 0),
        ats_score_after=float(row["ats_score_after"] or 0),
    )


def row_to_version(row: sqlite3.Row) -> ResumeVersion:
    return ResumeVersion(
        version_id=row["version_id"],
        base_resume_id=row["base_resume_id"],
        metadata=row_to_metadata(row),
        resume_json=ParsedResume.model_validate(json.loads(row["resume_json"])),
    )


def row_to_summary(row: sqlite3.Row) -> VersionSummary:
    return VersionSummary(
        version_id=row["version_id"],
        version_number=row["version_number"],
        job_title=row["role"] or "",
        company_name=row["company_name"] or "",
        timestamp=row["created_at"],
        accepted_edits_count=row["accepted_count"],
        ats_score_before=float(row["ats_score_before"] or 0),
        ats_score_after=float(row["ats_score_after"] or 0),
    )


def fetch_versions_by_resume(
    connection: sqlite3.Connection, resume_id: str, user_id: str, *, order_by: str
) -> list[sqlite3.Row]:
    return connection.execute(
        f"SELECT {_COLUMN_SQL} FROM resume_versions "
        f"WHERE base_resume_id = ? AND user_id = ? ORDER BY {order_by}",
        (resume_id, user_id),
    ).fetchall()


def fetch_version(
    connection: sqlite3.Connection,
    version_id: str,
    user_id: str,
    *,
    extra_columns: tuple[str, ...] = (),
) -> sqlite3.Row | None:
    columns = _COLUMN_SQL + "".join(f", {column}" for column in extra_columns)
    return connection.execute(
        f"SELECT {columns} FROM resume_versions WHERE version_id = ? AND user_id = ?",
        (version_id, user_id),
    ).fetchone()


def fetch_previous_version(
    connection: sqlite3.Connection, base_resume_id: str, user_id: str, version_number: int
) -> sqlite3.Row | None:
    return connection.execute(
        f"SELECT {_COLUMN_SQL} FROM resume_versions "
        "WHERE base_resume_id = ? AND user_id = ? AND version_number < ? "
        "ORDER BY version_number DESC LIMIT 1",
        (base_resume_id, user_id, version_number),
    ).fetchone()


def flatten_resume_for_diff(resume: ParsedResume) -> dict[str, str]:
    flattened = {
        "summary.text": resume.summary,
        "skills.list": ", ".join(resume.skills),
    }
    for index, item in enumerate(resume.experience):
        prefix = f"experience[{index}]"
        flattened[f"{prefix}.header"] = join_dash(item.title, item.company, item.dates)
        for bullet_index, bullet in enumerate(item.bullets):
            flattened[f"{prefix}.bullet[{bullet_index}]"] = bullet
    for index, item in enumerate(resume.education):
        flattened[f"education[{index}]"] = join_dash(item.degree, item.institution, item.dates)
    return flattened


def diff_versions(current: ResumeVersion, previous: ResumeVersion | None) -> VersionDiffResponse:
    current_map = flatten_resume_for_diff(current.resume_json)
    previous_map = flatten_resume_for_diff(previous.resume_json) if previous else {}
    keys = sorted(set(current_map) | set(previous_map))
    changes = []
    for key in keys:
        before = previous_map.get(key, "")
        after = current_map.get(key, "")
        if before == after:
            continue
        section, field = key.split(".", 1) if "." in key else (key, "text")
        changes.append(VersionDiffItem(section=section, field=field, before=before, after=after))

    return VersionDiffResponse(
        version_id=current.version_id,
        previous_version_id=previous.version_id if previous else None,
        changes=changes,
    )
