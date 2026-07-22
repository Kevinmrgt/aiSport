from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

from build_bloc2_jury_pdf import (
    ROOT,
    SCREENSHOTS,
    STYLES,
    add_page_number,
    bullets,
    image_block,
    p,
    table,
)


OUT_DIR = ROOT / "docs" / "rncp" / "livrables"
OUT_PDF = OUT_DIR / "dossier-bloc2-jury-rncp39583-alcide-complet-2026-07-16.pdf"


def page_title(story, title: str, subtitle: str | None = None):
    story.append(p(title, STYLES["H1Custom"]))
    if subtitle:
        story.append(p(subtitle, STYLES["BodySmall"]))
    story.append(Spacer(1, 0.15 * cm))


def add_key_value_section(story, title: str, rows: list[list[str]]):
    page_title(story, title)
    story.append(table([["Point", "Détail"]] + rows, [4.2 * cm, 12.4 * cm], STYLES))
    story.append(Spacer(1, 0.3 * cm))


def add_competency_sheet(
    story,
    code: str,
    title: str,
    expected: str,
    functional: str,
    proofs: list[str],
    missing: str,
    corrections: str,
    config: str,
    decision: str,
):
    page_title(story, f"Fiche détaillée {code}", title)
    story.append(
        table(
            [
                ["Rubrique", "Analyse"],
                ["Attendu RNCP", expected],
                ["Ce qui est fonctionnel", functional],
                ["Ce qui manque", missing],
                ["Ce qui est à corriger", corrections],
                ["Ce qui est à configurer côté projet", config],
                ["Décision de conformité", decision],
            ],
            [4.0 * cm, 12.6 * cm],
            STYLES,
        )
    )
    story.append(p("Preuves principales", STYLES["H2Custom"]))
    story.append(bullets(proofs, STYLES))
    story.append(PageBreak())


def parse_recipe_rows() -> list[list[str]]:
    source = ROOT / "docs" / "bloc2" / "cahier-recettes.md"
    rows: list[list[str]] = []
    for raw in source.read_text(encoding="utf-8").splitlines():
        if not raw.startswith("| CR-") or raw.startswith("| CR-XXX"):
            continue
        parts = [part.strip() for part in raw.strip("|").split("|")]
        if len(parts) < 7:
            continue
        status = parts[6]
        status_text = "Validé" if "✅" in status else "À relancer"
        rows.append([parts[0], parts[1], status_text, parts[5]])
    return rows


def build_story():
    story = []

    story.append(Spacer(1, 1.8 * cm))
    story.append(p("Dossier Complet Jury - Bloc 2", STYLES["CoverTitle"]))
    story.append(p("RNCP39583 - Expert en développement logiciel", STYLES["CoverSub"]))
    story.append(p("Bloc 2 : Concevoir et développer des applications logicielles", STYLES["CoverSub"]))
    story.append(Spacer(1, 0.45 * cm))
    story.append(p("<b>Projet :</b> Alcide, coach sportif IA personnalisé", STYLES["CoverSub"]))
    story.append(p("<b>Version applicative :</b> 0.12.0", STYLES["CoverSub"]))
    story.append(p("<b>Date de consolidation :</b> 16 juillet 2026", STYLES["CoverSub"]))
    story.append(p("<b>Production Web :</b> https://ai-sport-web.vercel.app", STYLES["CoverSub"]))
    story.append(p("<b>Production API :</b> https://ai-sport-api.vercel.app", STYLES["CoverSub"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        table(
            [
                ["Décision de dépôt", "Bloc 2 prêt à remettre au jury avec preuves locales, production, CI, monitoring et captures."],
                ["Position à tenir", "Validé techniquement au 2026-07-16, avec transparence sur les actions de configuration restantes."],
                ["Point IA", "OpenAI est le seul fournisseur ; la clé API est configurée côté serveur, jamais par l’utilisateur."],
                ["Bloc 1", "Déjà présenté et figé ; ce dossier ne modifie pas le contenu Bloc 1."],
            ],
            [4.4 * cm, 12.2 * cm],
            STYLES,
            header=False,
        )
    )
    story.append(PageBreak())

    page_title(story, "Sommaire")
    story.append(
        bullets(
            [
                "1. Synthèse de conformité Bloc 2",
                "2. Points à valider avec le jury et actions côté projet",
                "3. Mapping officiel compétence par compétence",
                "4. Architecture logicielle et choix techniques",
                "5. Prototype et parcours utilisateur",
                "6. OpenAI côté serveur et configuration IA",
                "7. Déploiement, CI/CD et exploitation",
                "8. Tests, couverture, build et qualité",
                "9. Sécurité, accessibilité et données",
                "10. Cahier de recettes complet",
                "11. Plan de correction des bogues",
                "12. Documentation utilisateur et mise à jour",
                "13. Captures du prototype",
                "14. Annexes et traçabilité",
            ],
            STYLES,
        )
    )

    add_key_value_section(
        story,
        "1. Synthèse de conformité Bloc 2",
        [
            ["But du bloc", "Démontrer la capacité à concevoir, développer, tester, sécuriser, déployer et documenter une application logicielle fonctionnelle."],
            ["Produit présenté", "Alcide, application full-stack de coaching sportif IA avec génération de séances, programmes, timer, historique, dashboard et réglages IA."],
            ["État fonctionnel", "Le MVP déployé sur Vercel est accessible, authentifié, navigable et connecté à l’API de production ; les générations séance et programme ont été rejouées en production."],
            ["État qualité", "CI main verte, tests unitaires API/Web verts, typecheck, build, Docker, smoke/accessibilité et coverage validés."],
            ["État sécurité", "Routes API protégées par secret interne, validation Zod, rate limiting, secrets serveur uniquement, OpenAI non exposé au client."],
            ["État recette", "33 scénarios documentés ; 32 validés fonctionnellement ou par test ; CR-013 gardé en relance réelle transparente."],
            ["Décision", "Bloc 2 validable techniquement. Les points restants sont de la configuration externe ou des preuves optionnelles clairement tracées."],
        ],
    )

    page_title(story, "2. Points à suivre avant dépôt")
    story.append(
        table(
            [
                ["Point", "Statut", "Pourquoi", "Action attendue"],
                ["Secret GitHub VERCEL_TOKEN", "Action configuration", "Le workflow CD - Vercel custom échoue car le token GitHub est invalide, mais la prod et le monitoring sont OK.", "Créer un nouveau token Vercel et remplacer le secret GitHub `VERCEL_TOKEN` si le CD custom doit être vert."],
                ["Variables GitHub de monitoring", "Validé", "Le monitoring production est vert au run 29496100988.", "Conserver les URLs `ai-sport-api` et `ai-sport-web`."],
                ["DATABASE_URL SSL", "À durcir côté Vercel/Neon", "Les logs indiquent un warning SSL ; l’app fonctionne mais la config peut être explicite.", "Mettre `sslmode=verify-full` dans `DATABASE_URL`."],
                ["Google OAuth callback", "À conserver côté Google", "La connexion Google fonctionne, mais le callback doit rester aligné sur le domaine actuel.", "Vérifier `https://ai-sport-web.vercel.app/api/auth/callback/google` dans Google Cloud."],
                ["Génération programme production", "Validé", "Un programme 3 semaines / 9 séances a été généré en production le 2026-07-16.", "Preuve B2-A18."],
                ["CR-013 coupure IA réelle", "Optionnel / transparent", "La gestion d’erreur est couverte par tests unitaires, mais pas par coupure réelle manuelle.", "À rejouer si le jury demande une preuve de panne réelle."],
                ["E2E complet generate.spec.ts", "Optionnel", "Le smoke E2E est documenté ; le scénario complet demande un environnement pnpm local disponible.", "Relancer quand `pnpm` est disponible."],
                ["Favicon", "Cosmétique", "404 favicon observé, sans impact RNCP.", "Ajouter un favicon statique plus tard."],
            ],
            [3.4 * cm, 3.0 * cm, 5.1 * cm, 5.1 * cm],
            STYLES,
        )
    )

    page_title(story, "3. Mapping officiel compétence par compétence")
    story.append(
        table(
            [
                ["Compétence", "Attendu", "Réponse Alcide", "Preuves", "Statut"],
                ["C2.1.1", "Mettre en place les environnements de développement, test et production.", "Local, tests automatisés, Docker, GitHub Actions, Vercel Web/API, Neon PostgreSQL.", "docs/deployment.md, docs/ci-cd.md, healthchecks B2-A18.", "Validé"],
                ["C2.1.2", "Intégration continue, contrôle qualité et déploiement.", "CI verte sur main ; monitoring production vert ; workflow CD custom documenté.", "CI run 29489995458 ; monitoring run 29496100988.", "Validé avec action token"],
                ["C2.2.1", "Prototype logiciel ergonomique et sécurisé.", "Parcours connecté complet : génération séance, programme, historique, détail/timer, dashboard, settings.", "Captures B2-A04 à B2-A07, B2-A17 et B2-A18.", "Validé"],
                ["C2.2.2", "Harnais de tests unitaires.", "Suites API services/controllers/middlewares + test Web Timer.", "70 tests API + 1 Web ; coverage 88.1%.", "Validé"],
                ["C2.2.3", "Développement évolutif, sécurisé et accessible.", "Architecture en couches, Zod, Drizzle, SERVICE_SECRET, rate limit, accessibilité UI.", "OWASP review, smoke Playwright/axe, code refs.", "Validé"],
                ["C2.2.4", "Déployer progressivement et vérifier stabilité/performance.", "Version 0.12.0 déployée, healthchecks, monitoring vert, générations IA réelles.", "B2-A17/B2-A18.", "Validé"],
                ["C2.3.1", "Élaborer et exécuter un cahier de recettes.", "33 scénarios couvrant auth, génération, sécurité, timer, dashboard, healthchecks.", "docs/bloc2/cahier-recettes.md.", "Validé"],
                ["C2.3.2", "Plan de correction des bogues.", "Processus détection, qualification, reproduction, correction, non-régression et traçabilité.", "docs/rncp/bloc2-plan-correction-bogues-rncp39583.md.", "Validé"],
                ["C2.4.1", "Documentation d’exploitation.", "Manuel utilisateur, manuel mise à jour, déploiement, CI/CD, runbooks.", "docs/rncp/bloc2-manuel-*.md, docs/deployment.md.", "Validé"],
            ],
            [1.9 * cm, 4.0 * cm, 4.4 * cm, 4.3 * cm, 2.0 * cm],
            STYLES,
        )
    )
    story.append(PageBreak())

    add_competency_sheet(
        story,
        "C2.1.1",
        "Mettre en place les environnements de développement, test et production",
        "Le candidat doit démontrer que le logiciel peut être développé, testé, exécuté et contrôlé dans des environnements identifiés.",
        "Alcide dispose d’un environnement local, de tests automatisés, d’une cible Docker, de workflows GitHub Actions, d’une production Vercel Web/API et d’une base Neon PostgreSQL.",
        [
            "docs/deployment.md décrit les environnements, variables, healthchecks, OAuth et procédures.",
            "docs/ci-cd.md décrit les workflows CI/CD, secrets et smoke tests.",
            "B2-A18 prouve les healthchecks production API/Web en HTTP 200 le 16 juillet 2026.",
            "API : https://ai-sport-api.vercel.app/health retourne status ok, service alcide-api, version 0.12.0.",
            "Web : https://ai-sport-web.vercel.app/api/health retourne status ok, service alcide-web, version 0.12.0.",
        ],
        "Aucun manque bloquant. Les anciens domaines ont été corrigés dans les docs et workflows du périmètre Bloc 2.",
        "Aucune correction fonctionnelle restante. Le favicon 404 est cosmétique.",
        "Durcir DATABASE_URL avec sslmode=verify-full dans Vercel/Neon.",
        "Validé : environnements identifiés, production accessible et healthchecks datés.",
    )

    add_competency_sheet(
        story,
        "C2.1.2",
        "Mettre en œuvre un protocole d’intégration continue",
        "Le candidat doit démontrer que le code est contrôlé automatiquement avant livraison et que la chaîne de déploiement est documentée.",
        "La CI principale est verte sur main. Les workflows CD, migration DB et monitoring existent. Le monitoring production est vert sur les domaines ai-sport-web et ai-sport-api.",
        [
            "Workflow CI - Alcide : run 29489995458 en succès sur le commit 533f17be8fd50cfef3c60b3792a549a6ad80c386.",
            ".github/workflows/ci.yml couvre typecheck, lint, tests, coverage, build, smoke E2E et Docker.",
            ".github/workflows/deploy-vercel.yml déploie API puis Web et smoke test les healthchecks.",
            ".github/workflows/production-health-monitor.yml surveille les healthchecks de production.",
            "B2-A18 documente l’état GitHub Actions, la CI verte, le monitoring vert et l’action VERCEL_TOKEN.",
        ],
        "Le workflow CD custom n’est pas vert actuellement car le token GitHub Vercel est invalide.",
        "Code workflow corrigé pour les domaines ai-sport. Rien d’autre à corriger côté fichier.",
        "Renouveler le secret GitHub VERCEL_TOKEN si le workflow CD custom doit être utilisé.",
        "Validé avec action de configuration : la CI qualité et le monitoring sont prouvés verts, la production est disponible, le CD custom nécessite un secret propriétaire valide.",
    )

    add_competency_sheet(
        story,
        "C2.2.1",
        "Réaliser un prototype logiciel ergonomique et sécurisé",
        "Le candidat doit présenter un prototype utilisable couvrant les parcours fonctionnels attendus.",
        "Le MVP connecté couvre accueil, génération de séance, génération de programme, historique, détail/timer, dashboard, settings IA et déconnexion.",
        [
            "Captures B2-A04 à B2-A07 produites depuis le navigateur interne connecté.",
            "Captures B2-A17 : settings OpenAI, formulaire programme, historique séances.",
            "Captures B2-A18 : génération réelle séance et programme en production.",
            "Routes production observées : /generate, /settings, /programs, /programs/generate, /workouts, /dashboard.",
            "Le formulaire /generate affiche le modèle OpenAI et ne demande aucune clé API utilisateur.",
            "Le détail séance contient programme et timer, reliés aux exercices générés.",
        ],
        "Aucun manque bloquant. Des captures mobile pourraient compléter le dossier si le jury les demande.",
        "Aucune correction fonctionnelle immédiate. Le favicon peut être ajouté plus tard.",
        "Conserver Google OAuth configuré sur le domaine actuel ai-sport-web.vercel.app.",
        "Validé : prototype connecté, visuel, navigable et relié aux preuves.",
    )

    add_competency_sheet(
        story,
        "C2.2.2",
        "Constituer un harnais de tests unitaires",
        "Le candidat doit prouver que les composants critiques sont testés et que les régressions sont contrôlées.",
        "Le backend dispose de tests services, controllers, middlewares, health et env ; le frontend couvre le Timer.",
        [
            "70 tests API passés avec Vitest.",
            "1 test Web Timer passé avec Vitest.",
            "Coverage API : 88.1% statements, 79.34% branches, 95.08% functions, 88.1% lines.",
            "Tests IA : workout-ai.service.test.ts et program-ai.service.test.ts couvrent JSON valide, retry, timeout et 429.",
            "Tests sécurité : auth.middleware.test.ts, rate-limit.middleware.test.ts et validate-env.test.ts.",
        ],
        "La couverture publiée concerne surtout l’API. Les repositories DB directs restent moins couverts.",
        "Aucune correction bloquante. Ajouter des tests d’intégration DB serait une amélioration future.",
        "Réparer ou réinstaller Node/pnpm localement si tu veux relancer exactement les scripts pnpm depuis ce terminal.",
        "Validé : le seuil qualité est dépassé et les services critiques sont couverts.",
    )

    add_competency_sheet(
        story,
        "C2.2.3",
        "Développer de façon évolutive, sécurisée et accessible",
        "Le candidat doit démontrer une architecture maintenable, sécurisée, accessible et conforme aux bonnes pratiques.",
        "Alcide sépare frontend, API, services, repositories, contrats Zod et base PostgreSQL. La sécurité repose sur secrets serveur, validation, ownership, rate limiting et fail-fast env.",
        [
            "SERVICE_SECRET protège les appels Web vers API.",
            "OpenAI est appelé uniquement côté API serveur ; aucun secret n’est exposé au navigateur.",
            "Zod valide les entrées ; Drizzle limite les injections SQL ; React échappe le rendu.",
            "Rate limiting validé par CR-035 et CR-036.",
            "Accessibilité : labels, focus visible, skip link, aria-live sur timer, aria-busy sur loading states.",
            "Smoke Playwright/axe documenté dans B2-A10.",
        ],
        "L’E2E complet generate.spec.ts n’a pas été relancé dans cette passe.",
        "Aucune correction sécurité bloquante détectée. Les vulnérabilités low/moderate restent à suivre hors high/critical.",
        "Maintenir OPENAI_API_KEY, SERVICE_SECRET, AUTH_SECRET et secrets Google uniquement dans Vercel/GitHub secrets.",
        "Validé : sécurité et accessibilité documentées avec preuves.",
    )

    add_competency_sheet(
        story,
        "C2.2.4",
        "Déployer progressivement et vérifier la stabilité",
        "Le candidat doit présenter une version stable, déployée et vérifiée après livraison.",
        "La version 0.12.0 est déployée sur Vercel. Les healthchecks sont en 200, le monitoring est vert et les générations OpenAI séance/programme ont abouti en production.",
        [
            "Production Web : https://ai-sport-web.vercel.app répond en HTTP 200.",
            "Production API : https://ai-sport-api.vercel.app/health répond en HTTP 200.",
            "Monitoring production : run 29496100988 en succès.",
            "Logs API : POST /workouts/generate en 201 à 12:39:44Z et 12:42:35Z.",
            "Durées OpenAI observées : 4812 ms et 6976 ms, donc inférieures à la cible 30s.",
            "docs/deployment.md et docs/ci-cd.md alignés sur les domaines ai-sport.",
        ],
        "Le CD GitHub custom n’est pas vert tant que VERCEL_TOKEN n’est pas renouvelé.",
        "Les smoke tests workflow ont été corrigés pour utiliser les bonnes URLs.",
        "Renouveler VERCEL_TOKEN ; vérifier les variables de monitoring ; relancer CD et monitoring.",
        "Validé pour la stabilité production ; action configuration restante pour la chaîne CD custom entièrement verte.",
    )

    add_competency_sheet(
        story,
        "C2.3.1",
        "Élaborer et suivre un cahier de recettes",
        "Le candidat doit prouver que les fonctionnalités ont été testées par scénarios de recette.",
        "Le cahier contient 33 scénarios couvrant authentification, génération, timer, sécurité, rate limiting, loading states, healthchecks, filtres et dashboard.",
        [
            "docs/bloc2/cahier-recettes.md contient le cahier complet.",
            "Addendum production 2026-07-16 : healthchecks API/Web, CI verte, monitoring vert, génération séance et programme.",
            "32 scénarios validés fonctionnellement ou par tests automatisés ; les parcours IA principaux ont été rejoués en production.",
            "CR-013 est gardé en relance réelle, avec couverture unitaire déjà présente.",
            "Les résultats sont reliés aux captures, logs et tests.",
        ],
        "CR-013 n’a pas été rejoué en coupure OpenAI réelle.",
        "Aucune correction documentaire restante ; la limite est formulée explicitement.",
        "Décider si tu veux rejouer une coupure IA réelle avant dépôt.",
        "Validé : cahier complet, transparent et exploitable jury.",
    )

    add_competency_sheet(
        story,
        "C2.3.2",
        "Élaborer un plan de correction des bogues",
        "Le candidat doit montrer comment les anomalies sont détectées, priorisées, corrigées et vérifiées.",
        "Le plan Bloc 2 définit le processus complet et recense les anomalies B2-BUG-001 à B2-BUG-008.",
        [
            "docs/rncp/bloc2-plan-correction-bogues-rncp39583.md décrit détection, qualification, reproduction, analyse, correction, non-régression, validation et traçabilité.",
            "B2-BUG-001 suit CR-013.",
            "B2-BUG-002 et B2-BUG-003 corrigent des écarts recette/produit.",
            "B2-BUG-004 clarifie les E2E complets.",
            "B2-BUG-006 à B2-BUG-008 clôturent les livrables documentaires manquants.",
        ],
        "Aucun manque bloquant. Le registre doit continuer à vivre après le dépôt.",
        "Aucune correction restante pour le Bloc 2 actuel.",
        "Tenir à jour les anomalies futures avec une preuve de non-régression.",
        "Validé : processus clair et anomalies tracées.",
    )

    add_competency_sheet(
        story,
        "C2.4.1",
        "Rédiger la documentation d’exploitation",
        "Le candidat doit fournir les documents permettant d’utiliser, maintenir, déployer et faire évoluer le logiciel.",
        "Les manuels utilisateur, mise à jour, déploiement et CI/CD sont présents et alignés avec la production actuelle.",
        [
            "docs/rncp/bloc2-manuel-utilisateur-alcide.md couvre accès, login, génération, programmes, timer, dashboard et problèmes courants.",
            "docs/rncp/bloc2-manuel-mise-a-jour.md couvre branche, dépendances, migrations, tests, version, déploiement et rollback.",
            "docs/deployment.md décrit Vercel, Neon, secrets, OAuth callback et healthchecks.",
            "docs/ci-cd.md décrit workflows, gates, secrets et rollback.",
            "docs/mcp-setup.md aligne le monitoring sur les domaines ai-sport.",
        ],
        "Aucun manque documentaire bloquant.",
        "Aucune correction restante dans le périmètre Bloc 2.",
        "Garder les secrets hors Git ; configurer VERCEL_TOKEN et DATABASE_URL côté plateformes.",
        "Validé : documentation exploitable par une équipe technique et par le jury.",
    )

    page_title(story, "4. Architecture logicielle et choix techniques")
    story.append(
        table(
            [
                ["Zone", "Chemins", "Responsabilité", "Justification Bloc 2"],
                ["Frontend", "apps/web/app, apps/web/components", "Pages, formulaires, navigation, timer, dashboard, settings.", "Prototype ergonomique, accessible, testable."],
                ["API", "apps/api/src/routes, controllers, services, repositories", "Routes Hono, logique métier, accès données, erreurs.", "Maintenabilité et séparation des responsabilités."],
                ["Contrats", "packages/shared/src", "Schemas Zod, types partagés, validations.", "Réduction des divergences frontend/backend."],
                ["Données", "apps/api/src/db/schema.ts, drizzle", "Modèle PostgreSQL, migrations, requêtes typées.", "Persistance structurée et évolutive."],
                ["Auth", "Auth.js, OAuth Google, server-api.ts", "Sessions, routes protégées, appels API serveur.", "Sécurité et séparation client/serveur."],
                ["IA", "apps/api/src/services/ai.service.ts, workout-ai.service.ts, program-ai.service.ts", "Appel OpenAI, retry, validation JSON, timeout.", "Génération fiable et non exposée au navigateur."],
                ["Qualité", "apps/api/tests, apps/web/components/Timer.test.ts", "Tests unitaires et non-régression.", "C2.2.2 et C2.2.3."],
            ],
            [2.2 * cm, 4.6 * cm, 5.0 * cm, 4.8 * cm],
            STYLES,
        )
    )
    story.append(
        bullets(
            [
                "Le frontend n’appelle pas OpenAI directement ; il passe par des Server Actions et l’API interne.",
                "L’API isole la logique IA dans des services testés, ce qui permet de simuler les erreurs OpenAI en unit tests.",
                "Les repositories limitent l’accès aux données utilisateur via ownership check.",
                "Le monorepo garde les contrats partagés au même endroit pour éviter les écarts entre formulaires et API.",
            ],
            STYLES,
        )
    )

    page_title(story, "5. Prototype et parcours utilisateur")
    story.append(
        table(
            [
                ["Parcours", "Route", "Validation attendue", "Preuve"],
                ["Accueil connecté", "/", "Navigation principale, accès séance/programme/dashboard.", "Capture B2-A04."],
                ["Génération séance", "/generate", "Formulaire complet, validations, modèle OpenAI visible sans clé utilisateur.", "Capture B2-A05 + logs POST 201."],
                ["Détail/timer", "/workouts/[id]", "Programme, étapes, timer, accessibilité dynamique.", "Capture B2-A06."],
                ["Historique", "/workouts", "Liste utilisateur, filtres sport/niveau, cartes.", "Capture B2-A17 historique."],
                ["Dashboard", "/dashboard", "Séances créées, terminées, effort, temps, dernières séances.", "Capture B2-A07."],
                ["Programme", "/programs/generate", "Formulaire multi-semaines, contraintes, rythme.", "Capture B2-A17 programme."],
                ["Settings IA", "/settings", "OpenAI côté serveur, modèle paramétrable, pas de clé utilisateur.", "Capture B2-A17 settings."],
            ],
            [3.2 * cm, 3.0 * cm, 6.0 * cm, 4.4 * cm],
            STYLES,
        )
    )

    page_title(story, "6. OpenAI côté serveur")
    story.append(
        table(
            [
                ["Question jury", "Réponse à donner"],
                ["Qui fournit la clé OpenAI ?", "Alcide / l’équipe projet. L’utilisateur final ne renseigne jamais sa clé API."],
                ["Où est stockée la clé ?", "Dans les variables d’environnement serveur de l’API Vercel : `OPENAI_API_KEY`."],
                ["Le navigateur voit-il la clé ?", "Non. Les recherches dans HTML/logs n’exposent ni `OPENAI_API_KEY`, ni `apiKey`."],
                ["Y a-t-il d’autres fournisseurs ?", "Non pour le rendu Bloc 2 : OpenAI uniquement, avec clé API gérée côté serveur par Alcide."],
                ["Preuve de fonctionnement ?", "Logs B2-A17 : deux `POST /workouts/generate` en 201 avec `provider: 'openai'` ; B2-A18 : génération séance et programme réussies en navigateur connecté."],
                ["Gestion des erreurs IA ?", "Timeout, JSON invalide et 429 couverts par tests unitaires ; CR-013 garde la coupure réelle comme relance optionnelle."],
            ],
            [4.6 * cm, 12.0 * cm],
            STYLES,
        )
    )

    page_title(story, "7. Déploiement, CI/CD et exploitation")
    story.append(
        table(
            [
                ["Élément", "État", "Preuve", "Remarque"],
                ["Web Vercel", "Disponible", "`https://ai-sport-web.vercel.app`", "HTTP 200."],
                ["API Vercel", "Disponible", "`https://ai-sport-api.vercel.app/health`", "HTTP 200, version 0.12.0."],
                ["Health API", "200 OK", "`GET /health` version 0.12.0", "Contrôle du 16 juillet 2026."],
                ["Health Web", "200 OK", "`GET /api/health` version 0.12.0", "Contrôle du 16 juillet 2026."],
                ["CI - Alcide", "Succès", "Run 29489995458", "Preuve CI verte sur `533f17b`."],
                ["Monitoring", "Succès", "Run 29496100988", "Production health vert."],
                ["CD - Vercel", "Code corrigé, config à faire", "Run 29490217892 : VERCEL_TOKEN invalide", "Action côté GitHub/Vercel."],
            ],
            [3.0 * cm, 3.0 * cm, 5.2 * cm, 5.4 * cm],
            STYLES,
        )
    )

    page_title(story, "8. Tests, couverture, build et qualité")
    story.append(
        table(
            [
                ["Contrôle", "Résultat", "Interprétation"],
                ["Vitest API", "12 fichiers, 70 tests passés", "Services, controllers, middlewares, health, env."],
                ["Vitest Web", "1 fichier, 1 test passé", "Timer couvert côté composant critique."],
                ["Coverage API", "88.1% statements, 79.34% branches, 95.08% functions", "Seuil RNCP/local 70% dépassé."],
                ["Typecheck API/Web/shared", "OK", "Contrats TypeScript cohérents."],
                ["Build API", "OK", "Compilation TypeScript backend validée."],
                ["Build Web Next.js", "OK, 12 pages générées", "Production build frontend validé."],
                ["git diff --check", "OK", "Pas d’espaces parasites détectés."],
                ["E2E smoke", "48 exécutions documentées au 2026-06-30", "Accessibilité et routes publiques couvertes."],
            ],
            [4.0 * cm, 4.6 * cm, 8.0 * cm],
            STYLES,
        )
    )

    page_title(story, "9. Sécurité, accessibilité et données")
    story.append(
        table(
            [
                ["Risque", "Mesure", "Preuve"],
                ["Accès API non autorisé", "`SERVICE_SECRET` entre Web et API.", "401 attendus sur appels directs sans secret."],
                ["Secret exposé au client", "`server-only`, variables serveur, aucun `OPENAI_API_KEY` dans HTML/logs.", "B2-A17."],
                ["Entrées invalides", "Validation Zod formulaires et API.", "CR-011, CR-012, schemas shared."],
                ["Injection SQL", "Drizzle ORM + validation.", "CR-030."],
                ["XSS", "Échappement React + validation.", "CR-031."],
                ["Abus IA", "Rate limiting utilisateur.", "CR-035, CR-036."],
                ["Mauvaise config", "Fail-fast env API.", "CR-042, validate-env tests."],
                ["Accessibilité", "Labels, focus, skip link, aria-live, aria-busy.", "CR-025, smoke Playwright/axe."],
            ],
            [4.0 * cm, 6.6 * cm, 6.0 * cm],
            STYLES,
        )
    )

    page_title(story, "10. Cahier de recettes complet")
    story.append(
        p(
            "Le cahier de recettes contient 33 scénarios documentés. Le tableau ci-dessous reprend chaque scénario avec son statut et le résultat obtenu. "
            "Le seul scénario gardé en relance est CR-013 : il est couvert par tests unitaires mais pas rejoué en coupure OpenAI réelle.",
            STYLES["BodySmall"],
        )
    )
    recipe_rows = [["ID", "Fonctionnalité", "Statut", "Résultat obtenu"]] + parse_recipe_rows()
    story.append(table(recipe_rows, [1.5 * cm, 4.2 * cm, 2.0 * cm, 8.9 * cm], STYLES))

    story.append(PageBreak())
    page_title(story, "11. Plan de correction des bogues")
    story.append(
        table(
            [
                ["ID", "Priorité", "Anomalie", "Correction / statut"],
                ["B2-BUG-001", "P0", "CR-013 erreur API OpenAI seulement partiellement rejouée.", "Corrigé documentaire ; relance réelle ouverte si exigée."],
                ["B2-BUG-002", "P1", "Healthcheck API attendu incomplet.", "Corrigé, JSON aligné sur `status`, `service`, `timestamp`, `version`."],
                ["B2-BUG-003", "P1", "Dashboard attendu trop ancien.", "Corrigé, scénario aligné sur les agrégats actuels."],
                ["B2-BUG-004", "P1", "E2E complets listés mais non relancés.", "Smoke validé ; generate.spec.ts marqué explicitement à relancer."],
                ["B2-BUG-005", "P1", "Audit sécurité high à vérifier.", "Audit high/critical vert, vulnérabilités low/moderate suivies."],
                ["B2-BUG-006", "P1", "Manuel utilisateur absent.", "Manuel créé."],
                ["B2-BUG-007", "P1", "Manuel mise à jour absent.", "Manuel créé."],
                ["B2-BUG-008", "P2", "Pack d’annexes non indexé.", "Index d’annexes créé et B2-A17 ajouté."],
            ],
            [2.1 * cm, 1.8 * cm, 6.5 * cm, 6.2 * cm],
            STYLES,
        )
    )
    story.append(
        bullets(
            [
                "Processus de correction : détection, qualification, reproduction, analyse, correction, non-régression, validation, traçabilité.",
                "Une anomalie n’est close que si le résultat attendu est vérifié et relié à une preuve ou un test.",
                "Les anomalies restantes ne bloquent pas le Bloc 2 car elles sont soit externes, soit optionnelles, soit transparentes.",
            ],
            STYLES,
        )
    )

    page_title(story, "12. Documentation utilisateur et mise à jour")
    story.append(
        table(
            [
                ["Document", "Rôle", "Contenu utile au jury"],
                ["Manuel utilisateur", "Exploitation fonctionnelle", "Accès, login, génération séance/programme, historique, timer, dashboard, suppression, accessibilité, problèmes courants."],
                ["Manuel de mise à jour", "Exploitation technique", "Branche, diff, dépendances, migrations, tests, version, déploiement, rollback, traçabilité."],
                ["Guide de déploiement", "Mise en production", "Variables Vercel, GitHub Actions, Vercel, Neon, healthchecks, OAuth callback."],
                ["CI/CD", "Qualité et livraison", "Gates CI, secrets, workflow CD, smoke tests, rollback."],
                ["Cahier de recettes", "Validation fonctionnelle", "33 scénarios et addendum production."],
                ["Annexes Bloc 2", "Preuves", "B2-A01 à B2-A18, captures et contrôles datés."],
            ],
            [3.8 * cm, 4.0 * cm, 8.8 * cm],
            STYLES,
        )
    )

    story.append(PageBreak())
    page_title(story, "13. Captures du prototype")
    captures = [
        ("B2-A04-accueil-connecte-production-2026-07-15.png", "Accueil connecté : navigation principale et accès aux parcours Bloc 2."),
        ("B2-A05-generation-seance-production-2026-07-15.png", "Génération séance : formulaire complet, modèle OpenAI, aucune clé API utilisateur."),
        ("B2-A06-detail-timer-production-2026-07-15.png", "Détail séance : programme et timer utilisable."),
        ("B2-A07-dashboard-production-2026-07-15.png", "Dashboard : progression, séances créées/terminées, effort et historique."),
        ("B2-A17-settings-openai-production-2026-07-15.png", "Settings : OpenAI côté serveur, configuration contrôlée par l’application."),
        ("B2-A17-generation-programme-production-2026-07-15.png", "Programme : formulaire de cycle progressif multi-semaines."),
        ("B2-A17-historique-workouts-production-2026-07-15.png", "Historique : liste des séances utilisateur et filtres."),
        ("B2-A18-generation-seance-after-wait-production-2026-07-16.png", "B2-A18 : séance générée réellement en production, détail et timer visibles."),
        ("B2-A18-generation-programme-current-production-2026-07-16.png", "B2-A18 : programme généré réellement en production, 9 séances planifiées."),
    ]
    for index, (file_name, caption) in enumerate(captures):
        story.extend(image_block(SCREENSHOTS / file_name, caption, max_height=12.5 * cm))
        if index in {1, 3, 5}:
            story.append(PageBreak())

    page_title(story, "14. Annexes et traçabilité")
    story.append(
        table(
            [
                ["ID", "Compétence", "Pièce", "Statut"],
                ["B2-A01", "C2.1.1", "Healthcheck API production", "Présent dans B2-A17."],
                ["B2-A02", "C2.1.1", "Healthcheck Web production", "Présent dans B2-A17."],
                ["B2-A03", "C2.1.2", "CI GitHub verte", "Run 29489995458."],
                ["B2-A04", "C2.2.1", "Capture accueil connecté", "Présent."],
                ["B2-A05", "C2.2.1", "Capture génération séance", "Présent."],
                ["B2-A06", "C2.2.1", "Capture détail/timer", "Présent."],
                ["B2-A07", "C2.2.1", "Capture dashboard", "Présent."],
                ["B2-A08", "C2.2.2", "Sortie tests", "Présent."],
                ["B2-A09", "C2.2.2", "Coverage API", "Présent."],
                ["B2-A10", "C2.2.3", "Playwright smoke/axe", "Présent smoke."],
                ["B2-A11", "C2.2.3", "Audit sécurité", "Présent."],
                ["B2-A12", "C2.3.1", "Cahier de recettes", "Présent."],
                ["B2-A13", "C2.3.2", "Plan correction bogues", "Présent."],
                ["B2-A14", "C2.4.1", "Manuel utilisateur", "Présent."],
                ["B2-A15", "C2.4.1", "Manuel mise à jour", "Présent."],
                ["B2-A16", "C2.1.1 / C2.1.2", "Build/lint/typecheck", "Présent."],
                ["B2-A17", "Toutes", "Validation historique production OpenAI", "Présent."],
                ["B2-A18", "Toutes", "Validation finale post-fix Vercel 2026-07-16", "Présent."],
            ],
            [1.9 * cm, 3.0 * cm, 8.0 * cm, 3.7 * cm],
            STYLES,
        )
    )

    page_title(story, "15. Conclusion à présenter")
    story.append(
        p(
            "Le Bloc 2 est prêt à être remis au jury. L’application est fonctionnelle, déployée, testée, documentée et reliée à un cahier de recettes. "
            "Les preuves finales sont datées du 16 juillet 2026 : CI main verte, monitoring production vert, healthchecks, générations réelles séance/programme et captures connectées. "
            "La position à tenir est claire : le produit est conforme techniquement, avec une action de configuration externe à finaliser pour rendre le workflow CD GitHub custom totalement vert.",
            STYLES["BadgeOk"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        bullets(
            [
                "Ne pas annoncer que `CD - Vercel` custom est vert tant que `VERCEL_TOKEN` n’est pas renouvelé.",
                "Ne pas annoncer une coupure OpenAI réelle CR-013 si elle n’a pas été rejouée.",
                "Dire explicitement qu’OpenAI est géré côté serveur par Alcide, et que l’utilisateur n’a pas à saisir de clé.",
                "Utiliser ce PDF complet pour le dépôt, et le PDF court comme support de synthèse rapide.",
            ],
            STYLES,
        )
    )
    return story


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        rightMargin=1.45 * cm,
        leftMargin=1.45 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.45 * cm,
        title="Dossier Complet Jury Bloc 2 RNCP39583 - Alcide",
        author="Alcide / Kevin",
    )
    doc.build(build_story(), onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(OUT_PDF)


if __name__ == "__main__":
    main()
