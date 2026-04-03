from __future__ import annotations

import json
import os
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ValidationError

from models.schemas import EditSuggestion

try:
    from google import genai
except Exception:  # pragma: no cover
    genai = None  # type: ignore[assignment]


class SuggestionEnvelope(BaseModel):
    suggestions: list[EditSuggestion]


def build_prompt(resume_json: dict[str, Any], job_json: dict[str, Any], gap_report: dict[str, Any]) -> str:
    top_missing_keywords = gap_report.get("top_missing_keywords", [])
    job_description = job_json.get("raw_text", "")
    return f"""
You are a professional resume editor. Given the resume sections and job description below,
suggest targeted rewrites for specific bullet points that would better match the job requirements.

Rules:
- Only suggest changes to existing bullet points, do not add new ones
- Preserve the candidate's actual experience - do not fabricate achievements
- Focus on: adding missing keywords naturally, quantifying achievements, using stronger action verbs
- For each suggestion, explain WHY in one sentence
- Return JSON array of EditSuggestion objects ONLY, no prose

EditSuggestion schema:
{{
  "section": "experience" | "skills" | "summary",
  "section_index": int,
  "bullet_index": int,
  "original_text": string,
  "suggested_text": string,
  "reason": string,
  "keywords_added": [string],
  "confidence": float
}}

Resume JSON: {json.dumps(resume_json, ensure_ascii=True)}
Job Description: {json.dumps(job_description, ensure_ascii=True)}
Missing Keywords to Address: {json.dumps(top_missing_keywords, ensure_ascii=True)}
""".strip()


def parse_suggestions(raw_text: str) -> list[EditSuggestion]:
    payload = json.loads(raw_text)
    if isinstance(payload, dict) and "suggestions" in payload:
        parsed = SuggestionEnvelope.model_validate(payload).suggestions
    else:
        parsed = [EditSuggestion.model_validate(item) for item in payload]

    suggestions = []
    for item in parsed:
        item.id = item.id or str(uuid4())
        suggestions.append(item)
    return sorted(suggestions, key=lambda suggestion: suggestion.confidence, reverse=True)


def generate_suggestions(resume_json: dict[str, Any], job_json: dict[str, Any], gap_report: dict[str, Any]) -> list[EditSuggestion]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    if genai is None:
        raise RuntimeError("google-genai is not installed.")

    prompt = build_prompt(resume_json, job_json, gap_report)
    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Gemini suggestion generation failed: {exc}") from exc

    raw_text = getattr(response, "text", "") or ""
    try:
        return parse_suggestions(raw_text)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise RuntimeError("Gemini returned invalid suggestion JSON.") from exc
