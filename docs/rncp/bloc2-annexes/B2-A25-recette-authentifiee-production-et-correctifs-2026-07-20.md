# B2-A25 - Recette authentifiée de production et correctifs

> Date : 2026-07-20  
> Environnement : production Vercel/Neon  
> Navigateur : navigateur intégré Codex, session Google ouverte par le candidat  
> Versions observées : `0.13.0-rc.2`, puis `0.13.0-rc.3`

## Périmètre et méthode

Le candidat a terminé lui-même la connexion Google, puis a indiqué que la
session était disponible. La recette a été conduite dans cet onglet existant,
sans lire ni exporter les cookies, le stockage local ou l'identité du compte.
Les observations proviennent de l'arbre d'accessibilité, de l'URL, du focus
actif et des journaux console du navigateur.

Cette annexe ne vaut pas audit RGAA humain complet et ne transforme pas les
contrôles automatisés en preuve manuelle.

## Recette métier initiale sur `0.13.0-rc.2`

| Parcours | Données et actions réellement exécutées | Résultat observé |
| --- | --- | --- |
| Session | ouverture de `/generate` après connexion réalisée par le candidat | formulaire privé affiché, navigation privée et bouton de déconnexion présents |
| Validation séance | soumission vide | deux alertes anglaises `String must contain at least 1 character(s)` |
| Séance IA | sport `Mobilite - recette RNCP`, durée 15 min, objectif et contraintes explicitement marqués comme données de recette | séance créée sous l'ID `2a4d598f-48a7-4068-8219-49ac6660adaa`, détail totalisant exactement 15 min |
| Timer séance | démarrage, attente, pause, attente 2,2 s, reprise, Échap | décompte actif, valeurs inchangées pendant la pause, reprise correcte ; après Échap le focus tombait sur `BODY` |
| Filtre séances | inspection du filtre Sport | liste fermée à huit sports alors que la génération accepte un texte libre |
| Programme IA | même sport de recette, 2 semaines, 2 séances/semaine, 20 min/séance | programme créé sous l'ID `e1fdc5af-84fc-4114-8af6-046daadd5f0d`, 2 semaines et 4 séances de 20 min |
| Onglets programme | `ArrowRight`, `Home`, `End` | sélection et focus conformes sur les deux semaines |
| Séance programme | ouverture de la séance 2-1 | détail de 20 min et Timer affichés |
| Dashboard | lecture des statistiques du compte | données réelles affichées ; variantes `Course a pied` et `Course à pied` séparées |
| Paramètres | lecture puis enregistrement sans changement | fournisseur OpenAI serveur, modèle GPT-5.4 mini, confirmation de sauvegarde |
| Suppressions | Échap sur la confirmation puis confirmation effective | focus restauré après Échap ; seules les deux ressources de recette ci-dessus ont été supprimées |

Aucune erreur console n'a été observée sur ces parcours. Après le nettoyage, la
liste comptait de nouveau 12 séances et 4 programmes. Aucune autre donnée du
compte n'a été supprimée.

## Anomalies issues de cette exécution

| ID | Anomalie réelle | Correction |
| --- | --- | --- |
| B2-BUG-023 | messages Zod anglais dans les deux formulaires français | messages explicites français dans les schémas partagés et HTTP |
| B2-BUG-024 | focus perdu après sortie du plein écran Timer | restauration vers le contrôle Timer vivant après démontage du portail |
| B2-BUG-025 | filtre Sport incompatible avec les sports libres | champ de recherche texte, formulaire GET et requête conservée |
| B2-BUG-026 | variantes typographiques comptées séparément au dashboard | regroupement casse, accents et espaces avant tri et limite |

La correction a été livrée par la PR
[`#34`](https://github.com/Kevinmrgt/aiSport/pull/34), fusionnée dans le SHA
applicatif `3a21e3b2b547e99410388d5b83b62df79a436ea8`.

## Vérifications de `0.13.0-rc.3`

| Contrôle | Preuve | Résultat |
| --- | --- | --- |
| Local | `pnpm test`, `typecheck`, `lint`, `build`, audit `low` | 155 tests API et 43 tests Web réussis ; aucune vulnérabilité connue |
| CI de PR | run `29746856421` | 6 jobs réussis, couvertures, PostgreSQL, E2E public/axe et Docker inclus |
| CI `main` | run `29747228594` | 6 jobs réussis sur le SHA fusionné |
| CD | run `29747592571` | migration, API, Web et smoke tests réussis |
| Healthchecks | API `/health`, `/health/ready`, Web `/api/health` | HTTP 200, version `0.13.0-rc.3`, DB `ok`, configuration IA `ok` |
| Monitoring | run `29748032763` | succès et artefact de monitoring produit |
| Validation séance vide | soumission réelle de `/generate` | `Le sport ne peut pas être vide` et `L’objectif ne peut pas être vide` |
| Validation programme vide | soumission réelle de `/programs/generate` | mêmes alertes françaises adaptées aux champs |
| Filtre libre | valeur `Mobilite - recette RNCP`, bouton `Filtrer` | URL `?sport=Mobilite+-+recette+RNCP&level=`, valeur conservée, état `Aucun resultat` |
| Agrégation dashboard | lecture après déploiement | une entrée `Course à pied` à 2 au lieu de deux variantes à 1 |
| Focus Timer | démarrage d'une séance existante puis Échap | élément actif `BUTTON`, texte `Pause`, `aria-pressed=true`, dialogue fermé |
| Déconnexion | bouton de déconnexion puis ouverture de `/dashboard` | redirection finale vers `/login`, lien `Se connecter`, aucun bouton de déconnexion |

Aucun journal console n'a été observé durant la contre-recette `rc.3`.

## Limites conservées

- les écrans Google de consentement n'ont pas été instrumentés : seule la
  session obtenue par le candidat et son fonctionnement ont été observés ;
- aucun cookie, token ou stockage de session n'a été inspecté ;
- il ne s'agit pas d'une suite Playwright authentifiée réutilisable avec
  `storageState` ;
- le lecteur d'écran, le zoom 200/400 %, les ratios de contraste exhaustifs et
  la recette mobile authentifiée restent à exécuter ;
- aucun test utilisateur autonome distinct du candidat n'a été organisé.
