from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    dates: str = ""
    bullets: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    dates: str = ""


class ParsedResume(BaseModel):
    name: str = ""
    contact: dict[str, Any] = Field(default_factory=dict)
    summary: str = ""
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class ResumeUploadResponse(BaseModel):
    resume_id: str
    file_name: str
    file_type: str
    parsed_resume: ParsedResume
