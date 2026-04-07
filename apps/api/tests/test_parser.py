from __future__ import annotations

import io

import pytest

Document = pytest.importorskip("docx").Document

from services.parser import parse_resume


def build_sample_docx() -> bytes:
    document = Document()
    document.add_paragraph("Jane Doe")
    document.add_paragraph("jane@example.com | (555) 123-4567 | Denver, CO")
    document.add_paragraph("SUMMARY")
    document.add_paragraph("Product-minded software engineer with strong React and Python experience.")
    document.add_paragraph("EXPERIENCE")
    document.add_paragraph("Software Engineer | Acme Corp | 2022 - Present")
    document.add_paragraph("- Built React dashboards for recruiting workflows")
    document.add_paragraph("- Automated resume parsing in Python")
    document.add_paragraph("EDUCATION")
    document.add_paragraph("B.S. Computer Science")
    document.add_paragraph("University of Colorado")
    document.add_paragraph("2018 - 2022")
    document.add_paragraph("SKILLS")
    document.add_paragraph("Python, React, FastAPI, SQL")

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_parse_resume_docx_extracts_expected_sections():
    parsed = parse_resume(build_sample_docx(), "docx")

    assert parsed["name"] == "Jane Doe"
    assert parsed["contact"]["email"] == "jane@example.com"
    assert "Denver, CO" in parsed["contact"]["location"]
    assert parsed["summary"].startswith("Product-minded software engineer")
    assert parsed["experience"][0]["title"] == "Software Engineer"
    assert parsed["experience"][0]["company"] == "Acme Corp"
    assert len(parsed["experience"][0]["bullets"]) == 2
    assert parsed["education"][0]["institution"] == "University of Colorado"
    assert "React" in parsed["skills"]
