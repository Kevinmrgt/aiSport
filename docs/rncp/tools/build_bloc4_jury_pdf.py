"""Build the concise, jury-facing RNCP39583 Bloc 4 dossier.

The report deliberately distinguishes versioned configuration from screenshots
and runs that must be collected in GitHub before the final submission.
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "output" / "pdf" / "dossier-bloc4-rncp39583-alcide-2026-07-28.pdf"
MAX_PAGES = 20

NAVY = colors.HexColor("#102A43")
BLUE = colors.HexColor("#20639B")
TEAL = colors.HexColor("#168F8B")
PALE_BLUE = colors.HexColor("#EAF3F8")
PALE_TEAL = colors.HexColor("#E8F6F3")
PALE_AMBER = colors.HexColor("#FFF5DF")
GREY = colors.HexColor("#52606D")
LIGHT_GREY = colors.HexColor("#F2F4F6")


def safe(text: str) -> str:
    """Keep the built-in Helvetica font and PDF text extraction predictable."""
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
            "Bloc4Title",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=8 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Bloc4Subtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11.5,
            leading=16,
            textColor=GREY,
            alignment=TA_CENTER,
            spaceAfter=7 * mm,
        ),
        "h1": ParagraphStyle(
            "Bloc4H1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=NAVY,
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Bloc4H2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=BLUE,
            spaceBefore=3 * mm,
            spaceAfter=2 * mm,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Bloc4Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.15,
            leading=12.2,
            textColor=colors.HexColor("#243B53"),
            spaceAfter=2.4 * mm,
        ),
        "small": ParagraphStyle(
            "Bloc4Small",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            textColor=GREY,
        ),
        "table": ParagraphStyle(
            "Bloc4Table",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.55,
            leading=9.4,
            textColor=colors.HexColor("#243B53"),
        ),
        "table_head": ParagraphStyle(
            "Bloc4TableHead",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.45,
            leading=9.1,
            textColor=colors.white,
        ),
        "callout": ParagraphStyle(
            "Bloc4Callout",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.1,
            leading=12.2,
            textColor=NAVY,
        ),
    }


STYLES = make_styles()


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(safe(text), STYLES[style])


def bullet(text: str) -> Paragraph:
    bullet_style = ParagraphStyle(
        "Bloc4Bullet",
        parent=STYLES["body"],
        leftIndent=5 * mm,
        firstLineIndent=-4 * mm,
    )
    return Paragraph(safe(f"- {text}"), bullet_style)


def section(title: str, items: list) -> list:
    return [
        p(title, "h1"),
        HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=3 * mm),
        *items,
        PageBreak(),
    ]


def callout(title: str, text: str, color: colors.Color = PALE_TEAL) -> Table:
    table = Table([[p(f"{title}<br/>{text}", "callout")]], colWidths=[181 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 0.55, TEAL),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    return table


def table(headers: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    data = [[p(header, "table_head") for header in headers]]
    data.extend([[p(cell, "table") for cell in row] for row in rows])
    result = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD2D9")),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
    ]
    for row in range(1, len(data)):
        if row % 2 == 0:
            commands.append(("BACKGROUND", (0, row), (-1, row), LIGHT_GREY))
    result.setStyle(TableStyle(commands))
    return result


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
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
            self.setFont("Helvetica", 7.6)
            self.setFillColor(GREY)
            self.drawString(14 * mm, 8.5 * mm, "Alcide - RNCP39583 - Bloc 4 - Dossier jury")
            page_label = f"Page {self._pageNumber} / {page_count}"
            self.drawRightString(196 * mm, 8.5 * mm, page_label)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)


def build_story() -> list:
    story: list = []

    story.extend(
        [
            Spacer(1, 30 * mm),
            p("BLOC 4", "subtitle"),
            p("Maintenir l'application logicielle en condition opérationnelle", "title"),
            p("Dossier jury - RNCP39583 Expert en développement logiciel", "subtitle"),
            Spacer(1, 6 * mm),
            callout(
                "Projet Alcide",
                "Application web de génération d'entraînements et programmes sportifs personnalisés. "
                "Candidat : Kevin. Référence documentaire : 0.13.0-rc.3. État : 28 juillet 2026.",
            ),
            Spacer(1, 10 * mm),
            p("Objet du dossier", "h2"),
            p(
                "Ce dossier présente le monitoring, le traitement des anomalies et la maintenance de l'application. "
                "Il distingue les mécanismes versionnés dans le dépôt des preuves d'exécution à joindre avant remise."
            ),
            p("Limite de diffusion", "h2"),
            p(
                "Les captures, URLs de runs GitHub, numéros d'issues et retours utilisateur ne sont renseignés que lorsqu'ils existent réellement. "
                "Toute mise en situation est identifiée explicitement comme une simulation déclarée."
            ),
            Spacer(1, 20 * mm),
            p("Livrable écrit individuel - 20 pages maximum", "subtitle"),
            PageBreak(),
        ]
    )

    story.extend(
        section(
            "1. Exigences et périmètre MCO",
            [
                p(
                    "Le Bloc 4 évalue la maintenance d'un logiciel développé pendant la formation : mises à jour, supervision, "
                    "consignation et correction des anomalies, évolutions, versions et collaboration avec le support."
                ),
                table(
                    ["Compétence", "Attendu évalué", "Réponse Alcide"],
                    [
                        [
                            "C4.1.1",
                            "Mettre à jour les dépendances de manière sécurisée.",
                            "Dependabot, audit, CI et procédure de qualification/rollback.",
                        ],
                        [
                            "C4.1.2*",
                            "Supervision, indicateurs, sondes, seuils et signalement.",
                            "Readiness API, healthcheck Web, monitoring GitHub horaire, artefact et issue automatique.",
                        ],
                        [
                            "C4.2.1*",
                            "Collecter, consigner et analyser une anomalie.",
                            "Processus d'incident, templates GitHub et fiches BUG documentées.",
                        ],
                        [
                            "C4.2.2",
                            "Corriger et déployer via l'intégration et le déploiement continu.",
                            "PR checklist, CI/CD, smoke tests et rollback Vercel documentés.",
                        ],
                        [
                            "C4.3.2*",
                            "Établir un journal des versions et des correctifs.",
                            "CHANGELOG versionné, matrice de traçabilité maintenance.",
                        ],
                        [
                            "C4.3.3",
                            "Collaborer avec le support sur un problème complexe.",
                            "Template support et cas pilote à présenter comme réel ou simulation déclarée.",
                        ],
                    ],
                    [27 * mm, 67 * mm, 87 * mm],
                ),
                Spacer(1, 3 * mm),
                p("* Compétence éliminatoire selon le règlement de certification.", "small"),
                p("Architecture de production", "h2"),
                table(
                    ["Composant", "Rôle", "Point de maintenance"],
                    [
                        ["Web Next.js", "Interface utilisateur et OAuth", "Healthcheck /api/health, erreurs d'authentification, version."],
                        ["API Hono", "Logique métier, IA, accès aux données", "Liveness /health et readiness /health/ready."],
                        ["Neon PostgreSQL", "Persistance et migrations Drizzle", "Disponibilité, erreurs de connexion, branche/backup avant migration."],
                        ["Vercel + GitHub Actions", "Déploiement et contrôles", "CI, CD, smoke tests, monitoring et rollback."],
                    ],
                    [33 * mm, 53 * mm, 95 * mm],
                ),
            ],
        )
    )

    story.extend(
        section(
            "2. Mises à jour des dépendances",
            [
                p(
                    "La maintenance des dépendances couvre les packages npm et les GitHub Actions. Dependabot est configuré "
                    "pour ouvrir des propositions hebdomadaires ; le lockfile assure la reproductibilité. Une mise à jour n'est "
                    "intégrée qu'après qualification, contrôles automatisés et validation ciblée."
                ),
                table(
                    ["Étape", "Action", "Preuve / critère de sortie"],
                    [
                        ["1. Détecter", "Consulter Dependabot ou lancer pnpm outdated et pnpm audit.", "Mise à jour qualifiée."],
                        ["2. Évaluer", "Identifier patch, minor, major, sécurité, runtime ou build.", "Impact et rollback définis."],
                        ["3. Isoler", "Traiter dans une branche dédiée avec le lockfile.", "Changement traçable."],
                        ["4. Vérifier", "Lint, types, tests, couverture, build et audit CI.", "CI verte et aucune vulnérabilité non justifiée."],
                        ["5. Déployer", "Fusionner puis exécuter CD et smoke tests si nécessaire.", "Service stable ou rollback."],
                        ["6. Tracer", "Mettre à jour le changelog pour un changement notable.", "Version/Unreleased cohérent."],
                    ],
                    [29 * mm, 82 * mm, 70 * mm],
                ),
                p("Rythme retenu", "h2"),
                table(
                    ["Type", "Fréquence", "Règle"],
                    [
                        ["Sécurité critique", "Sous 24 h si exploitable", "Priorité maximale, validation renforcée et rollback prêt."],
                        ["Patch/minor", "Hebdomadaire", "Traitement après CI verte."],
                        ["Major framework", "Mensuelle ou lot planifié", "Changelog éditeur, tests ciblés et plan de retour."],
                        ["Migration DB", "À chaque besoin", "Branche/backup Neon avant application sensible."],
                    ],
                    [41 * mm, 43 * mm, 97 * mm],
                ),
                callout(
                    "Preuve à joindre",
                    "Capturer une PR Dependabot ou un audit de dépendances effectivement traité. La configuration seule ne doit pas être décrite comme une mise à jour déjà exécutée.",
                    PALE_AMBER,
                ),
            ],
        )
    )

    story.extend(
        section(
            "3. Supervision et alerte",
            [
                p(
                    "Le système versionné surveille les interfaces publiques critiques. Le workflow GitHub Actions "
                    "Monitoring - Production health est planifié à la minute 17 de chaque heure et peut être lancé manuellement."
                ),
                table(
                    ["Sonde", "Contrat contrôlé", "Finalité"],
                    [
                        ["API readiness", "GET /health/ready ; HTTP 200 et JSON status: ready.", "Vérifier que l'API se déclare prête à servir des requêtes."],
                        ["Web health", "GET /api/health ; HTTP 2xx et JSON status: ok.", "Vérifier la disponibilité du point de santé du Web."],
                        ["CD", "Smoke tests après déploiement.", "Détecter une régression immédiatement après livraison."],
                        ["CI", "Lint, types, tests, build et audit.", "Prévenir la livraison d'un changement non conforme."],
                    ],
                    [35 * mm, 70 * mm, 76 * mm],
                ),
                p("Paramètres réellement configurés", "h2"),
                table(
                    ["Paramètre", "Valeur configurée", "Interprétation"],
                    [
                        ["Cadence", "17 * * * *", "Une exécution horaire à :17 UTC."],
                        ["Seuil HTTP", "200 <= status < 300", "Toute réponse non 2xx est en échec."],
                        ["Contrat JSON", "ready pour API ; ok pour Web", "Évite de considérer un simple 200 comme suffisant."],
                        ["Délai/reprise", "20 s par tentative ; 2 retries ; 5 s", "Tolère une instabilité brève, puis remonte l'échec."],
                        ["Rapport", "Artefact production-health-report, même en échec", "Conserve horodatage, URLs, codes et payloads."],
                    ],
                    [38 * mm, 62 * mm, 81 * mm],
                ),
                p(
                    "Les endpoints de santé sont non cacheables. Ce monitoring ne mesure pas encore les métriques métier détaillées "
                    "(taux 5xx, p95 IA, coût IA) : elles sont traitées comme axes d'amélioration, non comme contrôles déjà actifs.",
                    "body",
                ),
            ],
        )
    )

    story.extend(
        section(
            "4. Signalement et preuve C4.1.2",
            [
                p(
                    "Lorsqu'une sonde échoue, le workflow publie une issue GitHub Production healthcheck failed avec le label monitoring, "
                    "ou commente l'issue déjà ouverte. Lors d'un passage ultérieur réussi, il commente puis ferme cette issue. "
                    "Le canal de signalement déclaré est donc GitHub Actions -> artefact -> GitHub Issue."
                ),
                table(
                    ["Élément", "Statut", "Ce qui doit être montré au jury"],
                    [
                        ["Workflow et issue automatique", "Configurés dans le dépôt", "Le YAML et le protocole de supervision."],
                        ["Run de production réussi", "À joindre", "Capture de la date, du job vert et des deux contrôles."],
                        ["Artefact de monitoring", "À joindre", "Rapport production-health-report du même run."],
                        ["Alerte test sûre", "Exécutée le 28/07/2026", "Run 30348338556, issue test #64, puis run 30348419565 de rétablissement."],
                        ["Notification humaine", "Dépend des réglages GitHub", "Ne la revendiquer que si une capture prouve la réception."],
                    ],
                    [47 * mm, 43 * mm, 91 * mm],
                ),
                p("Démonstration effectuée sans panne de production", "h2"),
                bullet("Le run 30348338556 a exécuté simulate_alert : échec volontaire, artefact téléversé et issue #64 mise à jour."),
                bullet("Le run 30348419565 a exécuté simulate_recovery : succès et fermeture automatique de l'issue #64."),
                bullet("Les rapports des deux runs sont archivés dans B4-P01. Ils déclarent explicitement que la production n'a pas été sondée ni modifiée."),
                bullet("Présenter cette séquence comme une simulation déclarée du circuit GitHub, jamais comme une indisponibilité réelle."),
                callout(
                    "Décision de présentation",
                    "Better Stack ou un outil équivalent reste un renfort optionnel. Il ne doit être cité comme actif que si ses moniteurs, seuils et destinataire sont réellement configurés et capturés.",
                    PALE_AMBER,
                ),
            ],
        )
    )

    story.extend(
        section(
            "5. Collecte et consignation des anomalies",
            [
                p(
                    "Une anomalie peut provenir du monitoring, d'un test, de la CI/CD, des logs, d'un audit ou d'un retour utilisateur. "
                    "Le processus est commun : détecter, qualifier, reproduire, analyser, prioriser, corriger ou contourner, valider, "
                    "informer puis clôturer."
                ),
                table(
                    ["Étape", "Informations requises", "Sortie"],
                    [
                        ["Détection", "Source, date, environnement, composant, symptômes.", "Signal ou ticket créé."],
                        ["Qualification", "Criticité P0-P3, impact, fréquence, utilisateur concerné.", "Priorité et responsable."],
                        ["Reproduction", "Étapes, données de test, résultat attendu/observé, logs utiles.", "Bug reproductible ou statut À reproduire."],
                        ["Analyse", "Cause racine/hypothèse et options de correction/contournement.", "Décision technique argumentée."],
                        ["Validation", "Tests, CI, smoke test et lien correctif/PR si disponibles.", "Statut résolu ou suivi planifié."],
                    ],
                    [30 * mm, 85 * mm, 66 * mm],
                ),
                p("Outil de collecte", "h2"),
                p(
                    "Le formulaire GitHub Anomalie Bloc 4 impose la source, l'environnement, le composant, la criticité, la description, "
                    "les étapes de reproduction, l'impact, la cause, le correctif et la validation. Les fiches BUG-001 et BUG-002 "
                    "conservent également l'historique de cas rencontrés pendant le projet."
                ),
                p(
                    "L'annexe C4.2.1 fournit un modèle prêt à compléter. Un ticket fictif est possible dans la simulation RNCP, "
                    "mais doit comporter la mention Simulation déclarée et ne doit jamais être présenté comme un incident réel."
                ),
            ],
        )
    )

    story.extend(
        section(
            "6. Exemple de traitement : BUG-002",
            [
                p(
                    "BUG-002 traite un README encodé en UTF-16 LE, rendant son affichage GitHub illisible. Ce cas illustre une anomalie "
                    "de documentation réellement identifiée pendant le projet, sans revendiquer un incident de production."
                ),
                table(
                    ["Rubrique", "Constat et traitement"],
                    [
                        ["Impact", "README difficile à lire dans GitHub, mauvaise compréhension du projet et des consignes de maintenance."],
                        ["Détection", "Revue finale : caractères parasites et octets nuls visibles entre les caractères."],
                        ["Reproduction", "Lire le fichier dans un outil affichant l'encodage ou inspecter les premiers octets."],
                        ["Cause", "Création/copie Windows ayant conservé un encodage UTF-16 au lieu d'UTF-8."],
                        ["Correctif", "Réécriture en UTF-8 sans BOM et recommandation de règles .gitattributes."],
                        ["Validation", "Contrôle des octets et lecture GitHub/terminal attendue sans caractères parasites."],
                        ["Prévention", "Vérifier l'encodage des documents avant commit et utiliser un format texte UTF-8."],
                    ],
                    [35 * mm, 146 * mm],
                ),
                p("Passage CI/CD", "h2"),
                p(
                    "Pour tout correctif applicatif, la checklist de PR impose lint, typecheck, tests, couverture, build, healthchecks si "
                    "nécessaire, mise à jour du changelog et documentation du rollback. La CI est le garde-fou avant déploiement ; "
                    "le smoke test production n'est revendiqué que lorsqu'il est joint."
                ),
            ],
        )
    )

    story.extend(
        section(
            "7. Journal des versions et traçabilité",
            [
                p(
                    "Le CHANGELOG suit Keep a Changelog et utilise les rubriques Added, Changed, Fixed et Security. La version documentaire "
                    "de référence est 0.13.0-rc.3. Elle est une candidate : elle ne doit pas être appelée version de production sans preuve "
                    "de déploiement et smoke tests associés."
                ),
                table(
                    ["Version", "Date", "Éléments maintenus"],
                    [
                        ["0.13.0-rc.3", "20/07/2026", "Correctifs de recette authentifiée ; validation de production à joindre séparément."],
                        ["0.13.0-rc.2", "20/07/2026", "Readiness API, tests, monitoring GitHub, templates Bloc 4 et healthchecks non cacheables."],
                        ["0.12.0", "16/04/2026", "Pagination, dashboard, statistiques et correction Auth.js trustHost."],
                    ],
                    [37 * mm, 33 * mm, 111 * mm],
                ),
                p("Chaîne obligatoire pour chaque maintenance notable", "h2"),
                bullet("Ticket anomalie ou cas support, avec statut réel ou simulation déclarée."),
                bullet("Décision de correction, contournement ou rollback, puis PR/commit lorsqu'il existe."),
                bullet("Validation technique : commande, CI, test manuel et test de production seulement s'ils ont été exécutés."),
                bullet("Entrée CHANGELOG et version/Unreleased correspondant au statut réellement livré."),
                p(
                    "La matrice C4.3.2 en annexe relie ces éléments et empêche de confondre un brouillon, un correctif fusionné, "
                    "une validation locale et une livraison de production."
                ),
            ],
        )
    )

    story.extend(
        section(
            "8. Support client et continuité de service",
            [
                p(
                    "Le formulaire Cas support client Bloc 4 structure le canal, le contexte, le problème, le diagnostic, la contribution "
                    "technique, les rôles des parties prenantes, la résolution et la validation. Aucune donnée personnelle ne doit être déposée."
                ),
                table(
                    ["Cas", "Traitement à présenter", "Règle de transparence"],
                    [
                        ["Retour réel", "Conserver le ticket daté, les informations anonymisées, la résolution et le retour de validation.", "Ne pas divulguer de données sensibles."],
                        ["Absence de retour réel", "Utiliser le modèle support pour une génération IA lente ou en échec, avec diagnostic et contournement.", "Titre et contenu marqués Simulation déclarée."],
                    ],
                    [38 * mm, 90 * mm, 53 * mm],
                ),
                p("Rollback et reprise", "h2"),
                table(
                    ["Situation", "Réponse prévue", "Preuve utile"],
                    [
                        ["Régression Web/API", "Promouvoir le dernier déploiement Vercel sain ou appliquer un hotfix après qualification.", "Capture déploiement sain/rollback et smoke test."],
                        ["Migration DB risquée", "Préparer une branche ou sauvegarde Neon avant migration ; privilégier des migrations compatibles.", "Capture branche/backup avant exécution."],
                        ["Incident de disponibilité", "Consulter le rapport de monitoring, qualifier l'impact, corriger/contourner, puis valider la reprise.", "Issue, artefact et test de rétablissement."],
                    ],
                    [42 * mm, 92 * mm, 47 * mm],
                ),
                p(
                    "Le rollback Vercel est documenté. Le rollback base de données reste une stratégie à prouver avant une migration sensible ; "
                    "il ne doit pas être décrit comme déjà exécuté sans pièce datée."
                ),
            ],
        )
    )

    story.extend(
        section(
            "9. Recommandations priorisées",
            [
                table(
                    ["Priorité", "Recommandation", "Gain / effort"],
                    [
                        ["Haute", "Joindre un run vert, son artefact et le cycle d'alerte test GitHub.", "Sécurise la démonstration C4.1.2 ; effort faible."],
                        ["Haute", "Créer une issue anomalie complète et un cas support réel ou déclaré simulé.", "Renforce C4.2.1/C4.3.3 ; effort faible."],
                        ["Haute", "Capturer Dependabot/audit et, avant migration, branche ou backup Neon.", "Renforce la maintenance préventive et le rollback."],
                        ["Moyenne", "Centraliser les logs avec un logger structuré et des alertes 5xx/DB/IA.", "Diagnostic plus rapide ; 1 à 2 jours estimés."],
                        ["Moyenne", "Ajouter une observabilité IA : latence, erreurs, coût et quotas.", "Pilotage de la dépendance fournisseur ; 1 à 2 jours."],
                        ["Moyenne", "Ajouter des tests d'intégration DB dédiés.", "Couvre repositories et migrations ; 2 à 3 jours."],
                    ],
                    [26 * mm, 102 * mm, 53 * mm],
                ),
                callout(
                    "Positionnement jury",
                    "La supervision GitHub est présentée comme un dispositif configuré et contrôlable. Les améliorations d'observabilité avancée sont des recommandations réalistes, pas des fonctions déjà livrées.",
                    PALE_BLUE,
                ),
            ],
        )
    )

    story.extend(
        section(
            "10. Grille de conformité du livrable",
            [
                p(
                    "Le règlement attend huit éléments dans le dossier écrit. Cette grille permet au jury de retrouver rapidement "
                    "chaque réponse Alcide et précise quelle pièce doit encore être ajoutée au moment de la remise."
                ),
                table(
                    ["Attendu officiel", "Emplacement dans ce dossier", "Élément à joindre si disponible"],
                    [
                        ["Mises à jour des dépendances", "Section 2", "PR Dependabot ou audit daté traité."],
                        ["Système de supervision", "Sections 3 et 4", "B4-P01 : alerte/rétablissement simulés ; run production vert restant."],
                        ["Collecte des anomalies", "Section 5", "Issue ou fiche renseignée avec reproduction."],
                        ["Fiche anomalie", "Section 6 et annexe C4.2.1", "Lien ticket, impact et validation."],
                        ["Traitement d'une anomalie", "Section 6", "Commit/PR et contrôles réellement exécutés."],
                        ["Recommandations argumentées", "Section 9", "Aucune pièce supplémentaire, sauf si action réalisée."],
                        ["Journal des versions", "Section 7 et CHANGELOG", "Entrée liée au correctif si une version est livrée."],
                        ["Problème support résolu", "Section 8 et annexe C4.3.3", "Ticket réel anonymisé ou simulation déclarée."],
                    ],
                    [53 * mm, 66 * mm, 62 * mm],
                ),
                p("Règle de recevabilité", "h2"),
                p(
                    "Une capture doit être datée, lisible et reliée à la version remise. Une configuration versionnée prouve une capacité ; "
                    "un run, une issue ou un artefact prouve son exécution. Le dossier ne confond jamais les deux."
                ),
                callout(
                    "Contrôle avant export",
                    "Les annexes sont sélectionnées à partir des faits disponibles. Les captures contenant des secrets, données de santé, adresses e-mail ou URL signées sont anonymisées ou exclues.",
                    PALE_AMBER,
                ),
            ],
        )
    )

    story.extend(
        section(
            "11. Routine d'exploitation proposée",
            [
                p(
                    "La maintenance doit être pilotée dans le temps. La routine suivante est adaptée à un pilote applicatif tenu par un mainteneur principal, "
                    "avec l'appui ponctuel d'un commanditaire ou d'un utilisateur pilote."
                ),
                table(
                    ["Cadence", "Activité", "Trace à conserver"],
                    [
                        ["À chaque alerte", "Qualifier le rapport, mesurer l'impact, ouvrir/mettre à jour le ticket et décider correctif, contournement ou rollback.", "Issue GitHub, artefact, décision et test de reprise."],
                        ["Hebdomadaire", "Consulter Dependabot, le résultat d'audit, les erreurs significatives et le backlog d'anomalies.", "PR, résultat audit, revue des tickets ouverts."],
                        ["Avant déploiement", "Vérifier la CI, le changelog, le plan de rollback et les migrations éventuelles.", "Run CI, PR checklist, plan de retour."],
                        ["Après déploiement", "Contrôler readiness API, healthcheck Web et parcours métier ciblé lorsque nécessaire.", "Smoke test, run CD ou capture datée."],
                        ["Mensuel", "Revoir les tendances, les recommandations, les coûts/erreurs IA et la dette de maintenance.", "Compte rendu, priorisation et décisions."],
                    ],
                    [31 * mm, 95 * mm, 55 * mm],
                ),
                p("Rôles", "h2"),
                table(
                    ["Rôle", "Responsabilité", "Limite assumée"],
                    [
                        ["Mainteneur Alcide", "Surveillance, qualification, correction, déploiement et documentation.", "Projet individuel : pas d'astreinte multi-équipe démontrée."],
                        ["Utilisateur pilote / commanditaire", "Remonter un problème, valider un contournement ou un résultat métier.", "Retour réel à joindre seulement lorsqu'il existe."],
                        ["Fournisseurs", "Vercel, Neon, OAuth et IA : disponibilité des services externes.", "Leur statut est diagnostiqué, non maîtrisé par le code Alcide."],
                    ],
                    [43 * mm, 82 * mm, 56 * mm],
                ),
            ],
        )
    )

    story.extend(
        section(
            "12. Indicateurs, seuils et décisions",
            [
                p(
                    "Les seuils suivants servent à interpréter les données de maintenance. Seuls les contrôles explicitement marqués "
                    "Configurés sont automatisés aujourd'hui ; les autres sont des objectifs de pilotage à mettre en oeuvre progressivement."
                ),
                table(
                    ["Indicateur", "Seuil / objectif", "Statut et décision associée"],
                    [
                        ["Readiness API", "HTTP 200 et status ready", "Configuré : issue monitoring en cas d'échec."],
                        ["Healthcheck Web", "HTTP 2xx et status ok", "Configuré : issue monitoring en cas d'échec."],
                        ["Délai de sonde", "20 s, 2 retries", "Configuré : limiter les faux positifs liés à une instabilité brève."],
                        ["Disponibilité", "99 % mensuel pour le pilote", "Objectif : analyser les incidents et la durée de rétablissement."],
                        ["Erreurs API 5xx", "< 1 % des requêtes", "Objectif : centraliser les logs et alerter si le seuil est dépassé."],
                        ["Erreurs IA", "< 5 % des générations", "Objectif : suivre fournisseur, validation et timeouts."],
                        ["Latence IA", "p95 < 55 s", "Objectif : diagnostiquer timeout, coût ou dégradation fournisseur."],
                    ],
                    [38 * mm, 49 * mm, 94 * mm],
                ),
                p("Interprétation", "h2"),
                bullet("Une indisponibilité Web/API constatée par le workflow déclenche la qualification d'incident et peut justifier un rollback."),
                bullet("Une dérive d'erreurs IA ou de latence ne vaut pas incident prouvé tant qu'elle n'est pas mesurée ; elle est donc présentée comme une recommandation de supervision avancée."),
                bullet("Les seuils métier sont révisés après collecte de données réelles du pilote, sans promettre une disponibilité contractuelle non établie."),
            ],
        )
    )

    story.extend(
        section(
            "13. Registre des risques MCO",
            [
                p(
                    "Le registre relie les risques de maintien en condition opérationnelle aux mécanismes de détection et de réponse. "
                    "Il sert de base pour prioriser les actions de maintenance et expliquer les arbitrages au jury."
                ),
                table(
                    ["Risque", "Détection", "Réponse et preuve"],
                    [
                        ["API ou Web indisponible", "Readiness/healthcheck horaire, CI/CD, logs Vercel.", "Issue monitoring, qualification, rollback ou hotfix, test de reprise."],
                        ["Migration DB incompatible", "Échec migration, erreurs de connexion ou recette ciblée.", "Branche/backup avant migration, correction compatible et validation."],
                        ["Régression de dépendance", "Dependabot, audit, CI et tests ciblés.", "Branche dédiée, lockfile, CI, rollback package/version si nécessaire."],
                        ["Fournisseur IA lent/indisponible", "Logs de durée, timeout, validation de réponse et retour support.", "Message utilisateur, retry/backoff, analyse fournisseur et recommandation."],
                        ["Erreur d'usage ou documentation", "Retour support, test utilisateur, revue documentaire.", "Ticket, clarification, correctif ou mise à jour de documentation."],
                        ["Exposition de données sensibles", "Revue sécurité, audit, logs et contrôle des captures.", "Ne pas déposer de secret ; traiter et documenter toute anomalie confirmée."],
                    ],
                    [47 * mm, 62 * mm, 72 * mm],
                ),
                callout(
                    "Principe d'escalade",
                    "P0 : indisponibilité ou risque sécurité majeur, correction/rollback immédiat. P1 : impact élevé, traitement dans la journée. P2 : correction planifiée au prochain lot. P3 : amélioration ou dette à prioriser.",
                    PALE_BLUE,
                ),
                p(
                    "Les niveaux P0 à P3 sont des objectifs internes de priorisation. Ils ne constituent pas un SLA contractuel envers un client."
                ),
            ],
        )
    )

    story.extend(
        section(
            "14. Checklist de remise et conclusion",
            [
                p("Pièces à joindre avant remise", "h2"),
                bullet("Run vert Monitoring - Production health, avec les deux contrôles et l'artefact production-health-report."),
                bullet("Annexe B4-P01 : cycle simulate_alert/simulate_recovery déjà exécuté, clairement identifié comme test sûr et non comme panne réelle."),
                bullet("Une anomalie consignée et un cas support réel ou explicitement simulé, reliés à la matrice de traçabilité."),
                bullet("Run CI final vert de la révision remise et preuve de déploiement uniquement si la candidate est annoncée en production."),
                bullet("Cohérence entre package.json, guide de déploiement, CHANGELOG et ce dossier : 0.13.0-rc.3 est une candidate documentaire."),
                p("Conclusion", "h2"),
                p(
                    "Alcide possède une base MCO versionnée et crédible : dépendances surveillées, CI/CD, readiness, healthchecks non cacheables, "
                    "monitoring horaire, rapport d'exécution, circuit d'issue, processus d'anomalies, correctifs documentés, changelog et rollback Vercel."
                ),
                p(
                    "Les trois compétences éliminatoires sont adressées par des mécanismes concrets. La remise est sécurisée lorsque les "
                    "captures d'exécution et les tickets requis complètent ces mécanismes sans transformer une configuration ou une simulation "
                    "en fait de production."
                ),
                Spacer(1, 4 * mm),
                callout(
                    "Annexes de preuve",
                    "Références à joindre selon les faits disponibles : protocole C4.1.2, modèle anomalie C4.2.1, matrice C4.3.2, modèle support C4.3.3, BUG-001/BUG-002, CHANGELOG et preuves GitHub datées.",
                ),
            ],
        )
    )
    # Each section ends with a page break for a readable jury dossier. The final
    # break would add a blank page, so remove it before ReportLab builds the PDF.
    if isinstance(story[-1], PageBreak):
        story.pop()
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
        title="RNCP39583 Bloc 4 - Alcide",
        author="Kevin",
    )
    document.build(build_story(), canvasmaker=NumberedCanvas)
    page_count = len(PdfReader(str(OUTPUT)).pages)
    if page_count > MAX_PAGES:
        raise RuntimeError(f"The dossier has {page_count} pages; maximum is {MAX_PAGES}.")
    print(f"Built {OUTPUT} ({page_count} pages, maximum {MAX_PAGES}).")
    return page_count


if __name__ == "__main__":
    build()
