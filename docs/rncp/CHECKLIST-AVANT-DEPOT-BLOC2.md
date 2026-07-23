# Checklist avant dépôt du Bloc 2

Cette liste sépare les contrôles techniques déjà automatisés des actions qui
doivent encore être confirmées avec le campus.

## Contrôles techniques

- [x] version de production `0.13.0-rc.7` disponible ;
- [x] commit `d42e7f2c8fc86f26c46f850d32eb748870c6140d` validé par la CI
      `29994929981` et la CD `29995297354` ;
- [x] API liveness/readiness et Web en HTTP 200 ;
- [x] audit de dépendances au seuil `low` sans vulnérabilité connue ;
- [x] lint, contrôle de types, 267 tests, intégration PostgreSQL concurrente et builds réussis ;
- [x] accès jury temporaire contre-recetté dans le navigateur de production ;
- [x] quota jury de 30 succès partagé entre séances/programmes : 29/30 après
      une validation, compteur identique sur les deux pages et zéro erreur console ;
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
