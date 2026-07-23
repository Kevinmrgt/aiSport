from __future__ import annotations

import base64
import hashlib
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

from reportlab.pdfgen import canvas

from bloc2_delivery_config import (
    APPLICATION_URL,
    JURY_GENERATION_LIMIT,
    JURY_GENERATION_QUOTA_NOTICE,
    ROOT,
    PUBLIC_REPOSITORY_URL,
    VERSION,
    anonymize_text,
    assert_anonymized_pdf,
    assert_anonymized_text,
    jury_password_matches_hash,
    load_jury_access_from_env,
)
from build_bloc2_annexes_pdf import CORE_DELIVERABLES, SELECTED
from build_bloc2_dossier_pdf import build_pdf as build_dossier_pdf
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

    def test_deployed_application_references_match_rc7(self) -> None:
        self.assertEqual(APPLICATION_SHA, "d42e7f2c8fc86f26c46f850d32eb748870c6140d")
        self.assertEqual(FINAL_CI_RUN, "29994929981")
        self.assertEqual(FINAL_CD_RUN, "29995297354")

    def test_jury_quota_notice_documents_the_complete_rule(self) -> None:
        self.assertEqual(JURY_GENERATION_LIMIT, 30)
        self.assertIn("30 générations réussies maximum", JURY_GENERATION_QUOTA_NOTICE)
        self.assertIn("séances et les programmes", JURY_GENERATION_QUOTA_NOTICE)
        self.assertIn("compteur visible", JURY_GENERATION_QUOTA_NOTICE)
        self.assertIn("31e demande est bloquée", JURY_GENERATION_QUOTA_NOTICE)

    def test_application_url_is_the_public_vercel_deployment(self) -> None:
        self.assertEqual(APPLICATION_URL, "https://ai-sport-web.vercel.app")

    def test_private_jury_loader_requires_both_credentials(self) -> None:
        with self.assertRaisesRegex(ValueError, "sont requis"):
            load_jury_access_from_env({})
        with self.assertRaisesRegex(ValueError, "sont requis"):
            load_jury_access_from_env({"BLOC2_JURY_IDENTIFIER": "jury-alcide"})
        with self.assertRaisesRegex(ValueError, "sont requis"):
            load_jury_access_from_env(
                {"BLOC2_JURY_PASSWORD": "mot-de-passe-test-tres-long"}
            )

    def test_private_jury_loader_preserves_explicit_values(self) -> None:
        access = load_jury_access_from_env(
            {
                "BLOC2_JURY_IDENTIFIER": "jury-alcide",
                "BLOC2_JURY_PASSWORD": "mot-de-passe-test-tres-long",
                "BLOC2_JURY_EXPIRES_AT": "31 décembre 2026 à 23 h 59",
            }
        )
        self.assertEqual(access.identifier, "jury-alcide")
        self.assertEqual(access.password, "mot-de-passe-test-tres-long")
        self.assertEqual(access.expires_at, "31 décembre 2026 à 23 h 59")

    def test_private_jury_loader_verifies_the_runtime_hash(self) -> None:
        password = "mot-de-passe-test-tres-long"
        salt = b"0123456789abcdef"
        derived = hashlib.scrypt(
            password.encode(),
            salt=salt,
            n=16_384,
            r=8,
            p=1,
            dklen=32,
            maxmem=64 * 1024 * 1024,
        )
        encoded_hash = "$".join(
            [
                "scrypt",
                "16384",
                "8",
                "1",
                base64.urlsafe_b64encode(salt).decode().rstrip("="),
                base64.urlsafe_b64encode(derived).decode().rstrip("="),
            ]
        )
        environment = {
            "BLOC2_JURY_IDENTIFIER": "jury-alcide",
            "BLOC2_JURY_PASSWORD": password,
            "JURY_ACCESS_PASSWORD_HASH": encoded_hash,
        }
        self.assertTrue(jury_password_matches_hash(password, encoded_hash))
        access = load_jury_access_from_env(environment, verify_runtime_hash=True)
        self.assertEqual(access.identifier, "jury-alcide")
        with self.assertRaisesRegex(ValueError, "ne correspond pas"):
            load_jury_access_from_env(
                {**environment, "BLOC2_JURY_PASSWORD": "autre-mot-de-passe-tres-long"},
                verify_runtime_hash=True,
            )

    def test_private_jury_output_is_ignored_by_git(self) -> None:
        result = subprocess.run(
            ["git", "check-ignore", "output/jury-private/example.pdf"],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
        self.assertEqual(
            result.stdout.strip().replace("\\", "/"),
            "output/jury-private/example.pdf",
        )

    def test_public_pdf_excludes_private_credentials_and_keeps_clickable_url(self) -> None:
        from pypdf import PdfReader

        access = load_jury_access_from_env(
            {
                "BLOC2_JURY_IDENTIFIER": "jury-sentinel-private",
                "BLOC2_JURY_PASSWORD": "Sentinel-Private-Password!2026",
            }
        )
        with tempfile.TemporaryDirectory() as directory:
            public_pdf = Path(directory) / "public.pdf"
            private_pdf = Path(directory) / "private.pdf"
            build_dossier_pdf(output=public_pdf)
            build_dossier_pdf(output=private_pdf, jury_access=access)

            public_reader = PdfReader(str(public_pdf))
            private_reader = PdfReader(str(private_pdf))
            public_text = "\n".join(
                page.extract_text() or "" for page in public_reader.pages
            )
            private_text = "\n".join(
                page.extract_text() or "" for page in private_reader.pages
            )
            private_text_normalized = " ".join(private_text.split())
            public_uris = []
            for page in public_reader.pages:
                for annotation_ref in page.get("/Annots", []):
                    annotation = annotation_ref.get_object()
                    action = annotation.get("/A")
                    if action and action.get_object().get("/S") == "/URI":
                        public_uris.append(str(action.get_object().get("/URI")))

            self.assertIn(APPLICATION_URL, public_text)
            self.assertTrue(any(APPLICATION_URL in uri for uri in public_uris))
            self.assertNotIn(access.identifier, public_text)
            self.assertNotIn(access.password, public_text)
            self.assertIn(access.identifier, private_text)
            self.assertIn(access.password, private_text)
            self.assertIn(JURY_GENERATION_QUOTA_NOTICE, private_text_normalized)

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
