"""Resume rendering/export helpers (PDF, DOCX, and format-preserving edits).

Moved out of the routers so the services layer owns document generation.
"""

from __future__ import annotations

import io

from docx import Document
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

from resumepr_api.models.schemas import EditSuggestion, ParsedResume
from resumepr_api.services.text_utils import join_dash, normalize_text

PDF_ACCENTS = {
    "modern": (0.01, 0.41, 0.44),
    "classic": (0.12, 0.12, 0.12),
    "minimal": (0.35, 0.35, 0.35),
}


def draw_pdf_resume(buffer: io.BytesIO, resume: ParsedResume, template: str) -> None:
    pdf = canvas.Canvas(buffer, pagesize=LETTER)
    width, height = LETTER
    margin = 54
    y = height - margin

    accent = PDF_ACCENTS.get(template, PDF_ACCENTS["modern"])

    pdf.setFillColorRGB(*accent)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(margin, y, resume.name or "Resume")
    y -= 24

    pdf.setFillColorRGB(0.2, 0.2, 0.2)
    pdf.setFont("Helvetica", 10)
    contact = " | ".join(f"{key}: {value}" for key, value in resume.contact.items())
    for line in [contact, "", "Summary", resume.summary, "", "Skills", ", ".join(resume.skills)]:
        if not line:
            y -= 10
            continue
        for chunk in [line[i:i + 95] for i in range(0, len(line), 95)]:
            pdf.drawString(margin, y, chunk)
            y -= 14
            if y < margin:
                pdf.showPage()
                y = height - margin
                pdf.setFont("Helvetica", 10)

    for item in resume.experience:
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(margin, y, join_dash(item.title, item.company, item.dates))
        y -= 14
        pdf.setFont("Helvetica", 10)
        for bullet in item.bullets:
            for chunk in [bullet[i:i + 90] for i in range(0, len(bullet), 90)]:
                pdf.drawString(margin + 10, y, f"* {chunk}" if chunk == bullet[:90] else f"  {chunk}")
                y -= 14
                if y < margin:
                    pdf.showPage()
                    y = height - margin
                    pdf.setFont("Helvetica", 10)

    pdf.save()


def build_docx_resume(resume: ParsedResume, template: str) -> io.BytesIO:
    document = Document()
    title = document.add_heading(resume.name or "Resume", level=0)
    if template == "minimal":
        title.style.font.name = "Arial"

    if resume.contact:
        document.add_paragraph(" | ".join(f"{key}: {value}" for key, value in resume.contact.items()))

    if resume.summary:
        document.add_heading("Summary", level=1)
        document.add_paragraph(resume.summary)

    if resume.skills:
        document.add_heading("Skills", level=1)
        document.add_paragraph(", ".join(resume.skills))

    if resume.experience:
        document.add_heading("Experience", level=1)
        for item in resume.experience:
            document.add_paragraph(join_dash(item.title, item.company, item.dates))
            for bullet in item.bullets:
                document.add_paragraph(bullet, style="List Bullet")

    if resume.education:
        document.add_heading("Education", level=1)
        for item in resume.education:
            document.add_paragraph(join_dash(item.degree, item.institution, item.dates))

    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def replace_paragraph_text(paragraph, new_text: str) -> None:
    if paragraph.runs:
        paragraph.runs[0].text = new_text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(new_text)


def iter_doc_paragraphs(document: Document):
    for paragraph in document.paragraphs:
        yield paragraph
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    yield paragraph


def preserve_docx_format_with_edits(file_bytes: bytes, suggestions: list[EditSuggestion]) -> bytes:
    document = Document(io.BytesIO(file_bytes))
    paragraphs = list(iter_doc_paragraphs(document))
    paragraph_map = {normalize_text(paragraph.text): paragraph for paragraph in paragraphs if paragraph.text.strip()}

    for suggestion in suggestions:
        original = normalize_text(suggestion.original_text)
        if not original:
            continue

        paragraph = paragraph_map.get(original)
        if paragraph:
            replace_paragraph_text(paragraph, suggestion.suggested_text)
            paragraph_map[normalize_text(suggestion.suggested_text)] = paragraph
            continue

        for paragraph in paragraphs:
            text = paragraph.text or ""
            normalized_text = normalize_text(text)
            if original and original in normalized_text:
                updated_text = text.replace(suggestion.original_text, suggestion.suggested_text)
                if updated_text == text and suggestion.original_text.strip() != text.strip():
                    continue
                replace_paragraph_text(paragraph, updated_text)
                break

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()
