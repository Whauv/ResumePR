from __future__ import annotations

import io
import re
from typing import Iterable

from docx import Document
from pdfminer.high_level import extract_text

SECTION_ALIASES = {
    "summary": {"summary", "professional summary", "profile", "objective"},
    "experience": {"experience", "work experience", "professional experience", "employment"},
    "education": {"education", "academic background"},
    "skills": {"skills", "technical skills", "core competencies", "competencies"},
}

DATE_PATTERN = re.compile(
    r"((19|20)\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)",
    re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
PHONE_PATTERN = re.compile(r"(\+?\d[\d\-\(\) ]{7,}\d)")
LINK_PATTERN = re.compile(r"(https?://\S+|linkedin\.com/\S+|github\.com/\S+)", re.IGNORECASE)
BULLET_PREFIX = re.compile(r"^(\u2022|\-|\*)\s*")
LOCATION_PATTERN = re.compile(r"\b([A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*[A-Z]{2})\b")


def parse_resume(file_bytes: bytes, file_type: str) -> dict:
    normalized_type = file_type.lower()
    if normalized_type == "pdf":
        text = extract_text(io.BytesIO(file_bytes))
    elif normalized_type == "docx":
        document = Document(io.BytesIO(file_bytes))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    lines = normalize_lines(text)
    first_section_index = next((index for index, line in enumerate(lines) if canonical_section(line)), len(lines))
    header_lines = lines[:first_section_index]
    sections = split_sections(lines[first_section_index:])
    name, contact = parse_header(header_lines[:8])

    return {
        "name": name,
        "contact": contact,
        "summary": parse_summary(sections.get("summary", [])),
        "experience": parse_experience(sections.get("experience", [])),
        "education": parse_education(sections.get("education", [])),
        "skills": parse_skills(sections.get("skills", [])),
    }


def normalize_lines(text: str) -> list[str]:
    cleaned = text.replace("\r", "\n")
    return [line.strip() for line in cleaned.split("\n") if line.strip()]


def canonical_section(line: str) -> str | None:
    simplified = re.sub(r"[^a-z ]", "", line.lower()).strip()
    for canonical, aliases in SECTION_ALIASES.items():
        if simplified in aliases:
            return canonical
    if simplified in {"experience", "education", "skills", "summary"}:
        return simplified
    return None


def split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections = {"summary": [], "experience": [], "education": [], "skills": []}
    current_section = "summary"
    for line in lines:
        detected = canonical_section(line)
        if detected:
            current_section = detected
            continue
        sections.setdefault(current_section, []).append(line)
    return sections


def parse_header(lines: list[str]) -> tuple[str, dict]:
    if not lines:
        return "", {}

    name = next((line for line in lines if len(line.split()) <= 5 and not EMAIL_PATTERN.search(line)), lines[0])
    header_blob = " | ".join(lines)

    contact = {}
    email_match = EMAIL_PATTERN.search(header_blob)
    phone_match = PHONE_PATTERN.search(header_blob)
    links = LINK_PATTERN.findall(header_blob)

    if email_match:
        contact["email"] = email_match.group(0)
    if phone_match:
        contact["phone"] = phone_match.group(0).strip()
    if links:
        contact["links"] = links

    location_candidates = [
        line for line in lines
        if "," in line and not LINK_PATTERN.search(line)
    ]
    for candidate in location_candidates:
        location_match = LOCATION_PATTERN.search(candidate)
        if location_match:
            contact["location"] = location_match.group(1)
            break
    else:
        location_match = LOCATION_PATTERN.search(header_blob)
        if location_match:
            contact["location"] = location_match.group(1)

    return name, contact


def parse_summary(lines: list[str]) -> str:
    return " ".join(lines).strip()


def parse_experience(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    current: dict | None = None

    for line in lines:
        bullet_line = BULLET_PREFIX.sub("", line).strip()
        is_bullet = bullet_line != line or line.startswith("- ")

        if is_bullet and current:
            current["bullets"].append(bullet_line)
            continue

        if looks_like_experience_header(line):
            if current:
                entries.append(current)
            current = build_experience_entry(line)
            continue

        if current and current["bullets"]:
            current["bullets"][-1] = f'{current["bullets"][-1]} {line}'.strip()
        elif current:
            if not current["company"]:
                current["company"] = line
            elif not current["dates"] and DATE_PATTERN.search(line):
                current["dates"] = line
            else:
                current["bullets"].append(line)
        else:
            current = build_experience_entry(line)

    if current:
        entries.append(current)

    return entries


def looks_like_experience_header(line: str) -> bool:
    if BULLET_PREFIX.match(line):
        return False
    separators = [" at ", " | ", " - ", ","]
    return any(separator in line.lower() for separator in separators) or bool(DATE_PATTERN.search(line))


def build_experience_entry(line: str) -> dict:
    parts = [part.strip() for part in re.split(r"\||-", line) if part.strip()]
    title = parts[0] if parts else line.strip()
    company = parts[1] if len(parts) > 1 else ""
    dates = next((part for part in parts[2:] if DATE_PATTERN.search(part)), "")

    if not dates and DATE_PATTERN.search(line):
        dates = line

    return {
        "title": title,
        "company": company,
        "dates": dates,
        "bullets": [],
    }


def parse_education(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    current: dict | None = None

    for line in lines:
        if current is None:
            current = {"degree": line, "institution": "", "dates": ""}
            continue

        if DATE_PATTERN.search(line) and not current["dates"]:
            current["dates"] = line
            entries.append(current)
            current = None
            continue

        if not current["institution"]:
            current["institution"] = line
        else:
            current["degree"] = f'{current["degree"]} {line}'.strip()

    if current:
        entries.append(current)

    return entries


def parse_skills(lines: Iterable[str]) -> list[str]:
    blob = " ".join(lines)
    raw_skills = re.split(r"[,\u2022\|/]", blob)
    return [skill.strip() for skill in raw_skills if skill.strip()]
