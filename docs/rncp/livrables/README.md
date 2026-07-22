# État des livrables Bloc 2

## Livrables de référence

Les seules pièces PDF de la version `rc.4` publiée le 2026-07-22 sont :

1. `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf` ;
2. `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf`.

Le paquet complet est généré après fusion par :

```bash
python docs/rncp/tools/build_bloc2_delivery_pack.py
```

Il contient ces deux PDF, une archive Git du code source, une notice et les
empreintes SHA-256. Le PDF d'annexes intègre en entier le cahier de recettes,
le plan de correction des bogues, la revue OWASP et la matrice user
stories/preuves. L'archive source exclut les fichiers non suivis : aucun
secret, `.env`, `storageState`, cookie OAuth, `node_modules` ou artefact local
n'y est ajouté.

Le paquet local généré est
`output/alcide-bloc2-rncp39583-0.13.0-rc.4-final-2026-07-22.zip`. Le dossier
compte 11 pages et les annexes 75 pages ; les empreintes détaillées figurent
dans son `MANIFESTE.txt` interne.

## Versions historiques

Tous les PDF datés du `2026-07-16`, le fichier
`dossier-bloc2-candidat-corrige-2026-07-20.pdf` et le PDF non suffixé
`final-2026-07-21` sont des versions de travail obsolètes. Ils précèdent tout ou
partie des preuves B2-A26 à B2-A31 et B2-A34 à B2-A36 et ne doivent pas être
remis au jury.

La version `0.13.0-rc.4` est déployée sur le SHA `ea703ae`, après la CI
`29907294766` et la CD `29907642144`. Les healthchecks et la contre-recette
d'accessibilité ont été rejoués sur cette baseline.

Le manifeste de contrôle est
`docs/rncp/MANIFESTE-DEPOT-BLOC2.md`. Il recense uniquement les contrôles
réellement réussis et distingue les actions d'accessibilité démontrées d'une
conformité exhaustive au RGAA, qui n'est pas revendiquée.
