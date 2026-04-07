from __future__ import annotations

from services.gap_analyzer import analyze_gap


def test_gap_analyzer_reports_missing_keywords_and_flags():
    resume_json = {
        "name": "Jane Doe",
        "contact": {"email": "jane@example.com"},
        "summary": "Backend engineer focused on Python APIs.",
        "experience": [
            {
                "title": "Software Engineer",
                "company": "Acme",
                "dates": "2022 - Present",
                "bullets": [
                    "Built FastAPI services for internal workflows.",
                    "Improved database performance for recruiter dashboards.",
                ],
            }
        ],
        "education": [],
        "skills": ["Python", "FastAPI", "SQL"],
    }
    job_json = {
        "job_title": "Platform Engineer",
        "company_name": "Example",
        "required_skills": ["Python", "AWS", "Docker"],
        "preferred_skills": ["Kubernetes"],
        "experience_years": 3,
        "education_requirement": "Bachelor's degree",
        "raw_text": "We need Python, AWS, Docker, and Kubernetes experience for a backend platform role.",
    }

    report = analyze_gap(resume_json, job_json)

    assert report["overall_score"] >= 0
    assert "Python" in report["sections"]["skills"]["matched"]
    assert "AWS" in report["sections"]["skills"]["missing"]
    assert "Docker" in report["top_missing_keywords"]
    assert isinstance(report["ats_red_flags"], list)


def test_gap_analyzer_flags_missing_summary_and_contact():
    resume_json = {
        "name": "Jane Doe",
        "contact": {},
        "summary": "",
        "experience": [],
        "education": [],
        "skills": [],
    }
    job_json = {
        "required_skills": ["Python"],
        "preferred_skills": [],
        "raw_text": "Python required.",
    }

    report = analyze_gap(resume_json, job_json)

    assert "Missing email address in contact information." in report["ats_red_flags"]
    assert "No summary section detected." in report["ats_red_flags"]
