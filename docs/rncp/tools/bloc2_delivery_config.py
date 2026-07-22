from __future__ import annotations

import json
import io
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DELIVERY_DATE = "2026-07-22"
DELIVERY_DATE_FR = "22 juillet 2026"
ANONYMIZED_MODE = True
PUBLIC_REPOSITORY_URL = "https://github.com/Kevinmrgt/aiSport"
_PUBLIC_REPOSITORY_SENTINEL = "__ALCIDE_PUBLIC_REPOSITORY_URL__"
_PUBLIC_REPOSITORY_EXACT_PATTERN = re.compile(
    r"https?://(?:www\.)?github\.com/kevinmrgt/aisport"
    r"(?=$|[\s<>()\[\],.;:!?])",
    re.IGNORECASE,
)


def _package_version() -> str:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    version = package.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z.+-]+", version):
        raise ValueError("Version absente ou invalide dans package.json")
    return version


VERSION = _package_version()
APPLICATION_SHA = "c63439e8ac8d68efd5ba091211b326ee8575fbba"
FINAL_CI_RUN = "29930722308"
FINAL_CD_RUN = "29931146789"


IDENTITY_TEXT_PATTERNS = (
    (
        "URL GitHub nominative",
        re.compile(
            r"https?://(?:www\.)?github\.com/kevinmrgt(?:/[^\s<>()\]]*)?",
            re.IGNORECASE,
        ),
    ),
    (
        "URL Vercel nominative",
        re.compile(
            r"(?:https?://)?[a-z0-9.-]*kevinm[a-z0-9.-]*\.vercel\.app(?:/[^\s<>()\]]*)?",
            re.IGNORECASE,
        ),
    ),
    ("identifiant Kevinmrgt", re.compile(r"\bkevinmrgt\b", re.IGNORECASE)),
    (
        "identifiant kevinm",
        re.compile(r"\bkevinm[a-z0-9-]*\b", re.IGNORECASE),
    ),
    (
        "chemin de poste nominatif",
        re.compile(r"C:\\Users\\Kevin(?:\\Documents\\AISport)?", re.IGNORECASE),
    ),
    ("prénom détecté", re.compile(r"\bKevin\b", re.IGNORECASE)),
)


def anonymize_text(text: str) -> str:
    """Neutralise les identifiants connus, sauf l'URL publique remise au jury."""
    text = _PUBLIC_REPOSITORY_EXACT_PATTERN.sub(
        _PUBLIC_REPOSITORY_SENTINEL,
        text,
    )
    text = re.sub(
        r"https?://(?:www\.)?github\.com/kevinmrgt/aisport",
        "https://github.com/compte-anonymise/depot-anonymise",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(?:https?://)?[a-z0-9.-]*kevinm[a-z0-9.-]*\.vercel\.app",
        "https://deploiement-anonymise.vercel.app",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"C:\\Users\\Kevin(?:\\Documents\\AISport)?",
        "<workspace-anonymise>",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\bKevinmrgt\b", "compte-anonymise", text, flags=re.IGNORECASE)
    text = re.sub(r"\bKevin\b", "[identité anonymisée]", text, flags=re.IGNORECASE)
    return text.replace(_PUBLIC_REPOSITORY_SENTINEL, PUBLIC_REPOSITORY_URL)


def identity_findings(text: str) -> list[str]:
    inspected = _PUBLIC_REPOSITORY_EXACT_PATTERN.sub(
        "<depot-public-autorise>",
        text,
    )
    return [
        label
        for label, pattern in IDENTITY_TEXT_PATTERNS
        if pattern.search(inspected)
    ]


def assert_anonymized_text(text: str, context: str) -> None:
    findings = identity_findings(text)
    if findings:
        raise ValueError(
            f"Anonymisation refusée pour {context} : " + ", ".join(sorted(set(findings)))
        )


def byte_identity_findings(payload: bytes) -> list[str]:
    findings: set[str] = set()
    for encoding in ("utf-8", "latin-1"):
        try:
            findings.update(identity_findings(payload.decode(encoding)))
        except UnicodeDecodeError:
            continue
    if b"\x00" in payload:
        for encoding in ("utf-16-le", "utf-16-be"):
            try:
                findings.update(identity_findings(payload.decode(encoding)))
            except UnicodeDecodeError:
                continue
    return sorted(findings)


def pdf_identity_findings(source: Path | bytes) -> list[str]:
    """Inspecte texte, métadonnées, annotations et flux décodés d'un PDF."""
    from pypdf import PdfReader
    from pypdf.generic import (
        ArrayObject,
        ByteStringObject,
        DictionaryObject,
        IndirectObject,
        StreamObject,
        TextStringObject,
    )

    payload = source.read_bytes() if isinstance(source, Path) else source
    findings: set[str] = set(byte_identity_findings(payload))
    reader = PdfReader(io.BytesIO(payload), strict=False)

    def inspect_bytes(value: bytes) -> None:
        findings.update(byte_identity_findings(value))

    def inspect_text(value: str) -> None:
        findings.update(identity_findings(value))

    visited_indirect: set[tuple[int, int]] = set()

    def walk(value: object, depth: int = 0) -> None:
        if value is None or depth > 40:
            return
        if isinstance(value, IndirectObject):
            key = (value.idnum, value.generation)
            if key in visited_indirect:
                return
            visited_indirect.add(key)
            try:
                walk(value.get_object(), depth + 1)
            except Exception:
                return
            return
        if isinstance(value, TextStringObject) or isinstance(value, str):
            inspect_text(str(value))
            return
        if isinstance(value, ByteStringObject) or isinstance(value, bytes):
            inspect_bytes(bytes(value))
            return
        if isinstance(value, StreamObject):
            try:
                inspect_bytes(value.get_data())
            except Exception:
                pass
            for key, item in value.items():
                walk(key, depth + 1)
                walk(item, depth + 1)
            return
        if isinstance(value, DictionaryObject) or isinstance(value, dict):
            for key, item in value.items():
                walk(key, depth + 1)
                walk(item, depth + 1)
            return
        if isinstance(value, ArrayObject) or isinstance(value, (list, tuple)):
            for item in value:
                walk(item, depth + 1)

    walk(reader.trailer)
    for page in reader.pages:
        inspect_text(page.extract_text() or "")
    return sorted(findings)


def assert_anonymized_pdf(source: Path | bytes, context: str | None = None) -> None:
    findings = pdf_identity_findings(source)
    if findings:
        label = context or (source.name if isinstance(source, Path) else "PDF en mémoire")
        raise ValueError(
            f"Anonymisation PDF refusée pour {label} : "
            + ", ".join(sorted(set(findings)))
        )
