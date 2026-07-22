from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, Spacer, Table, TableStyle

from bloc2_delivery_config import (
    ANONYMIZED_MODE,
    DELIVERY_DATE,
    PUBLIC_REPOSITORY_URL,
    VERSION,
    anonymize_text,
    assert_anonymized_pdf,
)

from build_bloc2_dossier_pdf import (
    Bloc2Document,
    INK,
    LIME,
    MUTED,
    OLIVE,
    PALE,
    STYLES,
    cover_page,
    parse_markdown,
    toc_story,
)


ROOT = Path(__file__).resolve().parents[3]
ANNEXES = ROOT / "docs" / "rncp" / "bloc2-annexes"
OUTPUT = (
    ROOT
    / "output"
    / "pdf"
    / f"annexes-bloc2-rncp39583-alcide-v{VERSION}-final-{DELIVERY_DATE}.pdf"
)

SELECTED = [
    "B2-A19-postgresql-integration-2026-07-20.md",
    "B2-A20-recette-navigateur-accessibilite-publique-2026-07-20.md",
    "B2-A22-docker-node24-2026-07-20.md",
    "B2-A25-recette-authentifiee-production-et-correctifs-2026-07-20.md",
    "B2-A26-playwright-authentifie-compte-dedie-2026-07-21.md",
    "B2-A27-correction-audit-dependances-2026-07-21.md",
    "B2-A28-validation-main-ci-cd-auth-2026-07-21.md",
    "B2-A29-performance-production-2026-07-21.md",
    "B2-A30-prototype-authentifie-desktop-mobile-2026-07-21.md",
    "B2-A31-couverture-shared-2026-07-21.md",
    "B2-A34-recettes-metier-finales-2026-07-21.md",
    "B2-A35-recettes-securite-finales-2026-07-21.md",
    "B2-A36-audit-accessibilite-final-2026-07-21.md",
    "B2-A37-controles-accessibilite-humains-2026-07-21.md",
    "B2-A38-preuve-negative-ci-cd-2026-07-21.md",
    "B2-A39-correction-dependances-2026-07-22.md",
    "B2-A40-audit-semantique-assiste-2026-07-22.md",
    "B2-A41-parcours-nvda-production-2026-07-22.md",
]

CORE_DELIVERABLES = [
    (
        "LIV-01",
        ROOT / "docs" / "bloc2" / "cahier-recettes.md",
        "Cahier de recettes complet",
    ),
    (
        "LIV-02",
        ROOT / "docs" / "rncp" / "bloc2-plan-correction-bogues-rncp39583.md",
        "Plan de correction des bogues complet",
    ),
    (
        "LIV-03",
        ROOT / "docs" / "security" / "owasp-review.md",
        "Revue de sécurité OWASP A01 à A10 complète",
    ),
    (
        "LIV-04",
        ROOT / "docs" / "rncp" / "bloc2-matrice-user-stories-preuves.md",
        "Matrice user stories, écrans, recettes et preuves complète",
    ),
]

MANUALS = [
    (
        "DOC-01",
        ROOT / "docs" / "deployment.md",
        "Manuel de déploiement complet",
    ),
    (
        "DOC-02",
        ROOT / "docs" / "rncp" / "bloc2-manuel-utilisateur-alcide.md",
        "Manuel utilisateur complet",
    ),
    (
        "DOC-03",
        ROOT / "docs" / "rncp" / "bloc2-manuel-mise-a-jour.md",
        "Manuel de mise à jour complet",
    ),
]

def annex_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7DED0"))
    canvas.line(1.5 * cm, 1.18 * cm, A4[0] - 1.5 * cm, 1.18 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.5 * cm, 0.78 * cm, "Alcide - Annexes Bloc 2 RNCP39583 - hors pagination")
    canvas.drawRightString(A4[0] - 1.5 * cm, 0.78 * cm, f"Page {doc.page}")
    canvas.restoreState()


def annex_cover_story():
    rows = [["Pièce", "Objet"]]
    descriptions = {
        "B2-A19": "Tests d'intégration sur PostgreSQL 16 réel",
        "B2-A20": "Navigation publique, reflow, clavier et axe",
        "B2-A22": "Construction Docker Node 24 et exécution non-root",
        "B2-A25": "Recette métier authentifiée et corrections",
        "B2-A26": "Playwright OAuth réel et stockage hors Git",
        "B2-A27": "Correction de l'audit des dépendances",
        "B2-A28": "Baseline main, CI, CD, OAuth et couvertures",
        "B2-A29": "Performance des healthchecks de production",
        "B2-A30": "Prototype final desktop/mobile et axe privé",
        "B2-A31": "Couverture autonome du package shared",
        "B2-A34": "Recettes métier finales et parcours journalisé",
        "B2-A35": "Recettes sécurité finales OWASP et navigateur",
        "B2-A36": "Audit accessibilité final public et privé",
        "B2-A37": "Zoom natif, contrastes et contre-recette",
        "B2-A38": "Preuve négative dynamique du blocage CI vers CD",
        "B2-A39": "Correction des dépendances et audit de sécurité rc.4",
        "B2-A40": "Audit sémantique authentifié et contre-recette rc.4",
        "B2-A41": "Parcours réel NVDA et contre-recette rc.5",
    }
    for filename in SELECTED:
        identifier = filename.split("-")[0] + "-" + filename.split("-")[1]
        rows.append([identifier, descriptions[identifier]])
    for identifier, _path, description in CORE_DELIVERABLES:
        rows.append([identifier, description])
    for identifier, _path, description in MANUALS:
        rows.append([identifier, description])

    table = Table(rows, colWidths=[3.2 * cm, 13.5 * cm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), OLIVE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), PALE),
                ("TEXTCOLOR", (0, 1), (-1, -1), INK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.3),
                ("LEADING", (0, 0), (-1, -1), 10.5),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD2C6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ]
        )
    )
    return [
        Spacer(1, 1.8 * cm),
        Paragraph("ANNEXES DE PREUVES", STYLES["CoverSub"]),
        Paragraph("Bloc 2", STYLES["CoverTitle"]),
        Paragraph(
            "Preuves sélectionnées, livrables d'évaluation et documentation d'exploitation complète - hors limite des 30 pages du dossier",
            STYLES["CoverSub"],
        ),
        Paragraph(
            f'Code source public : <link href="{PUBLIC_REPOSITORY_URL}" color="#FFFFFF">'
            f'<u>{PUBLIC_REPOSITORY_URL}</u></link>',
            STYLES["CoverSub"],
        ),
        Spacer(1, 3.1 * cm),
        table,
        Spacer(1, 0.8 * cm),
        Paragraph(
            "Les pièces historiques restent dans le dépôt mais ne sont pas présentées comme preuves de la baseline finale.",
            STYLES["CoverMeta"],
        ),
        PageBreak(),
    ]


def shift_headings(source: str) -> str:
    shifted = []
    for line in source.splitlines():
        if line.startswith("### "):
            shifted.append("#### " + line[4:])
        elif line.startswith("## "):
            shifted.append("### " + line[3:])
        elif line.startswith("# "):
            shifted.append("## " + line[2:])
        else:
            shifted.append(line)
    return "\n".join(shifted)


def nested_manual_sections(source: str) -> str:
    """Retire le préambule du manuel puis imbrique ses sections sous DOC-xx."""
    lines = source.splitlines()
    first_section = next(
        (index for index, line in enumerate(lines) if line.startswith("## ")),
        None,
    )
    if first_section is None:
        raise ValueError("Manuel sans section Markdown de niveau 2")
    return shift_headings("\n".join(lines[first_section:]))


def nested_complete_document(source: str) -> str:
    """Imbrique un document complet sous son identifiant LIV-xx."""
    nested = []
    for line in source.splitlines():
        if line.startswith("#### "):
            nested.append(line)
        elif line.startswith("### "):
            nested.append("#### " + line[4:])
        elif line.startswith("## "):
            nested.append("#### " + line[3:])
        elif line.startswith("# "):
            nested.append("### " + line[2:])
        else:
            nested.append(line)
    return "\n".join(nested)


def build_pdf(output: Path = OUTPUT) -> Path:
    missing = [filename for filename in SELECTED if not (ANNEXES / filename).is_file()]
    missing.extend(
        str(path.relative_to(ROOT))
        for _identifier, path, _description in CORE_DELIVERABLES + MANUALS
        if not path.is_file()
    )
    if missing:
        raise FileNotFoundError(f"Annexes manquantes : {missing}")

    output.parent.mkdir(parents=True, exist_ok=True)
    document = Bloc2Document(
        str(output),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.55 * cm,
        toc_max_level=0,
        title=f"Annexes Bloc 2 RNCP39583 - Alcide - final {DELIVERY_DATE}",
        author="Projet Alcide - dossier anonymisé",
        subject="Preuves sélectionnées et documentation d'exploitation du dossier Bloc 2",
        creator="Générateur documentaire Alcide - ReportLab",
        keywords="RNCP39583, Bloc 2, annexes, preuves, manuels, Alcide, certification",
        lang="fr-FR",
        displayDocTitle=True,
    )

    story = annex_cover_story()
    story.extend(toc_story())

    for index, filename in enumerate(SELECTED):
        if index:
            story.append(PageBreak())
        path = ANNEXES / filename
        markdown = path.read_text(encoding="utf-8")
        if ANONYMIZED_MODE:
            markdown = anonymize_text(markdown)
        story.extend(parse_markdown(shift_headings(markdown), path.parent))

    for identifier, path, description in CORE_DELIVERABLES:
        story.append(PageBreak())
        story.append(Paragraph(f"{identifier} - {description}", STYLES["H1x"]))
        markdown = path.read_text(encoding="utf-8")
        if ANONYMIZED_MODE:
            markdown = anonymize_text(markdown)
        story.extend(parse_markdown(nested_complete_document(markdown), path.parent))

    for identifier, path, description in MANUALS:
        story.append(PageBreak())
        story.append(Paragraph(f"{identifier} - {description}", STYLES["H1x"]))
        markdown = path.read_text(encoding="utf-8")
        if ANONYMIZED_MODE:
            markdown = anonymize_text(markdown)
        story.extend(
            parse_markdown(
                nested_manual_sections(markdown),
                path.parent,
            )
        )

    document.multiBuild(story, onFirstPage=cover_page, onLaterPages=annex_footer)
    if ANONYMIZED_MODE:
        assert_anonymized_pdf(output)
    return output


def main() -> None:
    print(build_pdf())


if __name__ == "__main__":
    main()
