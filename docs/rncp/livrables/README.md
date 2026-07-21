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

## Versions historiques

Tous les PDF datés du `2026-07-16`, le fichier
`dossier-bloc2-candidat-corrige-2026-07-20.pdf` et le PDF non suffixé
`final-2026-07-21` sont des versions de travail obsolètes. Ils précèdent tout ou
partie des preuves B2-A26 à B2-A31 et ne doivent pas être remis au jury.

Le manifeste de contrôle est
`docs/rncp/MANIFESTE-DEPOT-BLOC2.md`. Il distingue les contrôles automatisés
réellement réussis de l'audit RGAA humain et du test utilisateur autonome, qui
restent à organiser et ne sont pas déclarés accomplis.
