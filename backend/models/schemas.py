from __future__ import annotations

from typing import Any, Literal

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


class EditSuggestion(BaseModel):
    id: str = ""
    section: Literal["experience", "skills", "summary"]
    section_index: int
    bullet_index: int
    original_text: str
    suggested_text: str
    reason: str
    keywords_added: list[str] = Field(default_factory=list)
    confidence: float


class SuggestRequest(BaseModel):
    resume_id: str
    job_id: str


class SuggestResponse(BaseModel):
    suggestion_batch_id: str
    resume_id: str
    job_id: str
    suggestions: list[EditSuggestion] = Field(default_factory=list)


class ApplyEditsRequest(BaseModel):
    resume_id: str
    accepted_edit_ids: list[str] = Field(default_factory=list)


class ResumeVersionMetadata(BaseModel):
    version_number: int
    job_id: str
    company_name: str = ""
    role: str = ""
    timestamp: str
    accepted_count: int = 0
    rejected_count: int = 0


class ResumeVersion(BaseModel):
    version_id: str
    base_resume_id: str
    metadata: ResumeVersionMetadata
    resume_json: ParsedResume


class ApplyEditsResponse(BaseModel):
    version_id: str
    updated_resume: ParsedResume
    metadata: ResumeVersionMetadata


class ResumeVersionListResponse(BaseModel):
    versions: list[ResumeVersion] = Field(default_factory=list)
