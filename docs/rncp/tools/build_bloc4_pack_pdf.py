"""Combine the Bloc 4 jury dossier and its evidence annexes into one PDF."""

from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[3]
DOSSIER = ROOT / "output" / "pdf" / "dossier-bloc4-rncp39583-alcide-final.pdf"
ANNEXES = ROOT / "output" / "pdf" / "annexes-bloc4-rncp39583-alcide-final.pdf"
OUTPUT = ROOT / "output" / "pdf" / "bloc4-rncp39583-alcide-pack-complet.pdf"


def build() -> int:
    dossier_reader = PdfReader(str(DOSSIER))
    annexes_reader = PdfReader(str(ANNEXES))
    writer = PdfWriter()

    for page in dossier_reader.pages:
        writer.add_page(page)
    for page in annexes_reader.pages:
        writer.add_page(page)

    dossier_pages = len(dossier_reader.pages)
    annexes_pages = len(annexes_reader.pages)
    writer.add_outline_item("Dossier principal", 0)
    annexes_root = writer.add_outline_item("Annexes de preuve", dossier_pages)
    writer.add_outline_item("Couverture et mode de lecture", dossier_pages, parent=annexes_root)
    annex_titles = [
        "A1 - Index et correspondance des preuves",
        "A2 - Monitoring de production réel",
        "A3 - Incident réel #42",
        "A4 - Simulation sûre du circuit d'alerte",
        "A5 - Anomalies et traitements",
        "A6 - Cas support #12",
        "A7 - PR #10 et pipeline de validation",
        "A8 - Versions et carte des sources",
    ]
    for index, title in enumerate(annex_titles, start=1):
        if index < annexes_pages:
            writer.add_outline_item(title, dossier_pages + index, parent=annexes_root)

    writer.add_metadata(
        {
            "/Title": "RNCP39583 Bloc 4 - Alcide - Dossier et annexes",
            "/Author": "Kevin",
            "/Subject": "Pack complet de remise : dossier principal suivi des annexes A1 à A8",
        }
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as output_file:
        writer.write(output_file)

    page_count = len(PdfReader(str(OUTPUT)).pages)
    print(f"Built {OUTPUT} ({page_count} pages: {dossier_pages} dossier + {annexes_pages} annexes).")
    return page_count


if __name__ == "__main__":
    build()
