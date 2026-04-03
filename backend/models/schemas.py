from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


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


class JobParseRequest(BaseModel):
    url: str | None = None
    raw_text: str | None = None
    job_title: str = ""
    company_name: str = ""

    @model_validator(mode="after")
    def validate_input(self) -> "JobParseRequest":
        if not self.url and not self.raw_text:
            raise ValueError("Either url or raw_text must be provided.")
        return self


class ParsedJob(BaseModel):
    job_title: str = ""
    company_name: str = ""
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    experience_years: int | None = None
    education_requirement: str = ""
    raw_text: str = ""


class JobParseResponse(ParsedJob):
    job_id: str


class SectionGapReport(BaseModel):
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    semantic_matches: list[str] = Field(default_factory=list)
    score: float = 0.0


class GapSections(BaseModel):
    skills: SectionGapReport = Field(default_factory=SectionGapReport)
    experience: SectionGapReport = Field(default_factory=SectionGapReport)
    summary: SectionGapReport = Field(default_factory=SectionGapReport)


class GapReport(BaseModel):
    overall_score: float = 0.0
    sections: GapSections = Field(default_factory=GapSections)
    top_missing_keywords: list[str] = Field(default_factory=list)
    ats_red_flags: list[str] = Field(default_factory=list)


class GapAnalysisRequest(BaseModel):
    resume_id: str
    job_id: str


class GapAnalysisResponse(BaseModel):
    analysis_id: str
    resume_id: str
    job_id: str
    report: GapReport
