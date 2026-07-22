from __future__ import annotations

import argparse
import hashlib
import io
import re
import shutil
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

from bloc2_delivery_config import (
    ANONYMIZED_MODE,
    DELIVERY_DATE,
    ROOT,
    VERSION,
    anonymize_text,
    assert_anonymized_pdf,
    byte_identity_findings,
)

DATE = DELIVERY_DATE
APPLICATION_SHA = "ea703aef912ce9e7c49c4c9b7872a5a7b595b666"
FINAL_CI_RUN = "29907294766"
FINAL_CD_RUN = "29907642144"
PACK_NAME = f"alcide-bloc2-rncp39583-{VERSION}-final-{DATE}"
PACK_DIR = ROOT / "output" / PACK_NAME
PACK_ZIP = ROOT / "output" / f"{PACK_NAME}.zip"
CANDIDATE_DIR = ROOT / "tmp" / "archive-candidate"

DOSSIER = (
    ROOT
    / "output"
    / "pdf"
    / f"dossier-bloc2-rncp39583-alcide-v{VERSION}-final-{DATE}.pdf"
)
ANNEXES = (
    ROOT
    / "output"
    / "pdf"
    / f"annexes-bloc2-rncp39583-alcide-v{VERSION}-final-{DATE}.pdf"
)

# L'archive source est volontairement construite par liste positive. Les dossiers
# de build, les anciens livrables et les documents des autres blocs ne peuvent
# donc pas y entrer par accident, même s'ils sont suivis par Git.
SOURCE_ROOT_FILES = {
    ".dockerignore",
    ".env.example",
    ".eslintrc.js",
    ".gitattributes",
    ".gitignore",
    ".nvmrc",
    ".prettierrc",
    ".vercelignore",
    "CHANGELOG.md",
    "README.md",
    "docker-compose.yml",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
}
SOURCE_PREFIXES = (
    ".github/workflows/",
    "apps/api/",
    "apps/web/",
    "packages/shared/",
    "scripts/",
    "docs/adr/",
    "docs/rncp/bloc2-annexes/",
)
SOURCE_DOCUMENTS = {
    "docs/bloc2/cahier-recettes.md",
    "docs/ci-cd.md",
    "docs/deployment.md",
    "docs/security/owasp-review.md",
    "docs/testing-authenticated-e2e.md",
    "docs/rncp/CHECKLIST-AVANT-DEPOT-BLOC2.md",
    "docs/rncp/MANIFESTE-DEPOT-BLOC2.md",
    "docs/rncp/bloc2-accessibilite-rgaa.md",
    "docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md",
    "docs/rncp/bloc2-manuel-mise-a-jour.md",
    "docs/rncp/bloc2-manuel-utilisateur-alcide.md",
    "docs/rncp/bloc2-matrice-user-stories-preuves.md",
    "docs/rncp/bloc2-plan-correction-bogues-rncp39583.md",
}
REQUIRED_MANUALS = {
    "docs/deployment.md",
    "docs/rncp/bloc2-manuel-utilisateur-alcide.md",
    "docs/rncp/bloc2-manuel-mise-a-jour.md",
}

FORBIDDEN_ARCHIVE_SEGMENTS = {
    ".auth",
    ".git",
    ".next",
    ".vercel",
    "coverage",
    "dist",
    "node_modules",
    "output",
    "playwright-report",
    "test-results",
    "tmp",
}
FORBIDDEN_ARCHIVE_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    "credentials.json",
    "google-e2e.json",
    "service-account.json",
}
FORBIDDEN_BLOC2_PATH_MARKERS = (
    "soutenance",
    "preparation-orale",
    "preparation_orale",
    "bloc2-guide-lecture-jury",
)
FORBIDDEN_BLOC2_PDF_PATTERN = re.compile(
    r"\b(?:oral(?:e|es|s)?|soutenance(?:s)?)\b",
    re.IGNORECASE,
)
SECRET_PATTERNS = (
    ("clé privée PEM", re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("jeton GitHub", re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("clé OpenAI", re.compile(rb"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("secret OAuth Google", re.compile(rb"\bGOCSPX-[A-Za-z0-9_-]{16,}\b")),
    ("JWT signé", re.compile(rb"\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
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
    from pypdf import PdfReader

    if not path.is_file():
        raise FileNotFoundError(path)
    reader = PdfReader(str(path))
    pages = len(reader.pages)
    if maximum_pages is not None and pages > maximum_pages:
        raise ValueError(f"{path.name}: {pages} pages, maximum {maximum_pages}")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if ANONYMIZED_MODE:
        assert_anonymized_pdf(path)
    return pages, text


def validate_pdf_navigation(
    path: Path,
    minimum_outlines: int,
    minimum_internal_links: int,
) -> tuple[int, int, bool]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    root = reader.trailer["/Root"]
    if str(root.get("/Lang", "")) != "fr-FR":
        raise ValueError(f"{path.name}: langue PDF absente ou incorrecte")
    if str(root.get("/PageMode", "")) != "/UseOutlines":
        raise ValueError(f"{path.name}: panneau de signets non demandé à l'ouverture")
    if str(root.get("/PageLayout", "")) != "/OneColumn":
        raise ValueError(f"{path.name}: disposition de page inattendue")
    if not reader.metadata or not reader.metadata.title:
        raise ValueError(f"{path.name}: titre de document absent")

    def count_outline_items(items: list[object]) -> int:
        return sum(
            count_outline_items(item) if isinstance(item, list) else 1
            for item in items
        )

    outline_count = count_outline_items(reader.outline)
    internal_link_count = 0
    for page in reader.pages:
        for annotation_ref in page.get("/Annots", []):
            annotation = annotation_ref.get_object()
            action = annotation.get("/A")
            if annotation.get("/Subtype") != "/Link":
                continue
            if "/Dest" in annotation or (
                action is not None and action.get_object().get("/S") == "/GoTo"
            ):
                internal_link_count += 1

    if outline_count < minimum_outlines:
        raise ValueError(
            f"{path.name}: {outline_count} signets, minimum {minimum_outlines}"
        )
    if internal_link_count < minimum_internal_links:
        raise ValueError(
            f"{path.name}: {internal_link_count} liens internes, minimum {minimum_internal_links}"
        )
    return outline_count, internal_link_count, "/StructTreeRoot" in root


def is_allowed_source(path: str) -> bool:
    normalized = PurePosixPath(path).as_posix()
    return (
        normalized in SOURCE_ROOT_FILES
        or normalized in SOURCE_DOCUMENTS
        or normalized.startswith(SOURCE_PREFIXES)
    )


def tracked_source_files() -> list[str]:
    tracked = git("ls-files").splitlines()
    selected = sorted(path for path in tracked if is_allowed_source(path))
    if not selected:
        raise RuntimeError("La liste positive de l'archive source est vide.")
    return selected


def sanitize_text(text: str) -> str:
    return anonymize_text(text)


def sanitized_bytes(source: Path) -> bytes:
    payload = source.read_bytes()
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError:
        return payload
    return sanitize_text(text).encode("utf-8")


def safe_reset_candidate_directory(path: Path) -> None:
    resolved = path.resolve()
    candidate_root = CANDIDATE_DIR.resolve()
    if resolved == candidate_root or candidate_root not in resolved.parents:
        raise RuntimeError(f"Nettoyage refusé hors d'un sous-dossier candidat : {resolved}")
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=False)


def modified_selected_sources() -> list[str]:
    modified = git("diff", "--name-only", "HEAD").splitlines()
    return sorted(path for path in modified if is_allowed_source(path))


def write_source_manifest(
    staging: Path,
    head: str,
    source_paths: list[str],
    modified_sources: list[str],
) -> None:
    lines = [
        "ALCIDE - MANIFESTE DE L'ARCHIVE SOURCE BLOC 2",
        f"Version applicative : {VERSION}",
        f"Révision Git HEAD de référence (pas une empreinte du contenu) : {head}",
        "Mode de capture : fichiers suivis copiés depuis l'espace de travail courant",
        f"Fichiers issus de la liste positive : {len(source_paths)}",
        f"Fichiers sélectionnés modifiés par rapport à HEAD : {len(modified_sources)}",
        "",
        "TRAÇABILITÉ ET ANONYMISATION",
        "- aucun historique .git n'est inclus ; la révision ci-dessus sert de point de référence ;",
        "- les noms du candidat, du compte et les chemins de poste sont remplacés dans les fichiers texte ;",
        "- les URL GitHub sont neutralisées ; les numéros de PR et de runs restent consultables dans le dossier/les annexes officiels ;",
        "- l'absence de secret est contrôlée par noms de fichiers et signatures usuelles ; ce contrôle ne remplace pas une revue humaine.",
        "",
        "FICHIERS SÉLECTIONNÉS MODIFIÉS PAR RAPPORT À HEAD",
        *(modified_sources or ["(aucun)"]),
        "",
        "FICHIERS (SHA-256 après anonymisation)",
    ]
    for relative in sorted(source_paths):
        path = staging / Path(relative)
        lines.append(f"{relative}\t{path.stat().st_size}\t{sha256(path)}")
    (staging / "MANIFESTE-SOURCE.txt").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


def create_source_archive(target: Path, staging: Path) -> tuple[int, int]:
    source_paths = tracked_source_files()
    modified_sources = modified_selected_sources()
    safe_reset_candidate_directory(staging)
    for relative in source_paths:
        source = ROOT / Path(relative)
        if not source.is_file() or source.is_symlink():
            raise RuntimeError(f"Source absente ou lien symbolique refusé : {relative}")
        destination = staging / Path(relative)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(sanitized_bytes(source))

    write_source_manifest(
        staging,
        git("rev-parse", "HEAD"),
        source_paths,
        modified_sources,
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        target.unlink()
    prefix = f"alcide-source-{VERSION}"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(staging.rglob("*")):
            if path.is_file():
                relative = path.relative_to(staging).as_posix()
                # Fixer les métadonnées évite qu'une régénération à contenu
                # identique produise une empreinte différente à cause des dates.
                info = zipfile.ZipInfo(f"{prefix}/{relative}", (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, path.read_bytes(), compresslevel=9)

    validate_source_archive(target)
    total_size = sum(path.stat().st_size for path in staging.rglob("*") if path.is_file())
    return len(source_paths) + 1, total_size


def validate_source_archive(path: Path) -> None:
    problems: list[str] = []
    with zipfile.ZipFile(path) as archive:
        archived_names = {PurePosixPath(info.filename).as_posix() for info in archive.infolist()}
        for info in archive.infolist():
            pure_path = PurePosixPath(info.filename)
            lowered_parts = {part.lower() for part in pure_path.parts}
            lowered_name = pure_path.as_posix().lower()
            if pure_path.is_absolute() or ".." in pure_path.parts:
                problems.append(f"chemin non sûr : {info.filename}")
                continue
            if any(marker in lowered_name for marker in FORBIDDEN_BLOC2_PATH_MARKERS):
                problems.append(f"support hors périmètre du Bloc 2 : {info.filename}")
            if lowered_parts & FORBIDDEN_ARCHIVE_SEGMENTS:
                problems.append(f"segment interdit : {info.filename}")
            if pure_path.name.lower() in FORBIDDEN_ARCHIVE_FILES:
                problems.append(f"fichier confidentiel interdit : {info.filename}")
            if info.is_dir():
                continue
            payload = archive.read(info)
            identity_labels = byte_identity_findings(payload)
            if identity_labels:
                problems.append(
                    f"marqueur d'identité ({', '.join(identity_labels)}) : {info.filename}"
                )
            for label, pattern in SECRET_PATTERNS:
                if pattern.search(payload):
                    problems.append(f"{label} potentiel : {info.filename}")
                    break
        prefix = f"alcide-source-{VERSION}"
        for manual in sorted(REQUIRED_MANUALS):
            expected = f"{prefix}/{manual}"
            if expected not in archived_names:
                problems.append(f"document obligatoire absent : {manual}")
    if problems:
        raise ValueError("Archive source non sûre : " + "; ".join(problems[:20]))


def build_candidate_source_archive() -> None:
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    staging = CANDIDATE_DIR / f"alcide-source-{VERSION}"
    target = CANDIDATE_DIR / f"03-code-source-alcide-{VERSION}.zip"
    file_count, uncompressed_size = create_source_archive(target, staging)
    report = CANDIDATE_DIR / "VALIDATION-ARCHIVE-SOURCE.txt"
    modified_sources = modified_selected_sources()
    report.write_text(
        "\n".join(
            [
                "ALCIDE - VALIDATION CANDIDATE ARCHIVE SOURCE BLOC 2",
                f"Archive : {target.name}",
                f"Fichiers : {file_count}",
                f"Taille non compressée : {uncompressed_size} octets",
                f"Taille ZIP : {target.stat().st_size} octets",
                f"SHA-256 : {sha256(target)}",
                "Provenance : copie des fichiers suivis depuis l'espace de travail courant ; le SHA HEAD n'est qu'une référence.",
                f"Fichiers sélectionnés modifiés par rapport à HEAD : {len(modified_sources)}",
                *(f"- {path}" for path in modified_sources),
                "Contrôles : liste positive, chemins interdits, identifiants évidents et signatures usuelles de secrets : OK",
                "Attention : régénérer cette candidate après toute correction documentaire ou applicative.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Candidate source : {target}")
    print(f"Fichiers : {file_count}")
    print(f"Taille ZIP : {target.stat().st_size} octets")
    print(f"SHA-256 : {sha256(target)}")


def build_readme_text() -> str:
    return (
        "\n".join(
            [
                "ALCIDE - BLOC 2 RNCP39583",
                "",
                "Ordre de lecture :",
                "1. 01-dossier-bloc2-alcide.pdf (30 pages maximum hors annexes)",
                "2. 02-annexes-bloc2-alcide.pdf (preuves et livrables complets)",
                f"3. 03-code-source-alcide-{VERSION}.zip (archive source anonymisée et filtrée)",
                "4. MANIFESTE.txt (empreintes et limites)",
                "",
                "Pièces structurantes intégrées intégralement au PDF d'annexes et accessibles par le sommaire et les signets :",
                "- LIV-01 - docs/bloc2/cahier-recettes.md - cahier de recettes complet",
                "- LIV-02 - docs/rncp/bloc2-plan-correction-bogues-rncp39583.md - plan de correction des bogues complet",
                "- LIV-03 - docs/security/owasp-review.md - revue OWASP A01 à A10 complète",
                "- LIV-04 - docs/rncp/bloc2-matrice-user-stories-preuves.md - matrice user stories, écrans, recettes et preuves complète",
                "- B2-A39 - preuve de correction des dépendances et d'audit de sécurité rc.4",
                "- B2-A40 - audit sémantique authentifié et contre-recette de production du focus/des onglets",
                "",
                "Les trois manuels sont également lisibles à la fin du PDF d'annexes et présents dans l'archive source :",
                "- DOC-01 - docs/deployment.md",
                "- DOC-02 - docs/rncp/bloc2-manuel-utilisateur-alcide.md",
                "- DOC-03 - docs/rncp/bloc2-manuel-mise-a-jour.md",
                "",
                "Avant dépôt : confirmer les règles de nommage, de taille, de délai",
                "et d'anonymisation avec le campus.",
            ]
        )
        + "\n"
    )


def validate_delivery_archive(path: Path) -> None:
    """Revalide l'anonymisation dans le ZIP final, y compris ses ZIP imbriqués."""
    problems: list[str] = []

    def inspect_zip(payload: bytes, context: str, depth: int) -> None:
        if depth > 2:
            problems.append(f"profondeur ZIP inattendue : {context}")
            return
        try:
            archive = zipfile.ZipFile(io.BytesIO(payload))
        except zipfile.BadZipFile:
            problems.append(f"ZIP illisible : {context}")
            return
        with archive:
            for info in archive.infolist():
                pure_path = PurePosixPath(info.filename)
                if pure_path.is_absolute() or ".." in pure_path.parts:
                    problems.append(f"chemin ZIP non sûr : {context}/{info.filename}")
                    continue
                if info.is_dir():
                    continue
                nested_payload = archive.read(info)
                nested_context = f"{context}/{info.filename}"
                suffix = pure_path.suffix.lower()
                if suffix == ".pdf":
                    try:
                        assert_anonymized_pdf(nested_payload, nested_context)
                    except ValueError as error:
                        problems.append(str(error))
                elif suffix == ".zip":
                    inspect_zip(nested_payload, nested_context, depth + 1)
                else:
                    findings = byte_identity_findings(nested_payload)
                    if findings:
                        problems.append(
                            f"anonymisation refusée pour {nested_context} : "
                            + ", ".join(findings)
                        )

    inspect_zip(path.read_bytes(), path.name, 0)
    if problems:
        raise ValueError("Paquet non anonymisé : " + "; ".join(problems[:20]))


def build_delivery_pack() -> None:
    tracked_changes = git("status", "--porcelain", "--untracked-files=no")
    if tracked_changes:
        raise RuntimeError("Les fichiers suivis doivent être commités avant de figer le paquet.")

    dossier_pages, dossier_text = validate_pdf(DOSSIER, maximum_pages=30)
    annex_pages, annex_text = validate_pdf(ANNEXES)
    dossier_outlines, dossier_links, dossier_tagged = validate_pdf_navigation(
        DOSSIER,
        minimum_outlines=10,
        minimum_internal_links=10,
    )
    annex_outlines, annex_links, annex_tagged = validate_pdf_navigation(
        ANNEXES,
        minimum_outlines=20,
        minimum_internal_links=10,
    )
    combined_text = dossier_text + "\n" + annex_text
    forbidden_match = FORBIDDEN_BLOC2_PDF_PATTERN.search(combined_text)
    if forbidden_match:
        raise ValueError(
            "Le paquet Bloc 2 écrit contient un terme hors périmètre : "
            f"{forbidden_match.group(0)!r}."
        )
    for expected in [
        "B2-A26",
        "B2-A27",
        "B2-A30",
        "B2-A31",
        "B2-A34",
        "B2-A35",
        "B2-A36",
        "B2-A37",
        "B2-A38",
        "B2-A39",
        "B2-A40",
        "29833210488",
        APPLICATION_SHA[:7],
        FINAL_CI_RUN,
        FINAL_CD_RUN,
        "Manuel de déploiement complet",
        "Manuel utilisateur complet",
        "Manuel de mise à jour complet",
        "LIV-01",
        "Cahier de recettes complet",
        "LIV-02",
        "Plan de correction des bogues complet",
        "LIV-03",
        "Revue de sécurité OWASP A01 à A10 complète",
        "LIV-04",
        "Matrice user stories, écrans, recettes et preuves complète",
    ]:
        if expected not in combined_text:
            raise ValueError(f"Preuve absente des PDF : {expected}")
    if re.search(
        r"reste\s+à\s+déployer\s+et\s+contre-recetter\s+le\s+correctif\s+de\s+reflow",
        combined_text,
        flags=re.IGNORECASE,
    ):
        raise ValueError("Le dossier contient encore la conclusion obsolète sur le correctif de reflow.")

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
    source_staging = CANDIDATE_DIR / f"pack-source-{VERSION}"
    create_source_archive(source_target, source_staging)

    readme = PACK_DIR / "LISEZ-MOI.txt"
    readme.write_text(build_readme_text(), encoding="utf-8")

    artifacts = [dossier_target, annexes_target, source_target, readme]
    manifest = PACK_DIR / "MANIFESTE.txt"
    lines = [
        "ALCIDE - MANIFESTE DU PAQUET BLOC 2 RNCP39583",
        f"Date de génération : {DATE}",
        f"Version applicative : {VERSION}",
        f"SHA applicatif déployé : {APPLICATION_SHA}",
        f"CI applicative finale : {FINAL_CI_RUN}",
        f"CD applicatif final : {FINAL_CD_RUN}",
        f"SHA Git documentaire et source archivé : {head}",
        f"Dossier principal : {dossier_pages} pages (maximum officiel : 30 hors annexes)",
        f"Annexes sélectionnées : {annex_pages} pages",
        f"Navigation dossier : {dossier_outlines} signets ; {dossier_links} liens internes ; langue fr-FR",
        f"Navigation annexes : {annex_outlines} signets ; {annex_links} liens internes ; langue fr-FR",
        "",
        "FICHIERS ET EMPREINTES SHA-256",
    ]
    for artifact in artifacts:
        lines.append(f"{artifact.name}\t{artifact.stat().st_size} octets\t{sha256(artifact)}")
    lines.extend(
        [
            "",
            "LIMITES À NE PAS MASQUER",
            "- les contrôles d'accessibilité ne constituent pas une déclaration de conformité exhaustive au RGAA ;",
            f"- PDF balisés/PDF-UA : {'oui' if dossier_tagged and annex_tagged else 'non'} ; les signets, liens, métadonnées et sources Markdown fournissent une navigation de repli, sans remplacer un balisage structurel ;",
            "- date, nommage, taille et anonymisation à confirmer avec le campus.",
        ]
    )
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")

    shutil.make_archive(str(PACK_ZIP.with_suffix("")), "zip", PACK_DIR.parent, PACK_DIR.name)
    if ANONYMIZED_MODE:
        validate_delivery_archive(PACK_ZIP)
    print(f"Paquet : {PACK_ZIP}")
    print(f"SHA-256 paquet : {sha256(PACK_ZIP)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Construit le paquet de remise du Bloc 2.")
    parser.add_argument(
        "--source-candidate",
        action="store_true",
        help="construit uniquement une archive source candidate sous tmp/archive-candidate",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.source_candidate:
        build_candidate_source_archive()
        return
    build_delivery_pack()


if __name__ == "__main__":
    main()
