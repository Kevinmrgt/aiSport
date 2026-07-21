# Revue de sécurité OWASP Top 10 — Alcide

> Livrable transversal utilisé par le Bloc 2, compétence C2.2.3
> Revue de code : 2026-07-21 - baseline de production `ac02d219...`

## Méthode et échelle

Cette revue suit les dix catégories OWASP Top 10 2021. Elle distingue :

- **contrôlé** : mesure présente et testée sur la version candidate ;
- **partiel** : mesure utile présente, avec risque résiduel identifié ;
- **à prouver** : code présent mais preuve finale non encore exécutée.

`pnpm audit` ne couvre que les vulnérabilités connues des dépendances. Il ne
constitue pas à lui seul une revue OWASP Top 10.

## A01 — Broken Access Control — contrôlé

Contrôles :

- OAuth Google et vérification `auth()` sur les routes Web privées ;
- secret interservice entre Next.js et Hono ;
- identité utilisateur transmise côté serveur uniquement ;
- repositories workout/program vérifiant l'ownership ;
- service session-log vérifiant workout/program avant insertion et dérivant les
  métadonnées depuis la ressource détenue par l'utilisateur ;
- UUID validés avant PostgreSQL.

Preuve : B2-A19 consigne 8/8 tests PostgreSQL réels avec
deux utilisateurs, dont l'isolation et l'ownership workout/program/session-log.
Les tests ont été rejoués dans le job PostgreSQL de la CI `29817362423` sur
`main`. Les tests middleware et controllers sont aussi exécutés dans la suite
unitaire. L'existence d'une FK seule n'est pas utilisée comme preuve d'ownership.

Risque résiduel : `SERVICE_SECRET` est une frontière de confiance à fort impact.
Sa rotation et son stockage Vercel/GitHub doivent être documentés.

## A02 — Cryptographic Failures — partiel

Contrôles de code : fichiers `.env` ignorés, exemples sans valeur secrète, TLS
observé sur les URL de production et secrets OpenAI/interservice utilisés dans
des modules serveur. Compose rend les valeurs requises. L'inspection finale des
bundles/réseau et des attributs du cookie Auth.js sur la candidate déployée n'a
pas encore été exécutée ; aucune absence absolue de fuite n'est affirmée ici.

Risque résiduel : les journaux peuvent contenir effort et notes de douleur,
liés à l'identité. Une page de confidentialité informe l'utilisateur, mais la
durée de conservation, l'export et la suppression de compte doivent être
formalisés et, s'ils sont annoncés, réellement implémentés.

## A03 — Injection — contrôlé

Les chaînes utilisateur ne sont pas nécessairement rejetées parce qu'elles
ressemblent à du SQL. La protection repose sur les requêtes paramétrées Drizzle,
complétées par la validation de forme Zod. Le cahier de recettes ne prétend plus
que Zod bloque la chaîne `'; DROP TABLE ...`.

Preuves : test PostgreSQL avec contenu SQL-like conservé comme donnée, test XSS
au rendu navigateur, recherche d'appels `eval`/`exec` et revue des requêtes SQL.

## A04 — Insecure Design — partiel

Contrôles : architecture en couches, schémas partagés, invariants métier sur les
sorties IA, timeouts, retry borné, erreurs typées, contrôle d'ownership et limite
de taille des entrées.

Risque résiduel majeur : le rate limit utilise un `Map` mémoire par processus.
Il protège un processus unique mais ne garantit pas un quota global sur Vercel
avec cold starts ou plusieurs instances. Le passage à un store distribué
atomique reste nécessaire avant de présenter cette limite comme garantie de
production.

## A05 — Security Misconfiguration — partiel

Contrôles : `secureHeaders`, CORS restreint, erreurs sans stack client,
variables obligatoires, readiness DB et présence de configuration OpenAI,
images non-root, directives CSP
`object-src`, `base-uri`, `form-action` et `frame-ancestors`.

Risques résiduels :

- `unsafe-inline` reste présent pour scripts/styles, notamment pour les besoins
  de Next.js ; une CSP à nonce demanderait une évolution dédiée ;
- le liveness check ne doit pas être confondu avec readiness ;
- les secrets et callbacks OAuth de production restent une configuration
  externe à vérifier.

## A06 — Vulnerable and Outdated Components — contrôlé

Contrôles : lockfile, installation figée, audit dès le niveau low rendu bloquant en
CI, versions Next.js/React situées sur une ligne corrigée.

Contrôle local du 2026-07-20 sur la candidate `0.13.0-rc.3` :
`pnpm audit --audit-level=low` termine avec le code 0 et indique
`No known vulnerabilities found`. Les six alertes précédentes ont été corrigées
par des overrides ciblés, puis le lint, les types, 198 tests, les builds et
`drizzle-kit check` ont été rejoués. La CI `main` `29747228594` a ensuite
confirmé ce résultat avec le seuil bloquant `low`.

Actualisation du 2026-07-21 : quatre nouveaux avis `high` sur les dépendances
transitives `brace-expansion` et `shell-quote` ont fait échouer la CI
`29815728217`. Les overrides ont été déplacés vers 1.1.16, 2.1.2, 5.0.7 et
1.9.0. L'audit local ne remonte plus de vulnérabilité connue et la CI complète
`29816347653` est verte. B2-A27 conserve l'échec, la correction et la
contre-vérification.

## A07 — Identification and Authentication Failures — contrôlé avec limites

Contrôles de code : Google OAuth, stratégie de session JWT Auth.js avec durée
maximale configurée et vérification serveur sur chaque parcours protégé. Les
attributs réels du cookie et l'expiration doivent être relevés sur la candidate
déployée ; ils ne sont pas considérés comme prouvés par la seule configuration.

La suite Playwright authentifiée n'utilise plus une fixture vide. B2-A26 prouve
la capture d'un vrai `storageState` Auth.js après connexion Google manuelle, la
vérification de l'identité, le filtrage des cookies sur le domaine Alcide et
4/4 scénarios en CI `29817741589`. La déconnexion et l'accès sans session sont
couverts par B2-A25. La branche de finalisation ajoute le reflow mobile et axe,
6/6 localement. L'expiration et la rotation automatique restent à tester.

## A08 — Software and Data Integrity Failures — contrôlé

Contrôles : lockfile, `--frozen-lockfile`, CI avant CD, migrations versionnées,
validation Zod des sorties OpenAI et images construites depuis le SHA.

Le CD manuel contournant la CI est supprimé. Les actions GitHub sont épinglées
par SHA, la CLI Vercel est appelée avec une version explicite et le SHA déployé
est conservé dans le manifeste. La CI `29817362423` puis la CD `29817698665`
prouvent l'enchaînement sur la baseline `ac02d219...`.

## A09 — Security Logging and Monitoring Failures — partiel

Les tentatives d'auth invalides, erreurs applicatives, appels IA et erreurs DB
disposent d'appels de journalisation dans le code. Le monitoring planifié de
production a réussi sur la candidate et la mesure B2-A29 a obtenu 150/150
réponses valides sur les trois healthchecks.

Risque résiduel : `console.*` n'offre ni corrélation systématique, ni rétention,
ni alerte sécurité dédiée. Un logger structuré, un identifiant de requête, une
politique de masquage et un export vers un outil d'observabilité restent à
mettre en place.

## A10 — Server-Side Request Forgery — contrôlé

L'URL OpenAI est fixe côté serveur et aucune URL fournie par l'utilisateur n'est
utilisée par `fetch`. Le budget global de génération est borné sous la durée
maximale Vercel ; les appels Web possèdent également un timeout.

Preuves : tests timeout/retry et revue des appels réseau serveur.

## Synthèse des risques

| Catégorie                 | État candidat | Preuve finale requise                            |
| ------------------------- | ------------- | ------------------------------------------------ |
| A01 Accès                 | Contrôlé      | PostgreSQL multi-utilisateur + API               |
| A02 Cryptographie/données | Partiel       | politique données et secrets                     |
| A03 Injection             | Contrôlé      | DB réelle + navigateur                           |
| A04 Conception            | Partiel       | stratégie rate limit distribué ou risque accepté |
| A05 Configuration         | Partiel       | CSP à nonce et configuration externe             |
| A06 Composants            | Contrôlé      | audit brut du lockfile final                     |
| A07 Authentification      | Contrôlé      | Playwright avec vrai état Auth.js                |
| A08 Intégrité             | Contrôlé      | CI/CD, actions épinglées et SHA                  |
| A09 Logs                  | Partiel       | preuve monitoring et limites documentées         |
| A10 SSRF                  | Contrôlé      | tests timeout + revue URL fixe                   |

La revue ne conclut pas « 10/10 sans risque ». Elle fournit au jury les
contrôles exécutés et les risques résiduels : confidentialité, rate limit
distribué, CSP à nonce, expiration de session et observabilité structurée.
