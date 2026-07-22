from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from reportlab.pdfgen import canvas

from bloc2_delivery_config import (
    ROOT,
    PUBLIC_REPOSITORY_URL,
    VERSION,
    anonymize_text,
    assert_anonymized_pdf,
    assert_anonymized_text,
)
from build_bloc2_annexes_pdf import CORE_DELIVERABLES, SELECTED
from build_bloc2_delivery_pack import (
    APPLICATION_SHA,
    FINAL_CD_RUN,
    FINAL_CI_RUN,
    build_readme_text,
    validate_delivery_archive,
)


class Bloc2DeliveryToolsTests(unittest.TestCase):
    def test_version_is_derived_from_package_json(self) -> None:
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(VERSION, package["version"])

    def test_deployed_application_references_match_rc5(self) -> None:
        self.assertEqual(APPLICATION_SHA, "c63439e8ac8d68efd5ba091211b326ee8575fbba")
        self.assertEqual(FINAL_CI_RUN, "29930722308")
        self.assertEqual(FINAL_CD_RUN, "29931146789")

    def test_anonymizer_neutralizes_named_github_and_vercel_urls(self) -> None:
        source = (
            "https://github.com/Kevinmrgt/aiSport/actions/runs/123 "
            "https://alcide-abc-kevinmrgts-projects.vercel.app"
        )
        sanitized = anonymize_text(source)
        assert_anonymized_text(sanitized, "test")
        self.assertIn("compte-anonymise/depot-anonymise", sanitized)
        self.assertIn("deploiement-anonymise.vercel.app", sanitized)

    def test_anonymizer_keeps_the_explicit_public_repository_url(self) -> None:
        source = f"Dépôt public : {PUBLIC_REPOSITORY_URL}"
        sanitized = anonymize_text(source)
        self.assertEqual(sanitized, source)
        assert_anonymized_text(sanitized, "dépôt public")

    def test_pdf_gate_allows_the_explicit_public_repository_link(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "public-repository.pdf"
            pdf = canvas.Canvas(str(target))
            pdf.drawString(72, 760, PUBLIC_REPOSITORY_URL)
            pdf.linkURL(PUBLIC_REPOSITORY_URL, (72, 750, 280, 775))
            pdf.save()
            assert_anonymized_pdf(target)

    def test_pdf_gate_detects_hidden_named_link(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "hidden-link.pdf"
            pdf = canvas.Canvas(str(target))
            pdf.drawString(72, 760, "Run CI 123")
            pdf.linkURL(
                "https://github.com/Kevinmrgt/aiSport/actions/runs/123",
                (72, 750, 180, 775),
            )
            pdf.save()
            with self.assertRaisesRegex(ValueError, "URL GitHub nominative"):
                assert_anonymized_pdf(target)

    def test_pack_gate_detects_identity_in_nested_archive(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "pack.zip"
            nested = Path(directory) / "source.zip"
            with zipfile.ZipFile(nested, "w") as archive:
                archive.writestr(
                    "source/proof.txt",
                    "https://preview-kevinmrgts-projects.vercel.app",
                )
            with zipfile.ZipFile(target, "w") as archive:
                archive.write(nested, "pack/source.zip")
            with self.assertRaisesRegex(ValueError, "URL Vercel nominative"):
                validate_delivery_archive(target)

    def test_structuring_documents_are_first_level_and_discoverable(self) -> None:
        identifiers = [identifier for identifier, _path, _description in CORE_DELIVERABLES]
        self.assertEqual(identifiers, ["LIV-01", "LIV-02", "LIV-03", "LIV-04"])
        self.assertTrue(all(path.is_file() for _identifier, path, _description in CORE_DELIVERABLES))
        notice = build_readme_text()
        for identifier in identifiers:
            self.assertIn(identifier, notice)

    def test_latest_accessibility_evidence_is_selected_and_discoverable(self) -> None:
        self.assertIn(
            "B2-A40-audit-semantique-assiste-2026-07-22.md",
            SELECTED,
        )
        self.assertIn("B2-A40", build_readme_text())
        self.assertIn(
            "B2-A41-parcours-nvda-production-2026-07-22.md",
            SELECTED,
        )
        self.assertIn("B2-A41", build_readme_text())


if __name__ == "__main__":
    unittest.main()
