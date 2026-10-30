# Audit de préparation à la production — Alcide

Date : **29 octobre 2026**. Cible confirmée par le propriétaire : **le dépôt
aiSport actuel sur `https://www.alcideai.fr`**. Coordinateur : Codex.

**Avis : différer l'ouverture publique du candidat.** La base technique passe
de nombreux contrôles, mais des défauts concrets et des conditions de
livraison restent à traiter. Cet audit est terminé lorsque ses constats et
ses preuves sont livrés ; cela ne signifie pas que l'application est prête
ou qu'elle a été déployée. Aucun incident P0, accès à des données privées ou
danger corporel réel n'a été démontré.

## Ce qui a été audité

Le candidat est le commit `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche
`codex/nettoyage-projet`. Sept agents dédiés ont examiné des domaines distincts :

| Domaine                                            | Agent              | Rapport                         |
| -------------------------------------------------- | ------------------ | ------------------------------- |
| Sécurité, authentification et dépendances          | `audit_security`   | [Sécurité](security.md)         |
| Infrastructure, CI/CD, sauvegardes et exploitation | `audit_operations` | [Exploitation](operations.md)   |
| Tests, qualification et fiabilité des parcours     | `audit_quality`    | [Qualité](quality.md)           |
| Données personnelles et préparation juridique      | `audit_privacy`    | [Vie privée](privacy.md)        |
| Qualité sportive, sûreté et consommation IA        | `audit_ai`         | [IA](ai.md)                     |
| UX, mobile, accessibilité et contenus              | `audit_ux`         | [Expérience utilisateur](ux.md) |
| PostgreSQL, intégrité, migration et performance    | `audit_data`       | [Données](data.md)              |

Une revue croisée QA a recherché les contradictions entre les rapports.
Les sujets communs — budget IA, logs, identité, restauration — sont regroupés
ci-dessous pour éviter de les compter plusieurs fois. Les résultats réellement
exécutés et leurs limites sont dans [validation.md](validation.md).

## Trois états à distinguer avant la bascule

1. **Code candidat local** : c'est la version sur laquelle portent les
   contrôles et les constats de code.
2. **GitHub** : `main` distant observé à `fd750f0c6ca9a8bf06bf38c0f03d6a08534d8f5f` ;
   dernier CD trouvé réussi le 14 septembre sur ce SHA. Le commit candidat
   n'a pas de CI distante confirmée au moment de l'audit.
3. **Domaine public** : l'alias Web Vercel redirige vers `www.alcideai.fr`.
   L'interface observée diffère du candidat : accès jury/bêta, route tarifs,
   crédits et paiements de test. Aucun paiement ou accès temporaire n'a été
   essayé. Ces éléments ont disparu du candidat ; il faut qualifier leur
   remplacement, sans réintroduire une facturation absente de ce dépôt.

Les sondes Web/API répondent et annoncent `0.13.0-rc.8`, mais n'exposent pas
de SHA : **la révision actuellement servie n'est pas établie**. Le dernier CD
GitHub connu ne suffit pas à la déduire. La première étape de livraison doit
donc confirmer domaines, projets Vercel, API, base et configuration OAuth,
puis inventorier les éventuelles données existantes.

## Constats qui déterminent la décision

### Défauts ou échecs directement constatés

- **Programmes sportifs altérés** : la normalisation efface descriptions,
  conseils, séries et répétitions, puis force les durées. Une fixture passée
  au vrai module transforme deux exercices de 20 secondes en deux blocs de
  600 secondes. Le total devient correct, sans garantie sportive. La
  transformation intervient aussi à la lecture des programmes historiques
  (AI-01). Aucun dommage réel n'est affirmé.
- **Identité persistée par e-mail** : le middleware reçoit l'identifiant
  Google mais résout le compte par e-mail. Une simulation du vrai middleware
  démontre collision entre sujets et fragmentation après changement d'adresse.
  La possibilité de prendre le contrôle d'un vrai compte n'a pas été testée.
  Il faut une association stable au sujet fournisseur et une migration
  contrôlée des identités (SEC-01).
- **Dépendances** : le registre signale 20 avis de production, dont
  4 critiques, 7 élevés et 9 modérés. Ce sont des avis affectant le lockfile,
  avec des conditions d'exploitation différentes ; la RCE propre à Windows
  ne doit pas être transposée automatiquement à Vercel/Linux. L'audit échoue
  actuellement ; mises à jour et qualification sont nécessaires (SEC-02,
  [inventaire daté](dependency-advisories.json)).
- **Smoke navigateur incomplet** : 48 tests sur 50 réussissent. Dans Chromium
  et Firefox, le détail d'entraînement anonyme reste sur un squelette au lieu
  de rediriger vers la connexion avec le serveur de développement. Aucune
  donnée privée n'est visible. Après reconstruction, les quatre contrôles
  ciblés sous `next start` réussissent dans les deux navigateurs en moins de
  deux secondes : la régression n'est pas reproduite en mode production.
  La fiabilité du smoke reste un P2, sans cause précise établie (QA-06,
  [résultats détaillés](validation.md)).

### Garanties ou décisions encore manquantes

- Le limiteur IA est local à chaque processus, sans réservation de budget
  durable. Un programme peut engager jusqu'à huit appels. Ni consommation
  réelle par opération, ni plafond global, ni coupure budgétaire n'est prouvé
  (SEC-03, AI-03, OPS-06).
- La conformité structurelle du JSON ne qualifie pas l'adéquation sportive.
  Il manque un corpus de scénarios et une revue humaine compétente des
  contenus effectivement affichés après normalisation (AI-02).
- Les formulaires sollicitent des informations de douleur et peuvent en
  transmettre à l'IA via les contraintes. Il faut décider de leur retrait ou
  établir un cadre adapté, finaliser notice/contact/mentions, conservation et
  procédure de droits. La suppression d'une séance conserve ses journaux,
  dont les notes ; ce comportement doit être expliqué et borné. Les contrats
  et réglages privés des prestataires restent des preuves à obtenir, sans
  présumer leur absence (PRIV-01 à 06).
- La restauration, les objectifs de reprise, la compatibilité de la base
  existante et les limites effectives des comptes hébergés ne sont pas
  vérifiés. Les smokes CD ne contrôlent pas le SHA servi ; migrations manuelles
  et CD ont des groupes de concurrence distincts (OPS-01 à 06, DATA-01).
- La recette de livraison ne couvre pas encore une connexion Google neuve,
  une génération réelle suivie de sa persistance et l'isolation entre deux
  comptes sur l'origine finale (QA-01, QA-04).

Ces absences de preuve ne sont pas des incidents démontrés. Elles définissent
ce qu'il faut vérifier pour décider d'une ouverture maîtrisée.

## Plan de mise en production, dans l'ordre

P1 désigne une condition à fermer avant ouverture publique. P2 désigne une
amélioration à prioriser selon le public et le niveau de service convenus.
Chaque lot ci-dessous nécessite une preuve ; rédiger son plan ou son test ne
suffit pas à le terminer.

| Ordre     | Lot                                                      | Responsable proposé                          | Preuve de sortie attendue                                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — P1    | Identifier et protéger la cible                          | Livraison + propriétaire des comptes         | Correspondance domaine/projets/API/base/OAuth, révisions connues, données existantes inventoriées, sauvegarde identifiée et restauration sur une cible distincte réussie.                                                                                          |
| 2 — P1    | Corriger les dépendances                                 | Maintenance + QA                             | Lockfile corrigé, audit réexécuté, exceptions éventuelles justifiées et bornées, lint/types/tests/build réussis.                                                                                                                                                   |
| 3 — P1    | Stabiliser les identités                                 | Backend/authentification                     | Association au sujet Google, rapprochement contrôlé des comptes existants, deux comptes isolés et conservation de l'identité après changement d'e-mail.                                                                                                            |
| 4 — P1    | Corriger et qualifier les programmes sportifs            | Backend IA + référent sportif + QA           | Consignes préservées, règles de durée cohérentes, historique traité explicitement, corpus critique validé sur la sortie affichée.                                                                                                                                  |
| 5 — P1    | Borner la consommation et la charge                      | Backend + exploitation + produit             | Budget persistant par compte/global, limite de concurrence, mesure des appels et tokens, test multi-instance, coupure et alerte vérifiées ; offres et timeouts effectifs relevés.                                                                                  |
| 6 — P1    | Finaliser données personnelles et informations publiques | Responsable du service + backend + juridique | Contact et mentions réels, cadre de la douleur décidé, conservation/purge et exercice des droits testés, inventaire des prestataires vérifié. Une procédure manuelle de droits peut convenir si elle est opérationnelle.                                           |
| 7 — P1    | Fiabiliser la chaîne de livraison                        | CI/CD + exploitation                         | CI du commit final, contrôle JSON/SHA sur build et alias, migrations sérialisées, compatibilité ancienne/nouvelle API et schéma, protections GitHub adaptées, repli testé.                                                                                         |
| 8 — P1    | Fermer les échecs et la recette de bout en bout          | QA + frontend/backend                        | Cause du smoke résolue ou environnement précisément corrigé sans masquer le test ; connexion Google neuve, séance et programme réels, rechargement, timer/journal/dashboard, suppression, panne IA et deux comptes isolés. Résultats datés sur la révision livrée. |
| 9 — P1/P2 | Valider exploitation et ergonomie de lancement           | Exploitation + frontend + QA                 | Alerte réellement reçue, responsable et délai de reprise définis ; déconnexion mobile et erreurs de formulaire accessibles, transitions privées vérifiées au clavier/lecteur d'écran.                                                                              |
| 10        | Livrer progressivement sur le domaine confirmé           | Responsable livraison + propriétaire         | Promouvoir le candidat qualifié, vérifier SHA Web/API et migrations sur le domaine, refaire le parcours critique, observer erreurs/coûts et conserver le couple de déploiements précédent.                                                                         |

Les lots 2 à 6 peuvent être préparés en parallèle une fois leurs fichiers et
responsabilités attribués. Les changements d'identité, de données sensibles
et de normalisation doivent converger vers un seul plan de migration et une
recette sur copie isolée avant toute migration hébergée.

## Améliorations complémentaires à planifier

Les rapports détaillent notamment CSP à nonce, validation de configuration,
masquage/corrélation des logs, traitement des refus et réponses IA tronquées,
annulation des appels parallèles, idempotence des soumissions, contraintes et
validation des données, pagination stable et statistiques cohérentes.

Le rapport UX identifie une déconnexion masquée sur petit écran, une erreur
de contraintes non affichée, la perte de destination après connexion et
l'absence de reprise du timer après rechargement. Les textes de conception,
jauges sans source et métadonnées génériques sont de moindre priorité.
Aucun bandeau cookies n'est recommandé pour les seuls cookies techniques
constatés ; l'inventaire doit être confirmé sur la version finale.

## Limites de l'avis et livrables

L'audit comporte lecture du code, vérifications locales avec PostgreSQL
temporaire, contrôles publics non destructifs, métadonnées GitHub et sources
officielles pour les recommandations juridiques et fournisseur. Les rapports
précisent les preuves et les limites de chaque constat.

Aucun accès aux comptes privés Vercel/Neon/OpenAI, aucune inspection des
données utilisateurs, connexion Google neuve, génération payante, restauration
hébergée, charge distante ou bascule de production n'a été effectué. Aucun
code applicatif ni réglage distant n'a été modifié. Les rapports constituent
la livraison de cette demande ; les corrections et la mise en production
restent le travail décrit par le plan ci-dessus.
