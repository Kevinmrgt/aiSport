# Checklist réelle avant dépôt du Bloc 2

Cette checklist contient uniquement les actions qui exigent une intervention
humaine ou une information du campus. Ne cocher une ligne qu'après l'avoir
réellement exécutée et avoir conservé la preuve associée.

## 1. Confirmer les règles de remise

- [ ] Ouvrir la convocation et noter la date et l'heure limites exactes.
- [ ] Confirmer avec le campus le nommage imposé aux fichiers.
- [ ] Confirmer la taille maximale acceptée par DigiformaCertif.
- [ ] Confirmer si l'anonymisation concerne seulement le PDF ou aussi l'archive
      Git et les URL du dépôt.
- [ ] Confirmer si les annexes doivent être un PDF unique ou plusieurs fichiers.

Le calendrier général mentionne août 2026, mais il ne remplace pas la date de
la convocation.

## 2. Gel technique consolidé

Les contrôles techniques ne sont plus présentés comme des actions administratives
encore ouvertes : ils sont exécutés par le constructeur du paquet et consignés
dans `MANIFESTE.txt`.

Les cases déjà cochées ci-dessous décrivent la baseline historique `rc.4`.
Elles ne valent pas validation de la candidate `rc.5`, qui doit repasser la
CI/CD, la contre-recette et la construction du paquet.

- [x] baseline applicative `ea703ae` validée par la CI `29907294766` et le CD
      `29907642144` ;
- [x] reflow contre-recetté en production : zoom natif 16/16 et accessibilité
      33/33 ;
- [x] archive construite par liste positive de fichiers suivis, avec filtrage
      des secrets, états OAuth, `.env`, `node_modules` et fichiers temporaires ;
- [x] dossier limité à 30 pages hors annexes et contrôles de rendu prévus dans
      le processus de génération ;
- [x] sommaires cliquables, signets hiérarchiques, langue et métadonnées des
      deux PDF contrôlés ; absence de balisage PDF/UA signalée sans ambiguïté ;
- [x] chemin CI négatif courant prouvé sur PR isolée, sans CD ni modification
      de l'inventaire de production ;
- [x] SHA Git et empreintes SHA-256 générés dans le manifeste du paquet.

Pour la version publiée `0.13.0-rc.4` du 2026-07-22 :

- [x] audit de production au seuil `low`, lint, types, 239 tests et builds
      verts localement et dans la CI ;
- [x] cahier de recettes, plan de correction, revue OWASP et matrice user
      stories/preuves intégrés en entier aux annexes ;
- [x] gate d'anonymisation couvrant PDF, métadonnées, annotations, liens, flux,
      ZIP final et ZIP imbriqué ;
- [x] publier la candidate et conserver la CI/CD verte correspondante ;
- [x] exécuter la contre-recette de production sur la candidate publiée ;
- [x] exécuter et consigner un vrai parcours NVDA : version 2026.1.1,
      dix scénarios, 6 conformes, 3 partiels et 1 non conforme, B2-A41 ;
- [x] décider les 166 contextes composites de CR-055 : 165 échantillonnés et
      le dernier borné à 15,00:1 dans le pire cas documenté par B2-A37.
- [ ] déployer les correctifs B2-BUG-042/043 et contre-recetter SR-04/SR-08 ;
      décider les annonces finales SR-09/SR-10. Aucune validation auditive
      humaine ni conformité RGAA exhaustive n'est revendiquée avant preuve.
- [ ] reconstruire et inspecter le paquet `rc.5` incluant B2-A41, puis vérifier
      sa décompression, son anonymisation et ses empreintes.

Après toute nouvelle correction documentaire, le paquet doit être reconstruit :
le manifeste produit par cette dernière exécution, et lui seul, fait foi.

## 3. Dépôt

- [ ] Ouvrir chaque fichier du paquet final une dernière fois.
- [ ] Déposer tous les livrables demandés sur DigiformaCertif avant l'échéance.
- [ ] Télécharger ou capturer l'accusé de dépôt avec date et heure.
- [ ] Conserver une copie locale exacte du paquet déposé et de ses empreintes.
