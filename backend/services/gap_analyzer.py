from __future__ import annotations

from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - allows import without heavy deps installed yet
    SentenceTransformer = None  # type: ignore[assignment]


def normalize_tokens(values: list[str]) -> list[str]:
    unique: dict[str, str] = {}
    for value in values:
        cleaned = " ".join(value.lower().split()).strip()
        if cleaned and cleaned not in unique:
            unique[cleaned] = value.strip()
    return list(unique.values())


def flatten_experience(experience: list[dict]) -> str:
    segments: list[str] = []
    for item in experience:
        segments.extend(item.get("bullets", []))
        segments.extend([item.get("title", ""), item.get("company", "")])
    return " ".join(segment for segment in segments if segment).strip()


def tfidf_score(section_text: str, job_text: str) -> float:
    if not section_text.strip() or not job_text.strip():
        return 0.0
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform([section_text, job_text])
    return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer | None:
    if SentenceTransformer is None:
        return None
    try:
        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


def semantic_matches(section_text: str, keywords: list[str], threshold: float = 0.75) -> tuple[list[str], list[str]]:
    model = get_embedding_model()
    if not model or not section_text.strip() or not keywords:
        return [], keywords

    section_embedding = model.encode([section_text], normalize_embeddings=True)
    keyword_embeddings = model.encode(keywords, normalize_embeddings=True)
    scores = cosine_similarity(section_embedding, keyword_embeddings)[0]

    similar = [keyword for keyword, score in zip(keywords, scores) if score >= threshold]
    missing = [keyword for keyword, score in zip(keywords, scores) if score < threshold]
    return similar, missing


def exact_matches(section_text: str, keywords: list[str]) -> tuple[list[str], list[str]]:
    lowered = section_text.lower()
    matched = [keyword for keyword in keywords if keyword.lower() in lowered]
    missing = [keyword for keyword in keywords if keyword.lower() not in lowered]
    return matched, missing


def section_report(section_text: str, job_text: str, job_keywords: list[str]) -> dict:
    exact, remaining = exact_matches(section_text, job_keywords)
    semantic, missing = semantic_matches(section_text, remaining)
    similarity = tfidf_score(section_text, job_text)
    coverage = (len(exact) + len(semantic)) / len(job_keywords) if job_keywords else 0.0
    score = round(((similarity * 0.55) + (coverage * 0.45)) * 100, 2)
    return {
        "matched": normalize_tokens(exact + semantic),
        "missing": normalize_tokens(missing),
        "semantic_matches": normalize_tokens(semantic),
        "score": score,
    }


def build_red_flags(resume_json: dict, gap_sections: dict) -> list[str]:
    red_flags: list[str] = []
    if not resume_json.get("contact", {}).get("email"):
        red_flags.append("Missing email address in contact information.")
    if not resume_json.get("summary", "").strip():
        red_flags.append("No summary section detected.")
    if not resume_json.get("skills"):
        red_flags.append("Skills section is missing or empty.")
    if not resume_json.get("experience"):
        red_flags.append("Experience section is missing.")
    if gap_sections["skills"]["score"] < 35:
        red_flags.append("Skills section is weakly aligned with the target job.")
    if gap_sections["experience"]["missing"]:
        red_flags.append("Experience bullets are missing key required terms from the job description.")
    return red_flags


def analyze_gap(resume_json: dict, job_json: dict) -> dict:
    job_keywords = normalize_tokens(job_json.get("required_skills", []) + job_json.get("preferred_skills", []))
    job_text = job_json.get("raw_text", "")

    sections = {
        "skills": section_report(" ".join(resume_json.get("skills", [])), job_text, job_keywords),
        "experience": section_report(flatten_experience(resume_json.get("experience", [])), job_text, job_keywords),
        "summary": section_report(resume_json.get("summary", ""), job_text, job_keywords),
    }

    overall_score = round(
        (sections["skills"]["score"] * 0.35)
        + (sections["experience"]["score"] * 0.45)
        + (sections["summary"]["score"] * 0.20),
        2,
    )

    missing_rank: dict[str, int] = {}
    for section_name, report in sections.items():
        weight = {"skills": 3, "experience": 2, "summary": 1}[section_name]
        for keyword in report["missing"]:
            missing_rank[keyword] = missing_rank.get(keyword, 0) + weight

    top_missing = [item[0] for item in sorted(missing_rank.items(), key=lambda pair: (-pair[1], pair[0].lower()))[:10]]

    return {
        "overall_score": overall_score,
        "sections": sections,
        "top_missing_keywords": top_missing,
        "ats_red_flags": build_red_flags(resume_json, sections),
    }
