# Revue de sécurité OWASP Top 10 — Alcide

> Livrable transversal utilisé par le Bloc 2, compétence C2.2.3
> Revue de code : 2026-07-21 - baseline de campagne sécurité `0d5c6b6...`.
> Baseline historique déployée après le correctif de reflow : `b002adb...`, CI
> `29845956008`, CD `29846343559`. Ce correctif ne modifie pas les contrôles de
> sécurité décrits ci-dessous.

## Méthode et échelle

Cette revue suit les dix catégories OWASP Top 10 2021. Elle distingue :

- **contrôlé** : mesure présente et testée sur la version de référence ;
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
Les tests ont été rejoués dans le job PostgreSQL de la CI de consolidation `29832575391` sur
`main`. Les tests middleware et controllers sont aussi exécutés dans la suite
unitaire. L'existence d'une FK seule n'est pas utilisée comme preuve d'ownership.

Risque résiduel : `SERVICE_SECRET` est une frontière de confiance à fort impact.
Sa rotation et son stockage Vercel/GitHub doivent être documentés.

## A02 — Cryptographic Failures — contrôlé avec limites

Contrôles exécutés : fichiers `.env` ignorés, exemples sans valeur secrète, TLS
et HSTS observés sur les URL de production et secrets OpenAI/interservice
utilisés dans des modules serveur. L'HTML et les neuf scripts effectivement
chargés en production ont été inspectés : aucun marqueur `OPENAI_API_KEY`,
`SERVICE_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET` ni motif de clé `sk-*`
longue. Les contrôles locaux Chromium/Firefox donnent le même résultat ; B2-A35.

Risque résiduel : les journaux peuvent contenir effort et notes de douleur,
liés à l'identité. Une page de confidentialité informe l'utilisateur, mais la
durée de conservation, l'export et la suppression de compte doivent être
formalisés et, s'ils sont annoncés, réellement implémentés.

## A03 — Injection — contrôlé

Les chaînes utilisateur ne sont pas nécessairement rejetées parce qu'elles
ressemblent à du SQL. La protection repose sur les requêtes paramétrées Drizzle,
complétées par la validation de forme Zod. Le cahier de recettes ne prétend plus
que Zod bloque la chaîne `'; DROP TABLE ...`.

Preuves : la charge exacte `'; DROP TABLE workouts; --` a été insérée puis
relue comme donnée via le repository sur PostgreSQL 16.14 ; un `SELECT` après
insertion a confirmé la table intacte et le nettoyage a été vérifié. Les
charges XSS `script` et `img onerror` restent du texte inerte dans React et dans
Chromium/Firefox. Les recherches de sinks DOM et d'appels DB bruts sont vides ;
B2-A35.

## A04 — Insecure Design — partiel

Contrôles : architecture en couches, schémas partagés, invariants métier sur les
sorties IA, timeouts, retry borné, erreurs typées, contrôle d'ownership et limite
de taille des entrées.

Risque résiduel majeur : le rate limit utilise un `Map` mémoire par processus.
Il protège un processus unique mais ne garantit pas un quota global sur Vercel
avec cold starts ou plusieurs instances. Le passage à un store distribué
atomique reste nécessaire avant de présenter cette limite comme garantie de
production.

## A05 — Security Misconfiguration — contrôlé avec risque résiduel

Contrôles : `secureHeaders`, CORS restreint, erreurs sans stack client,
variables obligatoires, readiness DB et présence de configuration OpenAI,
images non-root, directives CSP
`object-src`, `base-uri`, `form-action` et `frame-ancestors`.

Les en-têtes effectifs du Web et de l'API ont été contrôlés localement puis en
production. L'origine CORS hostile ne reçoit aucun
`Access-Control-Allow-Origin`, tandis que le front officiel est autorisé. La CSP
de production contient `object-src 'none'`, `base-uri 'self'`, `form-action
'self'`, `frame-ancestors 'none'` et n'autorise pas `unsafe-eval` ; B2-A35.

Risques résiduels :

- `unsafe-inline` reste présent pour scripts/styles, notamment pour les besoins
  de Next.js ; une CSP à nonce demanderait une évolution dédiée ;
- le liveness check ne doit pas être confondu avec readiness ;
- les secrets et callbacks OAuth de production restent une configuration
  externe à vérifier.

## A06 — Vulnerable and Outdated Components — contrôlé

Contrôles : lockfile, installation figée, audit dès le niveau low rendu bloquant en
CI, versions Next.js/React situées sur une ligne corrigée.

Contrôle local du 2026-07-20 sur la version `0.13.0-rc.3` :
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
contre-vérification. L'audit bloquant au niveau `low` est de nouveau vert dans
la CI de consolidation `29832575391`, puis dans la CI canonique `29845956008`.

Actualisation du 2026-07-22 : un nouvel audit de la version `rc.4` a détecté
cinq avis publiés depuis le gel précédent : un avis `high` sur `sharp` et quatre
avis `moderate` concernant `hono` et `@hono/node-server`. La version
`0.13.0-rc.4` les corrige avec `sharp@0.35.3`, `hono@4.12.31` et
`@hono/node-server@2.0.11`. L'audit de production au seuil `low`, le lint, la
vérification des types, les 239 tests et les builds sont de nouveau verts en
localement et dans la CI `29907294766`. B2-A39 conserve le constat, les versions
résolues et les commandes de contre-vérification. La CD `29907642144` et les
healthchecks `rc.4` ferment la contre-vérification de production.

La baseline courante `0.13.0-rc.5` conserve ces versions corrigées. Elle a
repassé l'audit de production au seuil `low`, le lint, les types, 241 tests,
les builds et la CI `29930722308`, puis la CD `29931146789` et les healthchecks
HTTP 200. Les correctifs `rc.5` portent sur la restitution d'accessibilité et
ne relâchent aucun contrôle de sécurité décrit dans cette revue.

## A07 — Identification and Authentication Failures — contrôlé avec limites

Contrôles de code : Google OAuth, stratégie de session JWT Auth.js avec durée
maximale configurée et vérification serveur sur chaque parcours protégé. Les
attributs réels du cookie et l'expiration doivent être relevés sur la version
déployée ; ils ne sont pas considérés comme prouvés par la seule configuration.

La suite Playwright authentifiée n'utilise plus une fixture vide. B2-A26 prouve
la capture d'un vrai `storageState` Auth.js après connexion Google manuelle, la
vérification de l'identité, le filtrage des cookies sur le domaine Alcide et
4/4 scénarios en CI `29817741589`. La déconnexion et l'accès sans session sont
couverts par B2-A25. La suite finale ajoute le reflow mobile et axe : 6/6 dans
la CI post-déploiement `29833210488`. L'expiration et la rotation automatique
restent à tester.

La version `0.13.0-rc.6` ajoute un fournisseur Credentials réservé au jury,
sans modifier le parcours Google. Le mot de passe n'est jamais stocké en clair :
Vercel ne reçoit qu'un hash `scrypt` salé, comparé avec
`timingSafeEqual`. L'identité technique possède un e-mail dédié ; l'API
continue à résoudre son propre UUID PostgreSQL et à appliquer l'ownership.
L'accès est absent de l'interface si sa configuration est incomplète, désactivée
ou expirée. Le callback JWT revalide à chaque lecture le kill switch, la date
absolue et une empreinte de configuration : expiration, désactivation et
rotation révoquent donc aussi les sessions existantes. Les échecs affichent un
message générique. Le callback `/api/auth/callback/jury` est destiné à être
protégé par une règle de limitation Vercel dédiée afin de réduire le risque de
brute force et de consommation CPU de `scrypt`.

## A08 — Software and Data Integrity Failures — contrôlé

Contrôles : lockfile, `--frozen-lockfile`, CI avant CD, migrations versionnées,
validation Zod des sorties OpenAI et images construites depuis le SHA.

Le CD manuel contournant la CI est supprimé. Les actions GitHub sont épinglées
par SHA, la CLI Vercel est appelée avec une version explicite et le SHA déployé
est conservé dans le manifeste. La CI `29832575391` puis le CD `29832944876`
prouvent l'enchaînement sur la baseline de consolidation `0d5c6b6...`. Le même
enchaînement est confirmé sur la baseline canonique `b002adb...` par la CI
`29845956008` et le CD `29846343559`.

## A09 — Security Logging and Monitoring Failures — contrôlé avec limites

Les tentatives d'auth invalides, erreurs applicatives, appels IA et erreurs DB
disposent d'appels de journalisation dans le code. Une recette contrôlée a
obtenu HTTP 401 et vérifié l'événement serveur d'authentification refusée, sans
secret, valeur hostile ni stack dans la réponse client. Le monitoring planifié
de production a réussi sur la version déployée et B2-A29 a obtenu 150/150 réponses
valides sur les trois healthchecks ; B2-A35.

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

| Catégorie                 | État observé                  | Preuve finale requise                                 |
| ------------------------- | ----------------------------- | ----------------------------------------------------- |
| A01 Accès                 | Contrôlé                      | PostgreSQL multi-utilisateur + API                    |
| A02 Cryptographie/données | Contrôlé avec limites         | inspection ressources navigateur et politique données |
| A03 Injection             | Contrôlé                      | DB réelle + navigateur                                |
| A04 Conception            | Partiel                       | stratégie rate limit distribué ou risque accepté      |
| A05 Configuration         | Contrôlé avec risque résiduel | CSP/headers/CORS effectifs ; nonce à étudier          |
| A06 Composants            | Contrôlé                      | audit brut du lockfile final                          |
| A07 Authentification      | Contrôlé                      | Playwright avec vrai état Auth.js                     |
| A08 Intégrité             | Contrôlé                      | CI/CD, actions épinglées et SHA                       |
| A09 Logs                  | Contrôlé avec limites         | événement 401 et monitoring ; SIEM absent             |
| A10 SSRF                  | Contrôlé                      | tests timeout + revue URL fixe                        |

La revue ne conclut pas « 10/10 sans risque ». Elle fournit au jury les
contrôles exécutés et les risques résiduels : confidentialité, rate limit
distribué, CSP à nonce, expiration de session et observabilité structurée.
