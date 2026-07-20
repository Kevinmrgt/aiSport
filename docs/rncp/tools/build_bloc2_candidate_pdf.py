from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "docs" / "rncp" / "bloc2-dossier-conception-developpement-rncp39583.md"
OUTPUT = ROOT / "output" / "pdf" / "dossier-bloc2-rncp39583-alcide-v0.13.0-rc.2.pdf"


def inline_markdown(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    return value.replace("&", "&amp;").replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;")


def styles():
    sheet = getSampleStyleSheet()
    sheet.add(ParagraphStyle(name="DocTitle", parent=sheet["Title"], fontSize=22, leading=27, spaceAfter=18))
    sheet.add(ParagraphStyle(name="H1x", parent=sheet["Heading1"], fontSize=16, leading=20, spaceBefore=12, spaceAfter=7, textColor=colors.HexColor("#172554")))
    sheet.add(ParagraphStyle(name="H2x", parent=sheet["Heading2"], fontSize=12.5, leading=16, spaceBefore=9, spaceAfter=5, textColor=colors.HexColor("#1D4ED8")))
    sheet.add(ParagraphStyle(name="Bodyx", parent=sheet["BodyText"], fontSize=9.2, leading=12.5, spaceAfter=5))
    sheet.add(ParagraphStyle(name="Metax", parent=sheet["BodyText"], fontSize=8.5, leading=11, textColor=colors.HexColor("#475569"), leftIndent=8, spaceAfter=3))
    sheet.add(ParagraphStyle(name="Cellx", parent=sheet["BodyText"], fontSize=6.5, leading=8.2))
    return sheet


STYLES = styles()


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(1.5 * cm, 0.9 * cm, "Alcide - Dossier candidat Bloc 2 RNCP39583")
    canvas.drawRightString(A4[0] - 1.5 * cm, 0.9 * cm, f"Page {doc.page}")
    canvas.restoreState()


def table_block(lines: list[str]):
    rows: list[list[Paragraph]] = []
    for index, line in enumerate(lines):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        rows.append([Paragraph(inline_markdown(cell), STYLES["Cellx"]) for cell in cells])

    if not rows:
        return []
    width = 17.5 * cm / max(len(rows[0]), 1)
    result = Table(rows, colWidths=[width] * len(rows[0]), repeatRows=1, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#172554")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return [result, Spacer(1, 0.2 * cm)]


def parse_markdown(source: str):
    story = []
    lines = source.splitlines()
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

        if line.startswith("```"):
            flush_paragraph()
            if in_code:
                story.append(Preformatted("\n".join(code_lines), STYLES["Code"]))
                code_lines.clear()
            in_code = not in_code
            index += 1
            continue
        if in_code:
            code_lines.append(line)
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

        if not line:
            flush_paragraph()
        elif line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markdown(line[2:]), STYLES["DocTitle"]))
        elif line.startswith("## "):
            flush_paragraph()
            if story:
                story.append(PageBreak())
            story.append(Paragraph(inline_markdown(line[3:]), STYLES["H1x"]))
        elif line.startswith("### "):
            flush_paragraph()
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


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title="Dossier candidat Bloc 2 RNCP39583 - Alcide",
        author="Kevin",
    )
    document.build(parse_markdown(SOURCE.read_text(encoding="utf-8")), onFirstPage=page_footer, onLaterPages=page_footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
