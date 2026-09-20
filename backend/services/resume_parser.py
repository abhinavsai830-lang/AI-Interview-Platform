from __future__ import annotations

import re
from pathlib import Path

from pypdf import PdfReader


BASE_DIR = Path(__file__).resolve().parents[2]


def resolve_resume_path(
    relative_path: str,
) -> Path:
    """
    Convert a database-relative resume path into a safe
    absolute filesystem path.

    Example:

        storage/resumes/example.pdf
            ↓
        C:/.../AI INTERVIEW/storage/resumes/example.pdf
    """

    relative = Path(relative_path)

    if relative.is_absolute():
        raise ValueError(
            "Resume path must be relative."
        )

    resolved = (
        BASE_DIR / relative
    ).resolve()

    base = BASE_DIR.resolve()

    try:
        resolved.relative_to(base)
    except ValueError as exc:
        raise ValueError(
            "Resume path is outside the application directory."
        ) from exc

    return resolved


def clean_extracted_text(
    text: str,
) -> str:
    """
    Normalize text extracted from PDF pages.

    The goal is not to aggressively rewrite the resume.
    We only remove obvious formatting noise while preserving
    meaningful content.
    """

    if not text:
        return ""

    # Normalize line endings.
    text = text.replace(
        "\r\n",
        "\n",
    ).replace(
        "\r",
        "\n",
    )

    # Replace non-breaking spaces.
    text = text.replace(
        "\u00a0",
        " ",
    )

    # Remove trailing whitespace on each line.
    lines = [
        line.rstrip()
        for line in text.split("\n")
    ]

    # Collapse excessive blank lines.
    cleaned = "\n".join(lines)

    cleaned = re.sub(
        r"\n{3,}",
        "\n\n",
        cleaned,
    )

    # Collapse repeated horizontal whitespace.
    cleaned = re.sub(
        r"[ \t]{2,}",
        " ",
        cleaned,
    )

    return cleaned.strip()


def extract_resume_text(
    relative_path: str,
) -> str:
    """
    Extract text from a stored PDF resume.

    Returns:
        Cleaned resume text.

    Raises:
        FileNotFoundError
        ValueError
    """

    pdf_path = resolve_resume_path(
        relative_path
    )

    if not pdf_path.exists():
        raise FileNotFoundError(
            "Stored resume file was not found."
        )

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError(
            "Stored resume is not a PDF file."
        )

    try:
        reader = PdfReader(
            str(pdf_path)
        )

    except Exception as exc:
        raise ValueError(
            "The stored resume could not be opened as a PDF."
        ) from exc

    page_text = []

    for page_number, page in enumerate(
        reader.pages,
        start=1,
    ):

        try:

            text = page.extract_text() or ""

        except Exception as exc:

            raise ValueError(
                f"Could not extract text from PDF page "
                f"{page_number}."
            ) from exc

        if text.strip():
            page_text.append(
                text
            )

    combined_text = "\n\n".join(
        page_text
    )

    cleaned_text = clean_extracted_text(
        combined_text
    )

    if not cleaned_text:
        raise ValueError(
            "No text could be extracted from the resume PDF."
        )

    return cleaned_text