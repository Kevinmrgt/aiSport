from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    CondPageBreak,
    Image,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

from bloc2_delivery_config import (
    ANONYMIZED_MODE,
    DELIVERY_DATE,
    DELIVERY_DATE_FR,
    VERSION,
    anonymize_text,
    assert_anonymized_pdf,
)


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "docs" / "rncp" / "bloc2-dossier-conception-developpement-rncp39583.md"
OUTPUT = (
    ROOT
    / "output"
    / "pdf"
    / f"dossier-bloc2-rncp39583-alcide-v{VERSION}-final-{DELIVERY_DATE}.pdf"
)

INK = colors.HexColor("#182015")
OLIVE = colors.HexColor("#46513F")
LIME = colors.HexColor("#D5FF21")
PALE = colors.HexColor("#F2F6EA")
BLUE = colors.HexColor("#1D4ED8")
MUTED = colors.HexColor("#52604C")


def inline_markdown(value: str) -> str:
    value = value.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    value = html.escape(value, quote=True)
    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<link href="\2" color="#1D4ED8"><u>\1</u></link>',
        value,
    )
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    return value


def styles():
    sheet = getSampleStyleSheet()
    sheet.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=sheet["Title"],
            fontName="Helvetica-Bold",
            fontSize=27,
            leading=31,
            textColor=colors.white,
            spaceAfter=12,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="CoverSub",
            parent=sheet["BodyText"],
            fontSize=12,
            leading=17,
            textColor=colors.white,
            spaceAfter=7,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="CoverMeta",
            parent=sheet["BodyText"],
            fontSize=9.5,
            leading=14,
            textColor=INK,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="H1x",
            parent=sheet["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            spaceBefore=12,
            spaceAfter=7,
            textColor=INK,
            keepWithNext=True,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="H2x",
            parent=sheet["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            spaceBefore=9,
            spaceAfter=5,
            textColor=BLUE,
            keepWithNext=True,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="H3x",
            parent=sheet["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            spaceBefore=9,
            spaceAfter=5,
            textColor=BLUE,
            keepWithNext=True,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="Bodyx",
            parent=sheet["BodyText"],
            fontSize=9.2,
            leading=12.5,
            spaceAfter=5,
            textColor=INK,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="Metax",
            parent=sheet["BodyText"],
            fontSize=8.5,
            leading=11.5,
            textColor=MUTED,
            leftIndent=9,
            borderColor=LIME,
            borderWidth=0,
            borderPadding=5,
            spaceAfter=5,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="Cellx",
            parent=sheet["BodyText"],
            fontSize=7.4,
            leading=9.2,
            textColor=INK,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="Captionx",
            parent=sheet["BodyText"],
            fontSize=7.8,
            leading=10,
            textColor=MUTED,
            alignment=1,
            spaceBefore=3,
            spaceAfter=8,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="TOCTitle",
            parent=sheet["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            spaceAfter=7,
            textColor=INK,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="TOC0",
            parent=sheet["BodyText"],
            fontSize=8.7,
            leading=11,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="TOC1",
            parent=sheet["BodyText"],
            fontSize=7.5,
            leading=9.5,
            leftIndent=14,
            firstLineIndent=0,
            textColor=MUTED,
        )
    )
    sheet.add(
        ParagraphStyle(
            name="TOC2",
            parent=sheet["BodyText"],
            fontSize=7.2,
            leading=9,
            leftIndent=27,
            firstLineIndent=0,
            textColor=MUTED,
        )
    )
    sheet["Code"].fontName = "Courier"
    sheet["Code"].fontSize = 7.4
    sheet["Code"].leading = 9.2
    sheet["Code"].backColor = colors.HexColor("#F4F4F1")
    sheet["Code"].borderPadding = 6
    return sheet


STYLES = styles()


class CandidateDocument(SimpleDocTemplate):
    def __init__(self, *args, toc_max_level: int = 2, **kwargs):
        self.toc_max_level = toc_max_level
        super().__init__(*args, **kwargs)

    def beforeDocument(self):
        super().beforeDocument()
        self._last_outline_level = 0
        self.canv.showOutline()
        self.canv._doc._catalog.setPageLayout("OneColumn")

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        if flowable.style.name == "TOCTitle":
            key = "sommaire"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.getPlainText(), key, level=0, closed=False)
            self._last_outline_level = 0
            return

        level_by_style = {"H1x": 0, "H2x": 1, "H3x": 2}
        level = level_by_style.get(flowable.style.name)
        if level is None:
            return
        # ReportLab interdit de sauter un niveau de signet. La limitation rend
        # le générateur robuste aux sources Markdown contenant directement un
        # titre de niveau 4 après un titre de niveau 2.
        level = min(level, self._last_outline_level + 1)
        text = flowable.getPlainText()
        key = f"heading-{level}-{self.seq.nextf('heading')}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=False)
        if level <= self.toc_max_level:
            self.notify("TOCEntry", (level, text, self.page, key))
        self._last_outline_level = level


def cover_page(canvas, _doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(INK)
    canvas.rect(0, height - 10.4 * cm, width, 10.4 * cm, fill=1, stroke=0)
    canvas.setFillColor(LIME)
    canvas.rect(0, height - 10.65 * cm, width, 0.25 * cm, fill=1, stroke=0)
    canvas.restoreState()


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7DED0"))
    canvas.line(1.5 * cm, 1.18 * cm, A4[0] - 1.5 * cm, 1.18 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.5 * cm, 0.78 * cm, "Alcide - Bloc 2 RNCP39583 - dossier anonymisé")
    canvas.drawRightString(A4[0] - 1.5 * cm, 0.78 * cm, f"Page {doc.page}")
    canvas.restoreState()


def table_block(lines: list[str]):
    raw_rows: list[list[str]] = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        raw_rows.append(cells)

    if not raw_rows:
        return []

    column_count = len(raw_rows[0])
    if any(len(row) != column_count for row in raw_rows):
        raise ValueError("Table Markdown incohérente : nombre de colonnes variable")

    maximums = [max(len(row[index]) for row in raw_rows) for index in range(column_count)]
    weights = [max(1.0, min(3.2, maximum**0.5)) for maximum in maximums]
    total_width = 17.5 * cm
    widths = [total_width * weight / sum(weights) for weight in weights]
    rows = [[Paragraph(inline_markdown(cell), STYLES["Cellx"]) for cell in row] for row in raw_rows]

    result = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), OLIVE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C9D0C4")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return [result, Spacer(1, 0.2 * cm)]


def image_block(path_value: str, caption: str, base_dir: Path):
    path = Path(path_value)
    if not path.is_absolute():
        path = (base_dir / path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Image Markdown introuvable : {path}")

    image = Image(str(path))
    maximum_width = 17.2 * cm
    maximum_height = 12.5 * cm
    ratio = min(maximum_width / image.imageWidth, maximum_height / image.imageHeight, 1)
    image.drawWidth = image.imageWidth * ratio
    image.drawHeight = image.imageHeight * ratio
    image.hAlign = "CENTER"
    return [
        CondPageBreak(image.drawHeight + 1.1 * cm),
        image,
        Paragraph(inline_markdown(caption), STYLES["Captionx"]),
    ]


def parse_markdown(source: str, base_dir: Path, skip_preamble: bool = False):
    story = []
    lines = source.splitlines()
    if skip_preamble:
        first_section = next((i for i, line in enumerate(lines) if line.startswith("## ")), 0)
        lines = lines[first_section:]
    index = 0
    in_code = False
    code_lines: list[str] = []
    paragraph: list[str] = []

    def flush_paragraph():
        if paragraph:
            story.append(Paragraph(inline_markdown(" ".join(paragraph)), STYLES["Bodyx"]))
            paragraph.clear()

    while index < len(lines):
        line = lines[index].rstrip()

        if line == "<!-- pagebreak -->":
            flush_paragraph()
            story.append(PageBreak())
            index += 1
            continue
        if line.startswith("```"):
            flush_paragraph()
            if in_code:
                story.append(Preformatted("\n".join(code_lines), STYLES["Code"]))
                story.append(Spacer(1, 0.15 * cm))
                code_lines.clear()
            in_code = not in_code
            index += 1
            continue
        if in_code:
            code_lines.append(line)
            index += 1
            continue

        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", line.strip())
        if image_match:
            flush_paragraph()
            story.extend(image_block(image_match.group(2), image_match.group(1), base_dir))
            index += 1
            continue

        if line.startswith("|"):
            flush_paragraph()
            table_lines = []
            while index < len(lines) and lines[index].lstrip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            story.extend(table_block(table_lines))
            continue

        if not line or line == ">":
            flush_paragraph()
        elif line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markdown(line[2:]), STYLES["H1x"]))
        elif line.startswith("## "):
            flush_paragraph()
            story.append(CondPageBreak(5 * cm))
            story.append(Paragraph(inline_markdown(line[3:]), STYLES["H1x"]))
        elif line.startswith("#### "):
            flush_paragraph()
            story.append(CondPageBreak(3 * cm))
            story.append(Paragraph(inline_markdown(line[5:]), STYLES["H3x"]))
        elif line.startswith("### "):
            flush_paragraph()
            story.append(CondPageBreak(3 * cm))
            story.append(Paragraph(inline_markdown(line[4:]), STYLES["H2x"]))
        elif line.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline_markdown(line[2:]), STYLES["Metax"]))
        elif re.match(r"^[-*] ", line):
            flush_paragraph()
            story.append(Paragraph(inline_markdown(line[2:]), STYLES["Bodyx"], bulletText="-"))
        elif re.match(r"^\d+\. ", line):
            flush_paragraph()
            number, value = line.split(". ", 1)
            story.append(Paragraph(inline_markdown(value), STYLES["Bodyx"], bulletText=f"{number}."))
        else:
            paragraph.append(line.strip())
        index += 1

    flush_paragraph()
    return story


def cover_story():
    summary = Table(
        [
            ["Certification", "RNCP39583 - Expert en développement logiciel"],
            ["Épreuve", "Bloc 2 - Concevoir et développer des applications logicielles"],
            ["Projet", "Alcide - coach sportif assisté par IA"],
            ["Version", f"{VERSION} - dossier finalisé le {DELIVERY_DATE_FR}"],
            ["Règle", "30 pages maximum hors annexes - rendu individuel"],
            ["Identité", "Dossier anonymisé conformément au règlement de certification"],
        ],
        colWidths=[4.2 * cm, 12.5 * cm],
    )
    summary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), PALE),
                ("TEXTCOLOR", (0, 0), (0, -1), OLIVE),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
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
        Paragraph("DOSSIER DE CERTIFICATION", STYLES["CoverSub"]),
        Paragraph("Bloc 2", STYLES["CoverTitle"]),
        Paragraph("Concevoir et développer des applications logicielles", STYLES["CoverSub"]),
        Spacer(1, 5.5 * cm),
        summary,
        Spacer(1, 1.1 * cm),
        Paragraph(
            "Le dossier distingue les preuves exécutées, leurs limites et les vérifications administratives restant avant le dépôt.",
            STYLES["CoverMeta"],
        ),
        PageBreak(),
    ]


def toc_story():
    toc = TableOfContents()
    toc.levelStyles = [STYLES["TOC0"], STYLES["TOC1"], STYLES["TOC2"]]
    return [
        Paragraph("Sommaire", STYLES["TOCTitle"]),
        Spacer(1, 0.25 * cm),
        toc,
        PageBreak(),
    ]


def build_pdf(source: Path = SOURCE, output: Path = OUTPUT) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    document = CandidateDocument(
        str(output),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.55 * cm,
        title=f"Dossier Bloc 2 RNCP39583 - Alcide - final {DELIVERY_DATE}",
        author="Candidat RNCP39583 - dossier anonymisé",
        subject="Code source et documentation associée - Bloc 2",
        creator="Générateur documentaire Alcide - ReportLab",
        keywords="RNCP39583, Bloc 2, conception, développement, Alcide, certification",
        lang="fr-FR",
        displayDocTitle=True,
    )
    story = cover_story()
    story.extend(toc_story())
    markdown = source.read_text(encoding="utf-8")
    if ANONYMIZED_MODE:
        markdown = anonymize_text(markdown)
    story.extend(parse_markdown(markdown, source.parent, skip_preamble=True))
    document.multiBuild(story, onFirstPage=cover_page, onLaterPages=page_footer)
    if ANONYMIZED_MODE:
        assert_anonymized_pdf(output)
    return output


def main() -> None:
    print(build_pdf())


if __name__ == "__main__":
    main()
