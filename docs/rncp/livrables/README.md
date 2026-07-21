# État des livrables Bloc 2

## Livrables de référence

Les seules pièces PDF candidates au dépôt du 2026-07-21 sont :

1. `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf` ;
2. `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.3-final-2026-07-21.pdf`.

Le paquet complet est généré après fusion par :

```bash
python docs/rncp/tools/build_bloc2_delivery_pack.py
```

Il contient ces deux PDF, une archive Git du code source, une notice et les
empreintes SHA-256. L'archive source exclut les fichiers non suivis : aucun
secret, `.env`, `storageState`, cookie OAuth, `node_modules` ou artefact local
n'y est ajouté.

Le support `output/preparation-orale/kit-soutenance-bloc2-rncp39583-alcide-2026-07-21.pdf`
regroupe le guide, le script chronométré, le plan de secours et les réponses
aux questions probables. Il sert à la préparation du candidat et ne fait pas
partie des pièces à déposer, sauf demande explicite du campus.

## Versions historiques

Tous les PDF datés du `2026-07-16`, le fichier
`dossier-bloc2-candidat-corrige-2026-07-20.pdf` et le PDF non suffixé
`final-2026-07-21` sont des versions de travail obsolètes. Ils précèdent tout ou
partie des preuves B2-A26 à B2-A31 et B2-A34 à B2-A36 et ne doivent pas être
remis au jury.

Le manifeste de contrôle est
`docs/rncp/MANIFESTE-DEPOT-BLOC2.md`. Il recense uniquement les contrôles
réellement réussis et distingue les actions d'accessibilité démontrées d'une
conformité exhaustive au RGAA, qui n'est pas revendiquée.
