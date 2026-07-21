from __future__ import annotations

import hashlib
import shutil
import subprocess
import zipfile
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[3]
VERSION = "0.13.0-rc.3"
DATE = "2026-07-21"
PACK_NAME = f"alcide-bloc2-rncp39583-{VERSION}-final-{DATE}"
PACK_DIR = ROOT / "output" / PACK_NAME
PACK_ZIP = ROOT / "output" / f"{PACK_NAME}.zip"

DOSSIER = (
    ROOT
    / "output"
    / "pdf"
    / f"dossier-bloc2-rncp39583-alcide-{VERSION}-final-{DATE}.pdf"
)
ANNEXES = (
    ROOT
    / "output"
    / "pdf"
    / f"annexes-bloc2-rncp39583-alcide-{VERSION}-final-{DATE}.pdf"
)


def git(*arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
        encoding="utf-8",
    )
    return result.stdout.strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def validate_pdf(path: Path, maximum_pages: int | None = None) -> tuple[int, str]:
    if not path.is_file():
        raise FileNotFoundError(path)
    reader = PdfReader(str(path))
    pages = len(reader.pages)
    if maximum_pages is not None and pages > maximum_pages:
        raise ValueError(f"{path.name}: {pages} pages, maximum {maximum_pages}")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return pages, text


def validate_source_archive(path: Path) -> None:
    forbidden_segments = {"node_modules", ".auth", "tmp"}
    forbidden_files = {".env", ".env.local", ".env.production", "google-e2e.json"}
    with zipfile.ZipFile(path) as archive:
        unsafe = []
        for name in archive.namelist():
            parts = set(Path(name).parts)
            if parts & forbidden_segments or Path(name).name in forbidden_files:
                unsafe.append(name)
        if unsafe:
            raise ValueError(f"Archive source non sûre : {unsafe[:10]}")


def main() -> None:
    tracked_changes = git("status", "--porcelain", "--untracked-files=no")
    if tracked_changes:
        raise RuntimeError("Les fichiers suivis doivent être commités avant de figer le paquet.")

    dossier_pages, dossier_text = validate_pdf(DOSSIER, maximum_pages=30)
    annex_pages, annex_text = validate_pdf(ANNEXES)
    for expected in ["B2-A26", "B2-A27", "B2-A30", "B2-A31", "29817741589"]:
        if expected not in dossier_text + annex_text:
            raise ValueError(f"Preuve absente des PDF : {expected}")

    resolved_output = (ROOT / "output").resolve()
    if PACK_DIR.parent.resolve() != resolved_output or PACK_ZIP.parent.resolve() != resolved_output:
        raise RuntimeError("Cible du paquet hors du répertoire output.")
    if PACK_DIR.exists():
        shutil.rmtree(PACK_DIR)
    if PACK_ZIP.exists():
        PACK_ZIP.unlink()
    PACK_DIR.mkdir(parents=True)

    dossier_target = PACK_DIR / "01-dossier-bloc2-alcide.pdf"
    annexes_target = PACK_DIR / "02-annexes-bloc2-alcide.pdf"
    source_target = PACK_DIR / f"03-code-source-alcide-{VERSION}.zip"
    shutil.copy2(DOSSIER, dossier_target)
    shutil.copy2(ANNEXES, annexes_target)

    head = git("rev-parse", "HEAD")
    subprocess.run(
        [
            "git",
            "archive",
            "--format=zip",
            f"--prefix=alcide-source-{VERSION}/",
            "--output",
            str(source_target),
            head,
        ],
        cwd=ROOT,
        check=True,
    )
    validate_source_archive(source_target)

    readme = PACK_DIR / "LISEZ-MOI.txt"
    readme.write_text(
        "\n".join(
            [
                "ALCIDE - BLOC 2 RNCP39583",
                "",
                "Ordre de lecture :",
                "1. 01-dossier-bloc2-alcide.pdf (30 pages maximum hors annexes)",
                "2. 02-annexes-bloc2-alcide.pdf (preuves sélectionnées)",
                f"3. 03-code-source-alcide-{VERSION}.zip (archive Git du SHA indiqué)",
                "4. MANIFESTE.txt (empreintes et limites)",
                "",
                "Avant dépôt : compléter l'audit RGAA humain, le test utilisateur autonome",
                "et confirmer les règles de nommage/anonymisation avec le campus.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    artifacts = [dossier_target, annexes_target, source_target, readme]
    manifest = PACK_DIR / "MANIFESTE.txt"
    lines = [
        "ALCIDE - MANIFESTE DU PAQUET BLOC 2 RNCP39583",
        f"Date de génération : {DATE}",
        f"Version applicative : {VERSION}",
        f"SHA Git archivé : {head}",
        f"Dossier principal : {dossier_pages} pages (maximum officiel : 30 hors annexes)",
        f"Annexes sélectionnées : {annex_pages} pages",
        "",
        "FICHIERS ET EMPREINTES SHA-256",
    ]
    for artifact in artifacts:
        lines.append(f"{artifact.name}\t{artifact.stat().st_size} octets\t{sha256(artifact)}")
    lines.extend(
        [
            "",
            "LIMITES À NE PAS MASQUER",
            "- audit RGAA humain à signer avant dépôt ;",
            "- test utilisateur autonome distinct du candidat à réaliser ;",
            "- date, nommage, taille et anonymisation à confirmer avec le campus.",
        ]
    )
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")

    shutil.make_archive(str(PACK_ZIP.with_suffix("")), "zip", PACK_DIR.parent, PACK_DIR.name)
    print(f"Paquet : {PACK_ZIP}")
    print(f"SHA-256 paquet : {sha256(PACK_ZIP)}")


if __name__ == "__main__":
    main()
