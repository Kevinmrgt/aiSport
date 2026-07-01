# B2-A10 - Preuve Playwright smoke - 2026-06-30

Compétence liée : C2.2.3 - accessibilité, sécurité et conformité fonctionnelle navigateur.

Commande exécutée depuis la racine du projet :

```bash
pnpm test:e2e:smoke
```

Résultat :

| Indicateur | Valeur |
|---|---:|
| Statut commande | Succès |
| Navigateurs | Chromium, Firefox |
| Fichiers couverts | `home.spec.ts`, `auth.spec.ts`, `accessibility.spec.ts`, `axe.spec.ts` |
| Exécutions Playwright | 48 passées |
| Violations axe critiques | 0 dans les tests exécutés |

Périmètre non couvert par ce smoke : `generate.spec.ts`, soit 8 exécutions supplémentaires sur Chromium et Firefox. Ne pas annoncer 56 E2E réussis sans relancer le test complet ou ce fichier.

