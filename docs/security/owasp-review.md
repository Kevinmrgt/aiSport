# Revue de sécurité OWASP Top 10 — Alcide

> Livrable transversal utilisé par le Bloc 2, compétence C2.2.3
> Revue de code : 2026-07-20 — résultats d'exécution à rattacher au SHA final

## Méthode et échelle

Cette revue suit les dix catégories OWASP Top 10 2021. Elle distingue :

- **contrôlé** : mesure présente et testée sur la version candidate ;
- **partiel** : mesure utile présente, avec risque résiduel identifié ;
- **à prouver** : code présent mais preuve finale non encore exécutée.

`pnpm audit` ne couvre que les vulnérabilités connues des dépendances. Il ne
constitue pas à lui seul une revue OWASP Top 10.

## A01 — Broken Access Control — à prouver

Contrôles :

- OAuth Google et vérification `auth()` sur les routes Web privées ;
- secret interservice entre Next.js et Hono ;
- identité utilisateur transmise côté serveur uniquement ;
- repositories workout/program vérifiant l'ownership ;
- service session-log vérifiant workout/program avant insertion et dérivant les
  métadonnées depuis la ressource détenue par l'utilisateur ;
- UUID validés avant PostgreSQL.

Preuve locale intermédiaire : B2-A19 consigne 8/8 tests PostgreSQL réels avec
deux utilisateurs, dont l'isolation et l'ownership workout/program/session-log.
Les tests middleware et controllers sont exécutés dans la suite unitaire locale.
Ces résultats portent sur `69b21ef-dirty` et restent à rejouer en CI sur le SHA
final. L'existence d'une FK seule ne prouve pas l'ownership.

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

## A03 — Injection — contrôlé à confirmer en intégration

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

## A06 — Vulnerable and Outdated Components — à prouver

Contrôles : lockfile, installation figée, audit dès le niveau low rendu bloquant en
CI, versions Next.js/React situées sur une ligne corrigée.

Contrôle local du 2026-07-20 sur la candidate `0.13.0-rc.3` :
`pnpm audit --audit-level=low` termine avec le code 0 et indique
`No known vulnerabilities found`. Les six alertes précédentes ont été corrigées
par des overrides ciblés, puis le lint, les types, 198 tests, les builds et
`drizzle-kit check` ont été rejoués. La CI `main` `29747228594` a ensuite
confirmé ce résultat avec le seuil bloquant `low`.

## A07 — Identification and Authentication Failures — à prouver

Contrôles de code : Google OAuth, stratégie de session JWT Auth.js avec durée
maximale configurée et vérification serveur sur chaque parcours protégé. Les
attributs réels du cookie et l'expiration doivent être relevés sur la candidate
déployée ; ils ne sont pas considérés comme prouvés par la seule configuration.

La suite Playwright authentifiée n'utilise plus une fixture vide. Elle exige un
vrai `storageState` Auth.js fourni explicitement ; à défaut, elle est marquée
ignorée et non faussement verte. La preuve finale doit inclure connexion,
expiration/déconnexion et accès sans session.

## A08 — Software and Data Integrity Failures — partiel

Contrôles : lockfile, `--frozen-lockfile`, CI avant CD, migrations versionnées,
validation Zod des sorties OpenAI et images construites depuis le SHA.

Le CD manuel contournant la CI est supprimé. La CLI Vercel doit être figée à une
version explicite, les actions GitHub révisées périodiquement et le SHA déployé
conservé dans le manifeste.

## A09 — Security Logging and Monitoring Failures — partiel

Les tentatives d'auth invalides, erreurs applicatives, appels IA et erreurs DB
disposent d'appels de journalisation dans le code. Un monitoring de healthchecks
a réellement tourné sur la production historique `0.12.0` ; son exécution sur
la candidate reste à prouver.

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
| A01 Accès                 | À prouver     | PostgreSQL multi-utilisateur + API               |
| A02 Cryptographie/données | Partiel       | politique données et secrets                     |
| A03 Injection             | À confirmer   | DB réelle + navigateur                           |
| A04 Conception            | Partiel       | stratégie rate limit distribué ou risque accepté |
| A05 Configuration         | Partiel       | headers et readiness de production               |
| A06 Composants            | À prouver     | audit brut du lockfile final                     |
| A07 Authentification      | À prouver     | Playwright avec vrai état Auth.js                |
| A08 Intégrité             | Partiel       | CI/CD et SHA final                               |
| A09 Logs                  | Partiel       | preuve monitoring et limites documentées         |
| A10 SSRF                  | Contrôlé      | tests timeout + revue URL fixe                   |

La revue ne conclut pas « 10/10 couvert ». Elle fournit au jury les contrôles,
preuves et risques résiduels, puis sera figée après les exécutions de la version
finale.
