"""Build the jury-facing evidence annexes for RNCP39583 Bloc 4."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = (
    ROOT
    / "output"
    / "pdf"
    / "BLOC-4-A-RENDRE"
    / "02-annexes-preuves-bloc-4.pdf"
)

NAVY = colors.HexColor("#102A43")
BLUE = colors.HexColor("#20639B")
TEAL = colors.HexColor("#168F8B")
GREY = colors.HexColor("#52606D")
LIGHT_GREY = colors.HexColor("#F2F4F6")
PALE_TEAL = colors.HexColor("#E8F6F3")
PALE_BLUE = colors.HexColor("#EAF3F8")

REPOSITORY = "https://github.com/Kevinmrgt/aiSport"
RUN_PRODUCTION = f"{REPOSITORY}/actions/runs/32104085103"
RUN_INCIDENT = f"{REPOSITORY}/actions/runs/29828343175"
RUN_INCIDENT_RECOVERY = f"{REPOSITORY}/actions/runs/29838832861"
RUN_SIMULATION = f"{REPOSITORY}/actions/runs/30348338556"
RUN_SIMULATION_RECOVERY = f"{REPOSITORY}/actions/runs/30348419565"
ISSUE_42 = f"{REPOSITORY}/issues/42"
ISSUE_64 = f"{REPOSITORY}/issues/64"
ISSUE_11 = f"{REPOSITORY}/issues/11"
ISSUE_12 = f"{REPOSITORY}/issues/12"
PR_10 = f"{REPOSITORY}/pull/10"
CI_PR_10 = f"{REPOSITORY}/actions/runs/25493414133"


def safe(text: str) -> str:
    replacements = {
        "\u2011": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u2192": "->",
        "\u2264": "<=",
        "\u2265": ">=",
        "\u00a0": " ",
    }
    return text.translate(str.maketrans(replacements))


def make_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "AnnexTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=28,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=7 * mm,
        ),
        "subtitle": ParagraphStyle(
            "AnnexSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=GREY,
            alignment=TA_CENTER,
            spaceAfter=6 * mm,
        ),
        "h1": ParagraphStyle(
            "AnnexH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=NAVY,
            spaceAfter=3.5 * mm,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "AnnexH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=BLUE,
            spaceBefore=2.5 * mm,
            spaceAfter=1.5 * mm,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "AnnexBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11.8,
            textColor=colors.HexColor("#243B53"),
            spaceAfter=2.2 * mm,
        ),
        "small": ParagraphStyle(
            "AnnexSmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=GREY,
        ),
        "table": ParagraphStyle(
            "AnnexTable",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.25,
            leading=9.1,
            textColor=colors.HexColor("#243B53"),
        ),
        "table_head": ParagraphStyle(
            "AnnexTableHead",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=8.9,
            textColor=colors.white,
        ),
        "code": ParagraphStyle(
            "AnnexCode",
            parent=styles["Code"],
            fontName="Courier",
            fontSize=6.5,
            leading=8.4,
            textColor=colors.HexColor("#243B53"),
            backColor=LIGHT_GREY,
            borderColor=colors.HexColor("#CBD2D9"),
            borderWidth=0.4,
            borderPadding=2.5 * mm,
            spaceAfter=2.5 * mm,
        ),
        "callout": ParagraphStyle(
            "AnnexCallout",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.8,
            leading=11.8,
            textColor=NAVY,
        ),
    }


STYLES = make_styles()


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(safe(text), STYLES[style])


def bullet(text: str) -> Paragraph:
    style = ParagraphStyle(
        "AnnexBullet",
        parent=STYLES["body"],
        leftIndent=5 * mm,
        firstLineIndent=-4 * mm,
    )
    return Paragraph(safe(f"- {text}"), style)


def link(label: str, url: str) -> str:
    return f"<a href='{url}' color='#20639B'><u>{label}</u></a>"


def evidence_table(headers: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    data = [[p(header, "table_head") for header in headers]]
    data.extend([[p(cell, "table") for cell in row] for row in rows])
    result = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD2D9")),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.1 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.1 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.6 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6 * mm),
    ]
    for row_number in range(1, len(data)):
        if row_number % 2 == 0:
            commands.append(("BACKGROUND", (0, row_number), (-1, row_number), LIGHT_GREY))
    result.setStyle(TableStyle(commands))
    return result


def callout(title: str, text: str, color=PALE_TEAL) -> Table:
    item = Table([[p(f"{title}<br/>{text}", "callout")]], colWidths=[181 * mm])
    item.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 0.5, TEAL),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    return item


def annex(title: str, items: list, *, page_break: bool = True) -> list:
    flowables = [
        p(title, "h1"),
        HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=3 * mm),
        *items,
    ]
    if page_break:
        flowables.append(PageBreak())
    return flowables


class AnnexNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.saved_page_states = []

    def showPage(self):
        self.saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self.saved_page_states)
        for state in self.saved_page_states:
            self.__dict__.update(state)
            self.setStrokeColor(colors.HexColor("#D9E2EC"))
            self.line(14 * mm, 13 * mm, 196 * mm, 13 * mm)
            self.setFont("Helvetica", 7.5)
            self.setFillColor(GREY)
            self.drawString(14 * mm, 8.5 * mm, "Alcide - RNCP39583 - Bloc 4 - Annexes de preuve")
            self.drawRightString(196 * mm, 8.5 * mm, f"Annexes p. {self._pageNumber} / {page_count}")
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)


def build_story() -> list:
    story: list = []

    story.extend(
        [
            Spacer(1, 20 * mm),
            p("ANNEXES DE PREUVE", "subtitle"),
            p("Bloc 4 - Maintenir l'application en condition opérationnelle", "title"),
            p("Projet Alcide - RNCP39583 - État des preuves : 18 août 2026", "subtitle"),
            Spacer(1, 3 * mm),
            callout(
                "Fichier à joindre au dossier principal",
                "02-annexes-preuves-bloc-4.pdf. Toutes les preuves sont regroupées ici et numérotées A1 à A8.",
            ),
            Spacer(1, 6 * mm),
            p("Mode de lecture", "h2"),
            bullet("Le dossier principal renvoie à ces annexes par leur numéro A1 à A8."),
            bullet("Les liens bleus ouvrent la preuve correspondante dans le dépôt GitHub public."),
            bullet("Les résultats et payloads utiles sont reproduits dans ces pages afin d'éviter au jury de parcourir l'arborescence du projet."),
            bullet("Les incidents réels et les simulations sont explicitement distingués."),
            Spacer(1, 5 * mm),
            p("Dépôt de référence", "h2"),
            p(link("github.com/Kevinmrgt/aiSport", REPOSITORY)),
            PageBreak(),
        ]
    )

    story.extend(
        annex(
            "A1 - Index et correspondance des preuves",
            [
                p(
                    "Cet index est le point d'entrée unique. Il relie les compétences du Bloc 4 aux preuves détaillées dans les annexes suivantes."
                ),
                evidence_table(
                    ["Compétence / attendu", "Annexe", "Preuves regroupées"],
                    [
                        ["C4.1.1 - Dépendances", "A5 et A7", "Issue #11, correctif, audit de sécurité, PR #10 et CI verte."],
                        ["C4.1.2 - Supervision et alerte", "A2 à A4", "Run réel, artefact, incident réel #42 et simulation sûre #64."],
                        ["C4.2.1 - Collecte d'anomalies", "A3 et A5", "Issues structurées, processus d'incident et fiches BUG."],
                        ["C4.2.2 - Correction et livraison", "A5 et A7", "Correctifs, contrôles, PR fusionnée et pipeline CI/CD."],
                        ["C4.3.2 - Versions et traçabilité", "A8", "CHANGELOG, versions rc.2 à rc.8, matrice et healthchecks versionnés."],
                        ["C4.3.3 - Support", "A6", "Cas support #12, diagnostic, rôles et validation."],
                    ],
                    [54 * mm, 27 * mm, 100 * mm],
                ),
                p("Répertoire logique", "h2"),
                evidence_table(
                    ["Référence", "Contenu", "Nature"],
                    [
                        ["A2", "Monitoring de production du 18/08/2026 et payloads API/Web", "Exécution réelle"],
                        ["A3", "Incident API HTTP 503 du 21/07/2026 et reprise", "Incident réel"],
                        ["A4", "Cycle alerte/reprise du 28/07/2026", "Simulation déclarée, sans impact"],
                        ["A5", "Anomalies de dépendances, couverture CI et encodage", "Tickets et fiches de maintenance"],
                        ["A6", "Génération IA longue sur programme de huit semaines", "Mise en situation support déclarée"],
                        ["A7", "Outillage MCO, PR #10 et contrôles CI", "Changement fusionné"],
                        ["A8", "Journal des versions, procédures et fichiers sources", "Traçabilité documentaire"],
                    ],
                    [25 * mm, 112 * mm, 44 * mm],
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A2 - Monitoring de production réel du 18 août 2026",
            [
                callout(
                    "Nature de la preuve",
                    "Exécution planifiée réelle du workflow Monitoring - Production health. Conclusion : succès.",
                    PALE_BLUE,
                ),
                Spacer(1, 3 * mm),
                evidence_table(
                    ["Champ", "Valeur vérifiée"],
                    [
                        ["Run", f"32104085103 - {link('ouvrir dans GitHub Actions', RUN_PRODUCTION)}"],
                        ["Déclencheur", "schedule ; exécution planifiée"],
                        ["Commit contrôlé", "36f5073a578a69524cb8dd750f068b91a393815f"],
                        ["Job", "Check production health endpoints - succès"],
                        ["Étapes", "API : succès ; Web : succès ; upload du rapport : succès ; fermeture d'un incident rétabli : succès"],
                        ["Artefact", "production-health-report ; disponible jusqu'au 16/11/2026"],
                    ],
                    [45 * mm, 136 * mm],
                ),
                p("Rapport téléchargé depuis l'artefact", "h2"),
                p(
                    "Checked at: 2026-08-18T05:45:06Z - mode production. API : https://ai-sport-api.vercel.app/health/ready. "
                    "Web : https://ai-sport-web.vercel.app/api/health."
                ),
                p("Payload API - HTTP 200", "h2"),
                p(
                    '{"status":"ready","service":"alcide-api","timestamp":"2026-08-18T05:45:09.362Z",'
                    '"version":"0.13.0-rc.8","checks":{"database":"ok","aiConfiguration":"ok"}}',
                    "code",
                ),
                p("Payload Web - HTTP 200", "h2"),
                p(
                    '{"status":"ok","service":"alcide-web","timestamp":"2026-08-18T05:45:10.448Z",'
                    '"version":"0.13.0-rc.8"}',
                    "code",
                ),
                p(
                    "Lecture : au même instant, l'API est prête, la base et la configuration IA sont déclarées opérationnelles, "
                    "le Web répond correctement et les deux services exposent la version 0.13.0-rc.8."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A3 - Incident réel #42 : API indisponible puis rétablie",
            [
                callout(
                    "Incident réel",
                    "Le 21 juillet 2026, le monitoring a obtenu HTTP 503 sur la readiness API tandis que le Web répondait HTTP 200.",
                    colors.HexColor("#FFF5DF"),
                ),
                Spacer(1, 3 * mm),
                evidence_table(
                    ["Événement", "Trace factuelle"],
                    [
                        ["Détection", f"Run 29828343175 - {link('ouvrir le run', RUN_INCIDENT)}"],
                        ["Consignation", f"Issue #42, créée le 21/07/2026 à 12:00:56Z - {link('ouvrir l’issue', ISSUE_42)}"],
                        ["Signal", "API readiness : HTTP 503 ; Web health : HTTP 200 ; version Web rc.3."],
                        ["Reprise", f"Run 29838832861 - {link('ouvrir le run de rétablissement', RUN_INCIDENT_RECOVERY)}"],
                        ["Automatisation", "Commentaires de rétablissement ajoutés par le workflow, puis fermeture automatique."],
                        ["Clôture", "Issue fermée le 21/07/2026 à 14:23:13Z."],
                    ],
                    [45 * mm, 136 * mm],
                ),
                p("Chaîne de preuve", "h2"),
                bullet("La sonde échoue et conserve le rapport d'exécution."),
                bullet("Le workflow ouvre ou met à jour une issue de monitoring."),
                bullet("Une exécution ultérieure réussit et publie le message de rétablissement."),
                bullet("Le même automatisme clôt l'incident récupéré."),
                p(
                    "Cette annexe prouve un cycle complet détecter -> consigner -> rétablir -> clôturer sur un incident effectivement observé. "
                    "Elle ne doit pas être confondue avec la simulation A4."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A4 - Simulation sûre du circuit d'alerte et de reprise",
            [
                callout(
                    "Simulation déclarée",
                    "Le scénario du 28 juillet 2026 est volontaire. Les endpoints de production n'ont pas été sondés ni modifiés par cette simulation.",
                    PALE_BLUE,
                ),
                Spacer(1, 3 * mm),
                evidence_table(
                    ["Élément", "Preuve"],
                    [
                        ["Issue", f"#64 [TEST] Production healthcheck alert simulation - {link('ouvrir l’issue', ISSUE_64)}"],
                        ["Alerte simulée", f"Run 30348338556, job simulate_alert - {link('ouvrir le run', RUN_SIMULATION)}"],
                        ["Résultat attendu", "Échec volontaire, artefact téléversé et issue de test créée/mise à jour."],
                        ["Reprise simulée", f"Run 30348419565, job simulate_recovery - {link('ouvrir le run', RUN_SIMULATION_RECOVERY)}"],
                        ["Résultat attendu", "Succès de reprise, commentaire automatique et fermeture de l'issue #64."],
                        ["Clôture", "Issue fermée le 28/07/2026 à 09:52:45Z."],
                    ],
                    [49 * mm, 132 * mm],
                ),
                p("Finalité", "h2"),
                p(
                    "La simulation valide la mécanique GitHub Actions -> artefact -> issue -> commentaire de reprise -> clôture, "
                    "sans provoquer une interruption de service. L'incident réel de référence reste l'issue #42 présentée en A3."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A5 - Anomalies et traitements de maintenance",
            [
                p("A5.1 - Issue #11 : dépendances à risque", "h2"),
                evidence_table(
                    ["Rubrique", "Éléments consignés"],
                    [
                        ["Ticket", f"[BUG-003] Audit dependances high Next.js/glob - {link('ouvrir l’issue #11', ISSUE_11)}"],
                        ["Qualification", "Créée le 07/05/2026 ; labels Bloc 4, bug, triage et priorité P1."],
                        ["Constat", "Audit high : 12 vulnérabilités, dont 3 high ; Next.js 14.2.35 et glob concernés."],
                        ["Correctif", "PR #10, commit a59f25a ; next et eslint-config-next mis à jour vers 15.5.15."],
                        ["Validation", "Audit high code retour 0, typecheck, lint, tests, build et CI PR #10 verts."],
                    ],
                    [39 * mm, 142 * mm],
                ),
                p("A5.2 - BUG-001 : seuil de couverture CI", "h2"),
                evidence_table(
                    ["Rubrique", "Trace locale versionnée"],
                    [
                        ["Fichier", "docs/bloc4/bugs/BUG-001-coverage-threshold.md"],
                        ["Incident historique", "13/04/2026 : 54,21 % de statements, sous le seuil de 70 %, donc pipeline bloqué."],
                        ["Traitement", "Ajout/correction des tests puis résultat historique documenté à 96,08 % et pipeline passant."],
                        ["Portée", "Preuve MCO historique ; le document indique honnêtement qu'elle ne suffit pas seule pour un autre bloc de compétences."],
                    ],
                    [39 * mm, 142 * mm],
                ),
                p("A5.3 - BUG-002 : README encodé en UTF-16", "h2"),
                evidence_table(
                    ["Rubrique", "Trace locale versionnée"],
                    [
                        ["Fichier", "docs/bloc4/bugs/BUG-002-readme-utf16.md"],
                        ["Impact", "README illisible ou affiché avec des caractères parasites sur GitHub."],
                        ["Cause", "Encodage Windows UTF-16 LE au lieu d'UTF-8."],
                        ["Correctif", "Réécriture en UTF-8 sans BOM."],
                        ["Validation / prévention", "Contrôle des premiers octets et de la lisibilité ; recommandation .gitattributes et contrôle avant commit."],
                    ],
                    [39 * mm, 142 * mm],
                ),
                p(
                    "Ces trois cas couvrent une vulnérabilité de dépendance, un garde-fou CI et une anomalie documentaire. "
                    "Chaque cas décrit constat, cause, correction et validation sans présenter un brouillon comme une exécution réelle."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A6 - Cas support #12 : génération IA perçue comme longue",
            [
                callout(
                    "Statut de la preuve",
                    "Mise en situation utilisateur déclarée, documentée le 7 mai 2026. Ce cas n'est pas présenté comme un ticket client contractuel.",
                    PALE_BLUE,
                ),
                Spacer(1, 3 * mm),
                evidence_table(
                    ["Rubrique", "Éléments du cas support"],
                    [
                        ["Ticket", f"[SUPPORT] Generation IA trop longue sur programme 8 semaines - {link('ouvrir l’issue #12', ISSUE_12)}"],
                        ["Signal utilisateur", "La génération paraît longue ou incertaine ; l'utilisateur ne sait pas si le traitement progresse."],
                        ["Diagnostic technique", "Parcours concerné, logs de durée/tentatives/fournisseur, timeout et retry, validation Zod et healthchecks."],
                        ["Rôles", "Utilisateur pilote : signal ; support : reformulation et collecte ; mainteneur : analyse/correction ; commanditaire : arbitrage."],
                        ["Réponse", "Contrôles techniques, recommandations de communication d'attente et traçabilité du diagnostic."],
                        ["Validation associée", "Monitoring 25493630663, PR #10 fusionnée, CI verte et audit de dépendances corrigé via issue #11/commit a59f25a."],
                    ],
                    [43 * mm, 138 * mm],
                ),
                p("Contribution à C4.3.3", "h2"),
                p(
                    "Le cas formalise l'échange entre utilisateur, support, mainteneur et commanditaire. Il montre comment un symptôme métier "
                    "est transformé en contrôles techniques, décision de maintenance et critères de validation."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A7 - PR #10, outillage MCO et pipeline de validation",
            [
                evidence_table(
                    ["Champ", "Preuve GitHub"],
                    [
                        ["Pull request", f"#10 Set up RNCP Bloc 4 MCO tooling - {link('ouvrir la PR', PR_10)}"],
                        ["État", "Fusionnée le 07/05/2026 à 11:41:42Z."],
                        ["Commit de fusion", "9d49ee8bffc387deae2ef3c18be723203bcafdc6"],
                        ["Apports", "Workflow de monitoring, templates d'issue, checklist de PR, documentation MCO, healthchecks/version et en-têtes no-store."],
                        ["Run CI", f"25493414133 - {link('ouvrir les contrôles', CI_PR_10)}"],
                    ],
                    [44 * mm, 137 * mm],
                ),
                p("Contrôles passés", "h2"),
                evidence_table(
                    ["Contrôle", "Résultat"],
                    [
                        ["Lint et typecheck", "SUCCESS"],
                        ["Audit de sécurité", "SUCCESS"],
                        ["Tests unitaires et couverture", "SUCCESS"],
                        ["Tests end-to-end", "SUCCESS"],
                        ["Build", "SUCCESS"],
                        ["Construction Docker", "SUCCESS"],
                        ["Prévisualisations Vercel", "SUCCESS"],
                    ],
                    [78 * mm, 103 * mm],
                ),
                p("Lecture", "h2"),
                p(
                    "La preuve associe le changement versionné, sa revue, son commit de fusion et ses garde-fous automatiques. "
                    "Elle soutient la mise à jour sécurisée des dépendances et le passage d'un correctif par l'intégration continue."
                ),
            ],
        )
    )

    story.extend(
        annex(
            "A8 - Journal des versions et carte des fichiers sources",
            [
                p("Versions maintenues", "h2"),
                evidence_table(
                    ["Version", "Date", "Éléments de maintenance"],
                    [
                        ["0.13.0-rc.8", "23/07/2026", "Interface simplifiée et informations techniques IA retirées de l'interface utilisateur."],
                        ["0.13.0-rc.7", "23/07/2026", "Quota jury persistant, réservation atomique et refus HTTP 429 au-delà de la limite."],
                        ["0.13.0-rc.5", "22/07/2026", "Accessibilité, dépendances, tests, CI/CD et healthchecks de production."],
                        ["0.13.0-rc.2", "20/07/2026", "Readiness API, monitoring GitHub, templates Bloc 4 et healthchecks non cacheables."],
                    ],
                    [34 * mm, 34 * mm, 113 * mm],
                ),
                p("Fichiers de référence dans le dépôt", "h2"),
                evidence_table(
                    ["Objet", "Emplacement versionné"],
                    [
                        ["Journal des versions", "CHANGELOG.md"],
                        ["Workflow de monitoring", ".github/workflows/production-health-monitor.yml"],
                        ["Template anomalie", ".github/ISSUE_TEMPLATE/anomaly_report.yml"],
                        ["Template support", ".github/ISSUE_TEMPLATE/support_case.yml"],
                        ["Processus incidents", "docs/rncp/bloc4-processus-incidents.md"],
                        ["Runbook maintenance", "docs/rncp/bloc4-runbook-maintenance.md"],
                        ["Description supervision", "docs/rncp/bloc4-supervision-preuve.md"],
                        ["Matrice de traçabilité", "docs/rncp/bloc4-annexes/C4.3.2-matrice-tracabilite-maintenance.md"],
                        ["Modèle ticket anomalie", "docs/rncp/bloc4-annexes/C4.2.1-modele-ticket-anomalie-github.md"],
                        ["Modèle cas support", "docs/rncp/bloc4-annexes/C4.3.3-modele-cas-support-github.md"],
                    ],
                    [58 * mm, 123 * mm],
                ),
                p("Accès", "h2"),
                p(
                    f"Tous ces fichiers sont consultables depuis {link('la racine du dépôt GitHub', REPOSITORY)}. "
                    "Le jury peut vérifier l'historique des commits, les dates, les issues et les exécutions sans chercher des pièces dans plusieurs dossiers de remise."
                ),
                callout(
                    "Fin des annexes",
                    "Les annexes A1 à A8 constituent le paquet complet de preuves cité par le dossier principal.",
                ),
            ],
            page_break=False,
        )
    )

    return story


def build() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=19 * mm,
        title="RNCP39583 Bloc 4 - Alcide - Annexes de preuve",
        author="Kevin",
        subject="Annexes A1 à A8 du dossier Bloc 4",
    )
    document.build(build_story(), canvasmaker=AnnexNumberedCanvas)
    page_count = len(PdfReader(str(OUTPUT)).pages)
    print(f"Built {OUTPUT} ({page_count} pages).")
    return page_count


if __name__ == "__main__":
    build()
