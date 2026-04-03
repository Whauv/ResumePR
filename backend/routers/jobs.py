from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from uuid import uuid4

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Request

from models.schemas import JobParseRequest, JobParseResponse, ParsedJob
from services.keyword_extractor import extract_keywords

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

DB_PATH = Path(__file__).resolve().parents[1] / "resumes.db"
JOB_BOARD_SELECTORS = {
    "linkedin": [".description__text"],
    "greenhouse": ["#content"],
    "workday": [".css-129m7dg", ".job-description"],
    "lever": [".posting-description"],
}


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            source_url TEXT,
            parsed_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    columns = {row[1] for row in connection.execute("PRAGMA table_info(jobs)").fetchall()}
    if "user_id" not in columns:
        connection.execute("ALTER TABLE jobs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''")
    return connection


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def detect_board(url: str) -> str | None:
    lowered = url.lower()
    for board in JOB_BOARD_SELECTORS:
        if board in lowered:
            return board
    return None


async def fetch_job_page(url: str) -> tuple[BeautifulSoup, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        )
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=20.0, headers=headers) as client:
        response = await client.get(url)
        response.raise_for_status()
    html = response.text
    return BeautifulSoup(html, "html.parser"), html


def extract_text_from_soup(url: str, soup: BeautifulSoup) -> str:
    selectors = JOB_BOARD_SELECTORS.get(detect_board(url) or "", [])
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            return clean_text(node.get_text(" ", strip=True))

    for container_selector in ["main", "article"]:
        container = soup.select_one(container_selector)
        if not container:
            continue
        text_nodes = [node.get_text(" ", strip=True) for node in container.select("p, li")]
        text = clean_text(" ".join(text_nodes))
        if text:
            return text

    text_nodes = [node.get_text(" ", strip=True) for node in soup.select("p, li")]
    return clean_text(" ".join(text_nodes))


def extract_job_title(url: str, soup: BeautifulSoup, text: str, provided_title: str) -> str:
    if provided_title:
        return clean_text(provided_title)

    selectors = ["h1", '[data-test="job-title"]', ".top-card-layout__title", ".posting-headline h2"]
    for selector in selectors:
        node = soup.select_one(selector)
        if node and node.get_text(strip=True):
            return clean_text(node.get_text(" ", strip=True))

    if soup.title and soup.title.string:
        title_text = clean_text(soup.title.string)
        for separator in ["|", "-", " at "]:
            if separator in title_text:
                return clean_text(title_text.split(separator)[0])
        return title_text

    first_line = text.split(".")[0][:120]
    return clean_text(first_line)


def extract_company_name(soup: BeautifulSoup, provided_company: str) -> str:
    if provided_company:
        return clean_text(provided_company)

    selectors = [
        '[data-test="company-name"]',
        ".topcard__org-name-link",
        ".sub-nav-cta__company-name",
        ".posting-categories + .company",
        ".company",
    ]
    for selector in selectors:
        node = soup.select_one(selector)
        if node and node.get_text(strip=True):
            return clean_text(node.get_text(" ", strip=True))
    return ""


def split_required_preferred(text: str, all_skills: list[str]) -> tuple[list[str], list[str]]:
    required_section = " ".join(
        re.findall(r"(?:requirements|qualifications|must have|required)[^:]*:(.*?)(?:preferred|nice to have|benefits|$)", text, flags=re.IGNORECASE | re.DOTALL)
    )
    preferred_section = " ".join(
        re.findall(r"(?:preferred|nice to have|bonus|plus)[^:]*:(.*?)(?:requirements|benefits|$)", text, flags=re.IGNORECASE | re.DOTALL)
    )

    required_skills = [skill for skill in all_skills if skill.lower() in required_section.lower()]
    preferred_skills = [skill for skill in all_skills if skill.lower() in preferred_section.lower()]

    fallback_required = [skill for skill in all_skills if skill not in preferred_skills]
    return sorted(set(required_skills or fallback_required), key=str.lower), sorted(set(preferred_skills), key=str.lower)


def extract_experience_years(text: str) -> int | None:
    patterns = [
        r"(\d+)\+?\s+years? of experience",
        r"minimum of (\d+)\s+years?",
        r"(\d+)\+?\s+years? in",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def extract_education_requirement(text: str, keyword_data: dict[str, list[str]]) -> str:
    match = re.search(
        r"((?:bachelor|master|phd|associate)[^.;\n]{0,90})",
        text,
        flags=re.IGNORECASE,
    )
    if match:
        return clean_text(match.group(1))
    if keyword_data["qualifications"]:
        return keyword_data["qualifications"][0]
    return ""


def build_parsed_job(text: str, job_title: str, company_name: str) -> ParsedJob:
    keyword_data = extract_keywords(text)
    all_skills = keyword_data["skills"] + keyword_data["tools"]
    required_skills, preferred_skills = split_required_preferred(text, all_skills)

    return ParsedJob(
        job_title=job_title,
        company_name=company_name,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        experience_years=extract_experience_years(text),
        education_requirement=extract_education_requirement(text, keyword_data),
        raw_text=text,
    )


@router.post("/parse", response_model=JobParseResponse)
async def parse_job(http_request: Request, request: JobParseRequest) -> JobParseResponse:
    user_id = http_request.state.user_id
    if request.url:
        try:
            soup, _html = await fetch_job_page(request.url)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=400, detail=f"Failed to fetch job URL: {exc}") from exc
        raw_text = extract_text_from_soup(request.url, soup)
        job_title = extract_job_title(request.url, soup, raw_text, request.job_title)
        company_name = extract_company_name(soup, request.company_name)
    else:
        raw_text = clean_text(request.raw_text or "")
        soup = BeautifulSoup("", "html.parser")
        job_title = clean_text(request.job_title)
        company_name = clean_text(request.company_name)

    if not raw_text:
        raise HTTPException(status_code=400, detail="Could not extract job description text.")

    parsed_job = build_parsed_job(raw_text, job_title, company_name)
    job_id = str(uuid4())

    connection = get_connection()
    try:
        connection.execute(
            "INSERT INTO jobs (id, user_id, source_url, parsed_json) VALUES (?, ?, ?, ?)",
            (job_id, user_id, request.url or "", json.dumps(parsed_job.model_dump())),
        )
        connection.commit()
    finally:
        connection.close()

    return JobParseResponse(job_id=job_id, **parsed_job.model_dump())


@router.get("/latest/from-extension", response_model=JobParseResponse)
def get_latest_job(request: Request) -> JobParseResponse:
    user_id = request.state.user_id
    connection = get_connection()
    try:
        row = connection.execute(
            "SELECT id, parsed_json FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    finally:
        connection.close()

    if not row:
        raise HTTPException(status_code=404, detail="No parsed job found yet.")

    parsed_job = ParsedJob.model_validate(json.loads(row[1]))
    return JobParseResponse(job_id=row[0], **parsed_job.model_dump())


@router.get("/{job_id}", response_model=JobParseResponse)
def get_job(request: Request, job_id: str) -> JobParseResponse:
    user_id = request.state.user_id
    connection = get_connection()
    try:
        row = connection.execute(
            "SELECT parsed_json FROM jobs WHERE id = ? AND user_id = ?",
            (job_id, user_id),
        ).fetchone()
    finally:
        connection.close()

    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")

    parsed_job = ParsedJob.model_validate(json.loads(row[0]))
    return JobParseResponse(job_id=job_id, **parsed_job.model_dump())
