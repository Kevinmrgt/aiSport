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
OUTPUT = (
    ROOT
    / "output"
    / "preparation-orale"
    / "kit-soutenance-bloc2-rncp39583-alcide-2026-07-21.pdf"
)

SUPPORTS = [
    (
        "ORAL-01",
        ROOT / "docs" / "rncp" / "bloc2-guide-lecture-jury-rncp39583.md",
        "Guide de lecture du jury",
    ),
    (
        "ORAL-02",
        ROOT / "docs" / "rncp" / "bloc2-script-soutenance-rncp39583.md",
        "Script chronométré de soutenance",
    ),
    (
        "ORAL-03",
        ROOT / "docs" / "rncp" / "bloc2-plan-secours-demonstration-rncp39583.md",
        "Plan de secours de démonstration",
    ),
    (
        "ORAL-04",
        ROOT / "docs" / "rncp" / "bloc2-questions-reponses-jury-rncp39583.md",
        "Questions-réponses du jury",
    ),
]


def oral_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7DED0"))
    canvas.line(1.5 * cm, 1.18 * cm, A4[0] - 1.5 * cm, 1.18 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.5 * cm, 0.78 * cm, "Alcide - Préparation orale Bloc 2 RNCP39583")
    canvas.drawRightString(A4[0] - 1.5 * cm, 0.78 * cm, f"Page {doc.page}")
    canvas.restoreState()


def cover_story():
    rows = [["Repère", "Support"]]
    rows.extend([[identifier, description] for identifier, _path, description in SUPPORTS])
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
        Paragraph("PRÉPARATION ORALE", STYLES["CoverSub"]),
        Paragraph("Bloc 2", STYLES["CoverTitle"]),
        Paragraph("Script, plan de secours et réponses au jury", STYLES["CoverSub"]),
        Spacer(1, 5.5 * cm),
        table,
        Spacer(1, 1.1 * cm),
        Paragraph(
            "Support de préparation du candidat - ne pas joindre au dépôt sauf demande explicite du campus.",
            STYLES["CoverMeta"],
        ),
        PageBreak(),
    ]


def nested_source(source: str) -> str:
    """Retire le titre racine, conserve le préambule et imbrique les sections."""
    lines = source.splitlines()
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    shifted: list[str] = []
    for line in lines:
        if line.startswith("### "):
            shifted.append("#### " + line[4:])
        elif line.startswith("## "):
            shifted.append("### " + line[3:])
        else:
            shifted.append(line)
    return "\n".join(shifted)


def build_pdf(output: Path = OUTPUT) -> Path:
    missing = [str(path.relative_to(ROOT)) for _identifier, path, _description in SUPPORTS if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Supports de soutenance manquants : {missing}")

    output.parent.mkdir(parents=True, exist_ok=True)
    document = CandidateDocument(
        str(output),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.55 * cm,
        toc_max_level=1,
        title="Kit de soutenance Bloc 2 RNCP39583 - Alcide - 2026-07-21",
        author="Candidat RNCP39583 - dossier anonymisé",
        subject="Préparation orale, plan de secours et questions-réponses du jury",
        creator="Générateur documentaire Alcide - ReportLab",
        keywords="RNCP39583, Bloc 2, soutenance, jury, oral, Alcide, certification",
        lang="fr-FR",
        displayDocTitle=True,
    )

    story = cover_story()
    story.extend(toc_story())
    for index, (identifier, path, description) in enumerate(SUPPORTS):
        if index:
            story.append(PageBreak())
        story.append(Paragraph(f"{identifier} - {description}", STYLES["H1x"]))
        story.extend(parse_markdown(nested_source(path.read_text(encoding="utf-8")), path.parent))

    document.multiBuild(story, onFirstPage=cover_page, onLaterPages=oral_footer)
    return output


def main() -> None:
    print(build_pdf())


if __name__ == "__main__":
    main()
