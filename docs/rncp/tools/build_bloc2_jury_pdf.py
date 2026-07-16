from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Iterable

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "docs" / "rncp" / "livrables"
OUT_PDF = OUT_DIR / "dossier-bloc2-jury-rncp39583-alcide-2026-07-16.pdf"

SCREENSHOTS = ROOT / "docs" / "rncp" / "bloc2-annexes" / "screenshots"


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: Iterable[str], styles) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, styles["BodySmall"]), bulletColor=colors.HexColor("#2563EB")) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=8,
    )


def table(data: list[list[str]], widths: list[float], styles, header: bool = True) -> Table:
    wrapped = []
    for row in data:
        wrapped.append([p(cell, styles["TableCell"]) for cell in row])
    t = Table(wrapped, colWidths=widths, repeatRows=1 if header else 0)
    commands = [
        ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ]
        )
    for row_index in range(1 if header else 0, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#F8FAFC")))
    t.setStyle(TableStyle(commands))
    return t


def image_block(path: Path, caption: str, max_width: float = 17.0 * cm, max_height: float = 11.0 * cm):
    if not path.exists():
        return [p(f"Capture manquante : {path.name}", STYLES["Warn"])]
    with PILImage.open(path) as img:
        width_px, height_px = img.size
    ratio = min(max_width / width_px, max_height / height_px)
    rendered = Image(str(path), width=width_px * ratio, height=height_px * ratio)
    rendered.hAlign = "CENTER"
    return [
        rendered,
        Spacer(1, 0.12 * cm),
        p(caption, STYLES["Caption"]),
        Spacer(1, 0.35 * cm),
    ]


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(1.6 * cm, 1.05 * cm, "Alcide - Dossier jury Bloc 2 RNCP39583")
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.05 * cm, f"Page {doc.page}")
    canvas.restoreState()


def make_styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=32,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=14,
        )
    )
    base.add(
        ParagraphStyle(
            name="CoverSub",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#334155"),
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="H1Custom",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=16,
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="H2Custom",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#1E40AF"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    base.add(
        ParagraphStyle(
            name="BodySmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12.4,
            textColor=colors.HexColor("#111827"),
            spaceAfter=5,
        )
    )
    base.add(
        ParagraphStyle(
            name="TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.4,
            leading=9.4,
            textColor=colors.HexColor("#111827"),
        )
    )
    base.add(
        ParagraphStyle(
            name="Caption",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=8.2,
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475569"),
        )
    )
    base.add(
        ParagraphStyle(
            name="BadgeOk",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#166534"),
        )
    )
    base.add(
        ParagraphStyle(
            name="Warn",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#9A3412"),
        )
    )
    return base


STYLES = make_styles()


def build_story():
    story = []
    story.append(Spacer(1, 2.2 * cm))
    story.append(p("Dossier Jury - Bloc 2", STYLES["CoverTitle"]))
    story.append(p("RNCP39583 - Expert en développement logiciel", STYLES["CoverSub"]))
    story.append(p("Concevoir et développer des applications logicielles", STYLES["CoverSub"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(p("<b>Projet support :</b> Alcide, coach sportif IA personnalisé", STYLES["CoverSub"]))
    story.append(p("<b>Version :</b> 0.12.0 - <b>Date de validation :</b> 16 juillet 2026", STYLES["CoverSub"]))
    story.append(p("<b>Production Web :</b> https://ai-sport-web.vercel.app", STYLES["CoverSub"]))
    story.append(p("<b>Production API :</b> https://ai-sport-api.vercel.app", STYLES["CoverSub"]))
    story.append(Spacer(1, 1 * cm))
    story.append(
        table(
            [
                ["Décision", "Statut"],
                [
                    "Bloc 2 présentable au jury",
                    "Validable techniquement, avec preuves locales, production et visuelles consolidées.",
                ],
                [
                    "Fournisseur IA",
                    "OpenAI uniquement, clé gérée côté serveur. Aucun champ de clé API utilisateur.",
                ],
                [
                    "Points externes restants",
                    "Renouveler le secret GitHub VERCEL_TOKEN si le CD custom doit être vert ; durcir DATABASE_URL en sslmode=verify-full.",
                ],
            ],
            [5 * cm, 11.2 * cm],
            STYLES,
        )
    )
    story.append(PageBreak())

    story.append(p("1. Synthèse Exécutive", STYLES["H1Custom"]))
    story.append(
        p(
            "Ce dossier présente les éléments attendus du Bloc 2 pour Alcide : conception, développement, tests, "
            "sécurité, accessibilité, déploiement, recette et documentation d’exploitation. Les preuves ont été "
            "consolidées le 16 juillet 2026 à partir du code local, de la production Vercel, des logs OpenAI et "
            "des captures du navigateur connecté.",
            STYLES["BodySmall"],
        )
    )
    story.append(
        bullets(
            [
                "Application full-stack disponible : frontend Next.js, API Hono, PostgreSQL Neon, Drizzle, Auth.js et contrats Zod partagés.",
                "Production Web/API prête sur Vercel, version 0.12.0, healthchecks en HTTP 200.",
                "Génération de séance prouvée en production avec OpenAI côté serveur : deux POST /workouts/generate en 201.",
                "Tests unitaires, typecheck, build et coverage relancés avec succès.",
                "Captures des parcours clés : accueil, génération, détail/timer, dashboard, settings OpenAI, programme et historique.",
            ],
            STYLES,
        )
    )

    story.append(p("2. Conformité Point par Point", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Compétence", "Statut jury", "Preuves", "Action éventuelle"],
                [
                    "C2.1.1 Environnements de déploiement et de test",
                    "Fonctionnel",
                    "Healthchecks API/Web 200 ; Vercel READY ; version 0.12.0.",
                    "Aucune action bloquante.",
                ],
                [
                    "C2.1.2 Intégration continue",
                    "Fonctionnel avec action config",
                    "CI GitHub verte run 29489995458 ; monitoring production vert run 29496100988.",
                    "Renouveler VERCEL_TOKEN dans GitHub pour rendre le CD custom vert.",
                ],
                [
                    "C2.2.1 Prototype ergonomique et sécurisé",
                    "Fonctionnel",
                    "Routes production observées ; captures B2-A04 à B2-A07, B2-A17 et B2-A18.",
                    "Aucune, hors captures complémentaires si demandées.",
                ],
                [
                    "C2.2.2 Harnais de tests unitaires",
                    "Fonctionnel",
                    "70 tests API + 1 test Web passés ; coverage API 88.1% statements.",
                    "Relancer via pnpm quand l’environnement local pnpm est disponible.",
                ],
                [
                    "C2.2.3 Développement sécurisé, évolutif et accessible",
                    "Fonctionnel",
                    "SERVICE_SECRET, validation Zod, rate limiting, OpenAI serveur, smoke Playwright/axe documenté.",
                    "E2E generate.spec.ts complet optionnel si preuve navigateur exhaustive exigée.",
                ],
                [
                    "C2.3.1 Cahier de recettes",
                    "Fonctionnel",
                    "33 scénarios documentés, addendum production du 16 juillet.",
                    "CR-013 coupure IA réelle à rejouer seulement si demandé.",
                ],
                [
                    "C2.3.2 Plan de correction des bogues",
                    "Fonctionnel",
                    "Plan de correction relié aux anomalies et aux non-régressions.",
                    "Continuer à journaliser les corrections futures.",
                ],
                [
                    "C2.4.1 Documentation d’exploitation",
                    "Fonctionnel",
                    "Guide déploiement, CI/CD, manuel utilisateur, manuel mise à jour.",
                    "Mettre DATABASE_URL en sslmode=verify-full.",
                ],
            ],
            [2.9 * cm, 2.65 * cm, 6.6 * cm, 4.6 * cm],
            STYLES,
        )
    )

    story.append(p("3. Architecture et Choix Techniques", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Couche", "Technologie", "Rôle"],
                ["Frontend", "Next.js App Router", "Pages, Server Components, Server Actions, interface utilisateur."],
                ["API", "Hono", "Routes HTTP, contrôleurs, services métier, middlewares sécurité."],
                ["Contrats", "TypeScript + Zod", "Validation des entrées/sorties et typage partagé."],
                ["Données", "PostgreSQL Neon + Drizzle", "Persistance typée, migrations, repositories."],
                ["IA", "OpenAI côté serveur", "Génération de séances et programmes sans clé utilisateur."],
                ["Auth", "Auth.js + OAuth Google", "Session utilisateur et protection des routes."],
                ["Qualité", "Vitest + Playwright", "Tests unitaires, smoke E2E, accessibilité."],
            ],
            [3.2 * cm, 4.2 * cm, 9.2 * cm],
            STYLES,
        )
    )

    story.append(p("4. Preuves de Production", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Contrôle", "Résultat"],
                ["Web production", "https://ai-sport-web.vercel.app - HTTP 200, production disponible."],
                ["API production", "https://ai-sport-api.vercel.app/health - HTTP 200, version 0.12.0."],
                ["Health API", '200 - {"status":"ok","service":"alcide-api","version":"0.12.0"}'],
                ["Health Web", '200 - {"status":"ok","service":"alcide-web","version":"0.12.0"}'],
                ["OpenAI", "Logs API : POST /workouts/generate en 201 avec provider: 'openai' et durée < 7 secondes."],
                ["Protection API", "Appels directs sans secret interne en 401 attendus."],
            ],
            [4.1 * cm, 12.5 * cm],
            STYLES,
        )
    )

    story.append(p("5. Qualité, Tests et Build", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Contrôle", "Résultat"],
                ["Tests API Vitest", "12 fichiers, 70 tests passés."],
                ["Tests Web Vitest", "1 fichier, 1 test passé."],
                ["Coverage API", "88.1% statements, 79.34% branches, 95.08% functions, 88.1% lines."],
                ["TypeScript", "API, Web et shared OK."],
                ["Build", "API OK ; Web Next.js OK, 12 pages générées."],
                ["Whitespace", "git diff --check OK."],
                ["CI GitHub", "CI - Alcide verte sur le commit 533f17be8fd50cfef3c60b3792a549a6ad80c386, run 29489995458."],
            ],
            [4.1 * cm, 12.5 * cm],
            STYLES,
        )
    )

    story.append(p("6. Sécurité, Accessibilité et Données", STYLES["H1Custom"]))
    story.append(
        bullets(
            [
                "OpenAI est le seul fournisseur IA ; la clé est configurée côté serveur dans l’API, jamais saisie par l’utilisateur.",
                "Les appels API internes sont protégés par SERVICE_SECRET entre Web et API.",
                "Les entrées utilisateur sont validées par Zod côté client/serveur selon les parcours.",
                "Drizzle limite les risques d’injection SQL via requêtes typées et paramétrées.",
                "Le rate limiting protège les routes de génération IA.",
                "L’interface prévoit labels, messages d’erreur, focus visible, skip link, aria-live et aria-busy.",
            ],
            STYLES,
        )
    )

    story.append(p("7. Recette Fonctionnelle", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Famille", "Statut", "Éléments validés"],
                ["Authentification", "Validé", "Connexion Google, routes protégées, déconnexion, navigation session-aware."],
                ["Génération entraînement", "Validé", "Formulaire, validation, génération OpenAI, redirection détail."],
                ["Consultation et timer", "Validé", "Liste, détail, timer, pause/reprise, suppression, 404."],
                ["Sécurité", "Validé", "Injection SQL, XSS, clé OpenAI non exposée, secret interne non exposé."],
                ["Healthchecks", "Validé", "API et Web en 200 avec JSON conforme."],
                ["Dashboard", "Validé", "Indicateurs, dernières séances, statistiques."],
                ["Erreur OpenAI CR-013", "Partiel assumé", "Couvert par tests unitaires ; coupure réelle à rejouer si le jury exige la preuve."],
            ],
            [3.6 * cm, 3.0 * cm, 10.0 * cm],
            STYLES,
        )
    )

    story.append(PageBreak())
    story.append(p("8. Captures du Prototype", STYLES["H1Custom"]))
    captures = [
        ("B2-A04-accueil-connecte-production-2026-07-15.png", "B2-A04 - Accueil connecté en production."),
        ("B2-A05-generation-seance-production-2026-07-15.png", "B2-A05 - Formulaire de génération de séance, modèle OpenAI affiché, aucun champ de clé API utilisateur."),
        ("B2-A06-detail-timer-production-2026-07-15.png", "B2-A06 - Détail séance et zone timer."),
        ("B2-A07-dashboard-production-2026-07-15.png", "B2-A07 - Dashboard progression utilisateur."),
        ("B2-A17-settings-openai-production-2026-07-15.png", "B2-A17 - Paramètres : OpenAI côté serveur, clé gérée par l’API."),
        ("B2-A17-generation-programme-production-2026-07-15.png", "B2-A17 - Formulaire de génération programme."),
        ("B2-A17-historique-workouts-production-2026-07-15.png", "B2-A17 - Historique des séances avec filtres."),
        ("B2-A18-generation-seance-after-wait-production-2026-07-16.png", "B2-A18 - Séance générée réellement en production, détail et timer visibles."),
        ("B2-A18-generation-programme-current-production-2026-07-16.png", "B2-A18 - Programme généré réellement en production, 9 séances planifiées."),
    ]
    for file_name, caption in captures:
        story.extend(image_block(SCREENSHOTS / file_name, caption))

    story.append(PageBreak())
    story.append(p("9. Annexes et Traçabilité", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Annexe", "Contenu"],
                ["B2-A08", "Sortie tests unitaires du 30 juin 2026."],
                ["B2-A09", "Coverage API du 30 juin 2026."],
                ["B2-A10", "Smoke Playwright et accessibilité."],
                ["B2-A11", "Audit sécurité."],
                ["B2-A16", "Qualité build, lint et typecheck."],
                ["B2-A17", "Validation historique production OpenAI, Vercel, CI, captures, tests et points de configuration."],
                ["B2-A18", "Validation finale post-fix Vercel du 2026-07-16 : CI main verte, monitoring vert, générations réelles."],
            ],
            [3.2 * cm, 13.4 * cm],
            STYLES,
        )
    )
    story.append(p("Documents sources à conserver avec ce PDF", STYLES["H2Custom"]))
    story.append(
        bullets(
            [
                "docs/rncp/bloc2-dossier-conception-developpement-rncp39583.md",
                "docs/rncp/bloc2-suivi-orchestration-rncp39583.md",
                "docs/bloc2/cahier-recettes.md",
                "docs/rncp/bloc2-annexes/index.md",
                "docs/rncp/bloc2-annexes/B2-A17-validation-finale-production-openai-2026-07-15.md",
                "docs/rncp/bloc2-annexes/B2-A18-validation-post-fix-vercel-2026-07-16.md",
            ],
            STYLES,
        )
    )

    story.append(p("10. Points à Configurer Côté Projet", STYLES["H1Custom"]))
    story.append(
        table(
            [
                ["Point", "Responsable", "Pourquoi", "Blocage jury"],
                [
                    "Renouveler GitHub secret VERCEL_TOKEN",
                    "Kevin / propriétaire Vercel",
                    "Le workflow CD - Vercel échoue avec token invalide.",
                    "Non bloquant pour la prod actuelle, utile pour chaîne CD 100% verte.",
                ],
                [
                    "Vérifier PROD_API_HEALTH_URL et PROD_WEB_HEALTH_URL",
                    "Kevin / GitHub repo variables",
                    "Éviter que le monitoring pointe vers d’anciens domaines.",
                    "Non bloquant après correction du workflow, à vérifier dans GitHub.",
                ],
                [
                    "Mettre DATABASE_URL en sslmode=verify-full",
                    "Kevin / Vercel-Neon",
                    "Durcissement SSL explicite pour éviter les warnings PostgreSQL.",
                    "Non bloquant court terme.",
                ],
                [
                    "Générer un programme en production",
                    "Optionnel",
                    "Ajouter une preuve manuelle complémentaire ; consomme OpenAI et crée une donnée.",
                    "Non bloquant, service couvert par tests.",
                ],
            ],
            [3.4 * cm, 3.2 * cm, 6.2 * cm, 3.8 * cm],
            STYLES,
        )
    )
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        p(
            "Conclusion : le Bloc 2 est prêt à être remis au jury avec une position transparente : "
            "le périmètre fonctionnel est validé, les preuves essentielles sont jointes, et les actions restantes relèvent "
            "de la configuration externe ou de preuves optionnelles supplémentaires.",
            STYLES["BadgeOk"],
        )
    )
    return story


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        rightMargin=1.6 * cm,
        leftMargin=1.6 * cm,
        topMargin=1.55 * cm,
        bottomMargin=1.55 * cm,
        title="Dossier Jury Bloc 2 RNCP39583 - Alcide",
        author="Alcide / Kevin",
    )
    story = build_story()
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(OUT_PDF)


if __name__ == "__main__":
    main()
