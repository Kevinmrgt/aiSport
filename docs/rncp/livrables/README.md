# État des livrables Bloc 2

Les PDF datés du `2026-07-16` sont des **versions historiques obsolètes**. Ils
contiennent des conclusions et métriques antérieures aux corrections du
2026-07-20 et ne doivent pas être remis au jury.

Le fichier `dossier-bloc2-candidat-corrige-2026-07-20.pdf` est un export de
travail régénéré après l'audit documentaire et les preuves locales B2-A19 à
B2-A22. Ses 15 pages ont été rendues en images et contrôlées visuellement. Son
nom ne signifie ni recette finale réussie, ni conformité RGAA, ni déploiement de
la candidate ; le manifeste reste la source de son statut.

Le PDF final doit être régénéré seulement après :

1. fusion des corrections sur `main` ;
2. identification du SHA à valider ;
3. exécution de toutes les commandes du manifeste ;
4. recette Web/API/PostgreSQL et audit accessibilité ;
5. déploiement et vérification du même SHA ;
6. création du tag sur le SHA effectivement vérifié ;
7. mise à jour des annexes avec les sorties brutes.

Source de contrôle : `docs/rncp/MANIFESTE-DEPOT-BLOC2.md`.
