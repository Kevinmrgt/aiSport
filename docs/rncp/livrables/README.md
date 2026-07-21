# État des livrables Bloc 2

Les PDF datés du `2026-07-16` sont des **versions historiques obsolètes**. Ils
contiennent des conclusions et métriques antérieures aux corrections du
2026-07-20 et ne doivent pas être remis au jury.

Le fichier historique `dossier-bloc2-candidat-corrige-2026-07-20.pdf` est un
export de travail antérieur à la livraison `0.13.0-rc.3`. Le livrable courant
est généré sous
`output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.3.pdf`. Le manifeste
reste la source de vérité : la recette authentifiée B2-A25, la suite
Playwright OAuth B2-A26 et l'audit actualisé B2-A27 y sont distingués de
l'audit humain RGAA, qui n'est pas déclaré validé. Le PDF `0.13.0-rc.3`
précède B2-A26/B2-A27 et doit être régénéré avant remise si ces nouvelles
preuves doivent apparaître dans le livrable PDF.

Le PDF courant a été régénéré après :

1. fusion des corrections sur `main` ;
2. identification du SHA à valider ;
3. exécution de toutes les commandes du manifeste ;
4. recette Web/API/PostgreSQL et audit accessibilité ;
5. déploiement et vérification du même SHA ;
6. mise à jour des annexes avec les sorties réelles.

Le tag est créé sur le commit documentaire qui contient ce PDF ; les liens des
runs finaux sont également consignés dans la release GitHub.

Source de contrôle : `docs/rncp/MANIFESTE-DEPOT-BLOC2.md`.
