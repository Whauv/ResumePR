from __future__ import annotations

import json
import os
import re
from typing import Any
from uuid import uuid4

import httpx
from pydantic import BaseModel, ValidationError

from models.schemas import EditSuggestion

try:
    from google import genai
except Exception:  # pragma: no cover
    genai = None  # type: ignore[assignment]


class SuggestionEnvelope(BaseModel):
    suggestions: list[EditSuggestion]


def _extract_json_blob(raw_text: str) -> str:
    normalized = raw_text.strip()
    if normalized.startswith("```"):
        normalized = normalized.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    match = re.search(r"(\{.*\}|\[.*\])", normalized, flags=re.DOTALL)
    return match.group(1) if match else normalized


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
- Return a JSON object with one key: "suggestions"
- The "suggestions" value must be an array of EditSuggestion objects
- Return JSON ONLY, no prose or markdown fences

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
    payload = json.loads(_extract_json_blob(raw_text))
    if isinstance(payload, dict) and "suggestions" in payload:
        parsed = SuggestionEnvelope.model_validate(payload).suggestions
    else:
        parsed = [EditSuggestion.model_validate(item) for item in payload]

    suggestions = []
    for item in parsed:
        item.id = item.id or str(uuid4())
        suggestions.append(item)
    return sorted(suggestions, key=lambda suggestion: suggestion.confidence, reverse=True)


def generate_with_groq(api_key: str, prompt: str) -> list[EditSuggestion]:
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You rewrite resumes conservatively and return strict JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
            },
        )
    response.raise_for_status()
    payload = response.json()
    raw_text = payload["choices"][0]["message"]["content"]
    return parse_suggestions(raw_text)


def generate_with_gemini(api_key: str, prompt: str) -> list[EditSuggestion]:
    if genai is None:
        raise RuntimeError("google-genai is not installed.")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
        },
    )
    raw_text = getattr(response, "text", "") or ""
    return parse_suggestions(raw_text)


def generate_suggestions(resume_json: dict[str, Any], job_json: dict[str, Any], gap_report: dict[str, Any]) -> list[EditSuggestion]:
    prompt = build_prompt(resume_json, job_json, gap_report)
    groq_api_key = os.getenv("GROQ_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    errors: list[str] = []

    if groq_api_key:
        try:
            return generate_with_groq(groq_api_key, prompt)
        except (httpx.HTTPError, json.JSONDecodeError, ValidationError, KeyError) as exc:
            errors.append(f"Groq failed: {exc}")

    if gemini_api_key:
        try:
            return generate_with_gemini(gemini_api_key, prompt)
        except (json.JSONDecodeError, ValidationError, RuntimeError, KeyError) as exc:
            errors.append(f"Gemini failed: {exc}")

    if not groq_api_key and not gemini_api_key:
        raise RuntimeError("Neither GROQ_API_KEY nor GEMINI_API_KEY is set.")
    raise RuntimeError("Suggestion generation failed. " + " | ".join(errors))
