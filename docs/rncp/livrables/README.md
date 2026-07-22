# État des livrables Bloc 2

## Livrables historiques pré-B2-A41

Les pièces PDF `rc.4` publiées le 2026-07-22 sont historiques et n'intègrent
pas encore B2-A41 :

1. `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf` ;
2. `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.4-final-2026-07-22.pdf`.

La fusion, la CI/CD, la contre-recette et la construction du paquet `rc.5` sont
terminées. Le paquet complet est reproductible par :

```bash
python docs/rncp/tools/build_bloc2_delivery_pack.py
```

Le paquet final `output/alcide-bloc2-rncp39583-0.13.0-rc.5-final-2026-07-22.zip`
contient ces deux PDF, une archive Git du code source, une notice et les
empreintes SHA-256. Le PDF d'annexes intègre en entier le cahier de recettes,
le plan de correction des bogues, la revue OWASP et la matrice user
stories/preuves. L'archive source exclut les fichiers non suivis : aucun
secret, `.env`, `storageState`, cookie OAuth, `node_modules` ou artefact local
n'y est ajouté.

Le paquet local historique est
`output/alcide-bloc2-rncp39583-0.13.0-rc.4-final-2026-07-22.zip`. Le dossier
compte 11 pages et les annexes 75 pages. Il ne doit pas être remis comme paquet
courant. Le paquet `rc.5` compte 11 pages de dossier et 81 pages d'annexes ;
ses empreintes courantes figurent dans son `MANIFESTE.txt` interne.

## Versions historiques

Tous les PDF datés du `2026-07-16`, le fichier
`dossier-bloc2-candidat-corrige-2026-07-20.pdf` et le PDF non suffixé
`final-2026-07-21` sont des versions de travail obsolètes. Ils précèdent tout ou
partie des preuves B2-A26 à B2-A31 et B2-A34 à B2-A36 et ne doivent pas être
remis au jury.

La version `0.13.0-rc.5` est déployée sur le SHA `b63280f`, après la CI
`29916228789` et la CD `29916573448`. Les trois healthchecks sont en HTTP 200
et la validation NVDA déclarée par l'utilisateur est consignée dans B2-A41.

Le manifeste de contrôle est
`docs/rncp/MANIFESTE-DEPOT-BLOC2.md`. Il recense uniquement les contrôles
réellement réussis et distingue les actions d'accessibilité démontrées d'une
conformité exhaustive au RGAA, qui n'est pas revendiquée.
