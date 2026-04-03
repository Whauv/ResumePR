from __future__ import annotations

import re
from functools import lru_cache

import spacy
from spacy.language import Language
from spacy.pipeline import EntityRuler

SKILL_PATTERNS = [
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go", "Rust", "Ruby",
    "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "SQL", "PostgreSQL", "MySQL", "SQLite",
    "MongoDB", "Redis", "DynamoDB", "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js",
    "Express", "FastAPI", "Django", "Flask", "Spring Boot", ".NET", "Tailwind CSS", "HTML",
    "CSS", "GraphQL", "REST", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform",
    "Ansible", "Linux", "Git", "GitHub Actions", "Jenkins", "CI/CD", "Airflow", "Spark",
    "Hadoop", "Kafka", "Pandas", "NumPy", "scikit-learn", "PyTorch", "TensorFlow", "OpenCV",
    "Figma", "Jira", "Tableau", "Power BI", "Snowflake", "Databricks", "Supabase", "Firebase"
]

SOFT_SKILL_HINTS = {
    "communication", "leadership", "ownership", "collaboration", "problem solving",
    "stakeholder management", "teamwork", "adaptability", "mentorship", "critical thinking"
}

QUALIFICATION_HINTS = {
    "bachelor", "master", "phd", "degree", "certification", "computer science",
    "information systems", "engineering", "equivalent experience"
}


@lru_cache(maxsize=1)
def get_nlp() -> Language:
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        nlp = spacy.blank("en")

    if "entity_ruler" not in nlp.pipe_names:
        ruler = nlp.add_pipe("entity_ruler", config={"overwrite_ents": True})
    else:
        ruler = nlp.get_pipe("entity_ruler")

    assert isinstance(ruler, EntityRuler)
    if not ruler.patterns:
        ruler.add_patterns(
            [{"label": "TECH_SKILL", "pattern": skill} for skill in SKILL_PATTERNS]
        )
    return nlp


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value.strip() for value in values if value.strip()}, key=str.lower)


def extract_keywords(text: str) -> dict[str, list[str]]:
    nlp = get_nlp()
    doc = nlp(text)

    skills: list[str] = []
    tools: list[str] = []
    soft_skills: list[str] = []
    qualifications: list[str] = []

    for ent in doc.ents:
        if ent.label_ == "TECH_SKILL":
            value = ent.text.strip()
            if value.lower() in {"aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jira", "figma"}:
                tools.append(value)
            else:
                skills.append(value)

    lowered_text = text.lower()
    for phrase in SOFT_SKILL_HINTS:
        if phrase in lowered_text:
            soft_skills.append(phrase.title())

    for phrase in QUALIFICATION_HINTS:
        if phrase in lowered_text:
            qualifications.append(phrase.title())

    qualification_matches = re.findall(
        r"((?:bachelor|master|phd|associate)[^.;,\n]{0,70})",
        text,
        flags=re.IGNORECASE,
    )
    qualifications.extend(qualification_matches)

    return {
        "skills": unique_sorted(skills),
        "tools": unique_sorted(tools),
        "soft_skills": unique_sorted(soft_skills),
        "qualifications": unique_sorted(qualifications),
    }
