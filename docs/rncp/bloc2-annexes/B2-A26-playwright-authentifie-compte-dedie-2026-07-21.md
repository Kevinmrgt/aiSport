# B2-A26 - Playwright authentifié avec une session OAuth réelle

> Date : 2026-07-21
>
> Environnement testé : `https://ai-sport-web.vercel.app`
>
> Commit applicatif testé : `d149076e32b6e48c1bd0811060a5ad726451ed83`
>
> Compétences : C2.2.1, C2.2.2, C2.2.3, C2.3.1 et C2.3.2

## Objet de la preuve

Cette annexe ferme l'écart « suite Playwright authentifiée avec un
`storageState` réel » relevé dans B2-A25. Elle ne repose ni sur une fixture vide,
ni sur un cookie fabriqué, ni sur une interception de la route de session.

Une adresse dédiée a été configurée comme identité du compte Google de test.
L'étape Google OAuth a été réalisée manuellement dans un profil Chrome
temporaire. Le script a ensuite :

1. interrogé réellement `/api/auth/session` ;
2. refusé la capture si l'adresse Auth.js différait de l'identité attendue ;
3. conservé uniquement les cookies et origines du domaine exact
   `ai-sport-web.vercel.app` ;
4. vérifié la présence d'un cookie de session Auth.js ;
5. protégé le fichier local par ACL NTFS limitée à l'utilisateur courant ;
6. fermé Chrome et supprimé le profil temporaire.

L'adresse du compte et le contenu du `storageState` ne figurent pas dans Git.
L'état local est sous `apps/web/playwright/.auth/`, chemin ignoré par
`.gitignore`. Les trois cookies conservés appartenaient au seul domaine Alcide ;
aucun cookie Google n'a été écrit dans le fichier.

## Anomalies réellement détectées

Le premier workflow lancé sur `main`, run
[`29814300540`](https://github.com/Kevinmrgt/aiSport/actions/runs/29814300540),
a restauré et utilisé la vraie session mais a terminé en échec : deux assertions
anciennes ciblaient un champ interne caché et l'annonceur de route Next.js au
lieu des éléments fonctionnels attendus.

Ces faux contrôles ont été remplacés par :

- l'inspection des champs visibles du formulaire nommé, après attente de son
  affichage ;
- des assertions sur les alertes de champ réelles, leur visibilité et leur
  message français.

Le filtrage du `storageState` possède aussi un test comportemental : un cookie
Alcide est conservé, tandis qu'un cookie Google et un sous-domaine trompeur sont
rejetés.

## Résultats obtenus

### Exécution locale contre la production

Commande :

```powershell
pnpm test:e2e:authenticated
```

Résultat observé le 2026-07-21 après la correction des dépendances : **4 tests
réussis sur 4** en 13,4 s. Chaque
scénario vérifie d'abord que `/api/auth/session` retourne exactement l'identité
configurée.

Les contrôles qualité exécutés avant publication ont aussi réussi :

- lint sans erreur ni avertissement ESLint ;
- typecheck des workspaces réussi ;
- 155 tests API et 43 tests Web réussis ;
- 3 tests de politique de session réussis.

### GitHub Actions avec GitHub Secrets

- Workflow : `E2E authentifié - compte Google dédié`
- Run : [`29816721099`](https://github.com/Kevinmrgt/aiSport/actions/runs/29816721099)
- Job : `Parcours authentifié sans session personnelle`
- Commit : `d149076e32b6e48c1bd0811060a5ad726451ed83`
- Conclusion : **success**

Faits visibles dans le journal du run :

- les secrets `E2E_AUTH_EMAIL` et `E2E_AUTH_STORAGE_B64` sont présents ;
- l'identité est masquée par GitHub dans la sortie ;
- la session est restaurée dans un fichier hors suivi Git ;
- `Running 4 tests using 1 worker` puis `4 passed (5.5s)` ;
- l'étape de suppression de la session du runner réussit ;
- le job complet réussit en 51 s.

## Limites conservées

- Le caractère exclusivement dédié du compte relève de sa gouvernance ; le
  contrôle technique prouve l'identité configurée, pas les usages
  passés du compte Google.
- La connexion sur les écrans Google reste manuelle, Google refusant le
  navigateur directement automatisé ; Playwright intervient après le retour
  OAuth sur Alcide.
- Le workflow couvre quatre scénarios sur `/generate`. Il ne constitue pas un
  audit RGAA humain, un test mobile authentifié ou une recette exhaustive de
  toutes les routes privées.
- La session Auth.js expire et doit alors être recapturée puis remplacée dans
  GitHub Secrets. Aucun mot de passe Google n'est stocké par le projet.
