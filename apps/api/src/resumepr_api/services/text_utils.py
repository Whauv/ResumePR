"""Small shared text helpers used across routers and services."""

from __future__ import annotations

import re


def collapse_whitespace(text: str) -> str:
    """Collapse all runs of whitespace to single spaces and trim the ends."""
    return re.sub(r"\s+", " ", text).strip()


def normalize_text(text: str) -> str:
    """Whitespace-collapsed, lowercased form used for fuzzy text matching."""
    return collapse_whitespace(text).lower()


def join_dash(*parts: str) -> str:
    """Join non-empty parts with ' - ' (title / company / dates style)."""
    return " - ".join(part for part in parts if part)
