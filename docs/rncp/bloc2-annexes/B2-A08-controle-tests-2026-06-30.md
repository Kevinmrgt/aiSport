# B2-A08 - Contrôle tests du 2026-06-30

> Trace historique supplantée. La preuve valide actuelle est `B2-A08-pnpm-test-2026-06-30.md`.

## Contexte

Contrôle lancé dans le workspace local `C:\Users\Kevin\Documents\AISport` pendant l'exécution du plan Bloc 2.

## Commande tentée

```powershell
pnpm test
```

## Résultat

La commande n'a pas pu être exécutée car `pnpm` n'est pas disponible dans le PATH du shell courant.

Message constaté :

```text
pnpm : Le terme « pnpm » n'est pas reconnu comme nom d'applet de commande, fonction, fichier de script ou programme exécutable.
```

Vérifications complémentaires :

```powershell
where.exe pnpm
where.exe npm
where.exe npx
Test-Path node_modules
Test-Path apps\api\node_modules
Test-Path apps\web\node_modules
```

Résultat :

- `pnpm` introuvable ;
- `npm` introuvable ;
- `npx` introuvable ;
- `node_modules` absent à la racine ;
- `apps/api/node_modules` absent ;
- `apps/web/node_modules` absent.

## Conclusion mise à jour

Ce blocage initial provenait uniquement du `PATH` local. Il a été levé avec le runtime pnpm disponible sur le poste.

Preuve de résolution :

- `B2-A08-pnpm-test-2026-06-30.md` : `pnpm test` valide avec 71 tests passés ;
- `B2-A09-coverage-api-2026-06-30.md` : couverture API à 82.33% statements.
