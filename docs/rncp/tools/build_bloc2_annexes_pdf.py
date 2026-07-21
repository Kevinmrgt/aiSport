from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, Spacer, Table, TableStyle

from build_bloc2_candidate_pdf import (
    CandidateDocument,
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
    / "annexes-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf"
)

SELECTED = [
    "B2-A20-recette-navigateur-accessibilite-publique-2026-07-20.md",
    "B2-A25-recette-authentifiee-production-et-correctifs-2026-07-20.md",
    "B2-A26-playwright-authentifie-compte-dedie-2026-07-21.md",
    "B2-A27-correction-audit-dependances-2026-07-21.md",
    "B2-A28-validation-main-ci-cd-auth-2026-07-21.md",
    "B2-A29-performance-production-2026-07-21.md",
    "B2-A30-prototype-authentifie-desktop-mobile-2026-07-21.md",
    "B2-A31-couverture-shared-2026-07-21.md",
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
        "B2-A20": "Navigation publique, reflow, clavier et axe",
        "B2-A25": "Recette métier authentifiée et corrections",
        "B2-A26": "Playwright OAuth réel et stockage hors Git",
        "B2-A27": "Correction de l'audit des dépendances",
        "B2-A28": "Baseline main, CI, CD, OAuth et couvertures",
        "B2-A29": "Performance des healthchecks de production",
        "B2-A30": "Prototype final desktop/mobile et axe privé",
        "B2-A31": "Couverture autonome du package shared",
    }
    for filename in SELECTED:
        identifier = filename.split("-")[0] + "-" + filename.split("-")[1]
        rows.append([identifier, descriptions[identifier]])

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
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD2C6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return [
        Spacer(1, 1.8 * cm),
        Paragraph("ANNEXES DE PREUVES", STYLES["CoverSub"]),
        Paragraph("Bloc 2", STYLES["CoverTitle"]),
        Paragraph("Sélection finale - hors limite des 30 pages du dossier", STYLES["CoverSub"]),
        Spacer(1, 5.4 * cm),
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


def build_pdf(output: Path = OUTPUT) -> Path:
    missing = [filename for filename in SELECTED if not (ANNEXES / filename).is_file()]
    if missing:
        raise FileNotFoundError(f"Annexes manquantes : {missing}")

    output.parent.mkdir(parents=True, exist_ok=True)
    document = CandidateDocument(
        str(output),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.55 * cm,
        title="Annexes Bloc 2 RNCP39583 - Alcide - final 2026-07-21",
        author="Candidat RNCP39583 - dossier anonymisé",
        subject="Preuves sélectionnées hors pagination du dossier Bloc 2",
    )

    story = annex_cover_story()
    story.extend(toc_story())
    for index, filename in enumerate(SELECTED):
        if index:
            story.append(PageBreak())
        path = ANNEXES / filename
        story.extend(parse_markdown(shift_headings(path.read_text(encoding="utf-8")), path.parent))

    document.multiBuild(story, onFirstPage=cover_page, onLaterPages=annex_footer)
    return output


def main() -> None:
    print(build_pdf())


if __name__ == "__main__":
    main()
