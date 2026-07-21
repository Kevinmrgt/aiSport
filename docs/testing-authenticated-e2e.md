# Suite Playwright authentifiée avec un compte Google dédié

## Garantie recherchée

La suite utilise une vraie session Google OAuth émise par Auth.js. Elle ne simule pas
l’authentification et ne réutilise jamais le profil Chrome personnel du développeur. Google
refusant les navigateurs directement automatisés sur sa page de connexion, le processus utilise
un vrai Google Chrome avec un profil temporaire, puis Playwright s’y rattache après OAuth.

Le fichier `apps/web/playwright/.auth/google-e2e.json` contient des cookies actifs. Il est :

- ignoré explicitement par Git ;
- contrôlé par un préflight avant toute capture et toute exécution ;
- écrit seulement après vérification de l’adresse du compte dédié ;
- limité aux cookies du domaine Alcide : aucun cookie Google n’est conservé ;
- protégé pour le seul utilisateur courant (`0700`/`0600` sous Unix, ACL NTFS dédiée sous Windows) ;
- exclu des traces et des artefacts CI.

## 1. Créer le compte Google dédié

Créer un compte réservé aux tests Alcide, distinct de tout compte personnel. Utiliser une adresse
identifiable, par exemple `alcide.e2e.<projet>@gmail.com`, et conserver son mot de passe dans le
gestionnaire de mots de passe du projet. Si Google demande une date de naissance, un téléphone ou
une adresse de récupération, utiliser des informations réelles du responsable du compte ou un
utilisateur géré Google Workspace ; ne rien inventer.

Dans Google Cloud Console, ajouter ensuite cette adresse à **APIs & Services > OAuth consent
screen > Test users** si l’application OAuth est encore en mode test.

## 2. Capturer la session sans toucher au profil personnel

Depuis PowerShell, à la racine du dépôt, ouvrir d’abord le navigateur temporaire :

```powershell
$env:E2E_AUTH_EMAIL='adresse-du-compte-dedie@example.com'
$env:E2E_BASE_URL='https://ai-sport-web.vercel.app'
pnpm test:e2e:auth:browser
```

Un vrai Google Chrome isolé s’ouvre. Cliquer sur **Continuer avec Google**, se connecter uniquement
avec le compte dédié et attendre le retour sur `/generate`. Puis, dans le même terminal :

```powershell
pnpm test:e2e:auth:capture
```

La capture est refusée si l’adresse retournée par `/api/auth/session` diffère de
`E2E_AUTH_EMAIL`. Playwright conserve seulement les cookies Alcide, ferme Chrome et supprime le
profil temporaire. Le nettoyage est aussi tenté en cas d’échec et toute impossibilité de supprimer
le profil est signalée comme une erreur bloquante.

Vérifier ensuite que Git ignore bien le fichier :

```powershell
git check-ignore -v apps/web/playwright/.auth/google-e2e.json
git status --short
```

## 3. Exécuter la recette authentifiée

Dans le même terminal :

```powershell
pnpm test:e2e:authenticated
```

La suite revalide l’adresse du compte via Auth.js avant chacun des scénarios protégés.

## 4. Activer l’exécution manuelle GitHub Actions

Prérequis : GitHub CLI connecté au dépôt (`gh auth status`). Puis :

```powershell
$statePath=(Resolve-Path 'apps/web/playwright/.auth/google-e2e.json').Path
$stateB64=[Convert]::ToBase64String([IO.File]::ReadAllBytes($statePath))
$stateB64 | gh secret set E2E_AUTH_STORAGE_B64
$env:E2E_AUTH_EMAIL | gh secret set E2E_AUTH_EMAIL
Remove-Variable stateB64
```

Lancer ensuite le workflow **E2E authentifié - compte Google dédié** avec `gh workflow run` ou
depuis l’onglet Actions. Le runner reconstruit le fichier avec des permissions restrictives, lance
la suite, puis le supprime même en cas d’échec.

## 5. Rotation et révocation

- Recapturer et remplacer `E2E_AUTH_STORAGE_B64` quand la session expire.
- En cas de doute, révoquer les sessions du compte Google, supprimer le secret GitHub et recapturer.
- Ne jamais envoyer le JSON par messagerie, le joindre à un ticket ou l’ajouter aux artefacts.
- Ne jamais utiliser le compte pour des données réelles ou des usages personnels.
