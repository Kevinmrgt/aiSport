# Checklist avant dépôt du Bloc 2

Cette liste sépare les contrôles techniques déjà automatisés des actions qui
doivent encore être confirmées avec le campus.

## Contrôles techniques

- [x] version de production `0.13.0-rc.6` disponible ;
- [x] commit `b5f941311fb034831f2c6a310c61585ad7b3f092` validé par la CI
      `29990178784` et la CD `29990426551` ;
- [x] API liveness/readiness et Web en HTTP 200 ;
- [x] audit de dépendances au seuil `low` sans vulnérabilité connue ;
- [x] lint, contrôle de types, 256 tests et builds réussis ;
- [x] accès jury temporaire contre-recetté dans le navigateur de production ;
- [x] images Docker construites dans la CI ;
- [x] dossier principal inférieur à 30 pages hors annexes ;
- [x] sommaires, signets, liens, métadonnées et langue des PDF contrôlés ;
- [x] anonymisation contrôlée dans le texte, les métadonnées, les liens et les
      archives ;
- [x] ancien PDF retiré de l'emplacement des livrables ;
- [x] cahier de recettes, plan de correction, revue OWASP, matrice user stories
      et trois manuels présents dans les annexes ;
- [x] limites d'accessibilité conservées : aucune conformité RGAA exhaustive
      n'est revendiquée et deux améliorations P2 restent ouvertes.

Après une correction, les deux PDF et le manifeste doivent être régénérés. Les
empreintes issues de la dernière génération sont les seules à conserver.

## Informations à confirmer

- [ ] date et heure limites indiquées sur la convocation ;
- [ ] nom exact imposé aux deux PDF ;
- [ ] taille maximale acceptée par DigiformaCertif ;
- [ ] mode de transmission du dépôt GitHub dans le respect de l'anonymisation ;
- [ ] éventuelle demande d'une archive du code en plus du lien GitHub.

## Dépôt

- [ ] ouvrir les deux PDF finaux depuis le dossier de remise ;
- [ ] déposer tous les fichiers avant l'échéance ;
- [ ] télécharger ou capturer l'accusé de dépôt avec sa date et son heure ;
- [ ] conserver une copie exacte des fichiers remis et de leurs empreintes.
