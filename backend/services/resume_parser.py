# backend/services/resume_parser.py

import fitz  # PyMuPDF
from pathlib import Path


def extract_resume_text(pdf_path: str) -> str:
    """
    Extract all readable text from a resume PDF.

    Args:
        pdf_path: Absolute path of the uploaded PDF.

    Returns:
        Plain text extracted from every page.
    """

    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {pdf_path}")

    document = fitz.open(path)

    pages = []

    try:
        for page in document:
            text = page.get_text("text")
            pages.append(text.strip())
    finally:
        document.close()

    return "\n\n".join(pages).strip()