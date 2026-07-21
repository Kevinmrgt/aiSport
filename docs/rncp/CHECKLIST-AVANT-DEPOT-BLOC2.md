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

- [x] baseline applicative `b002adb` validée par la CI `29845956008` et le CD
      `29846343559` ;
- [x] reflow contre-recetté en production : zoom natif 16/16 et accessibilité
      33/33 ;
- [x] archive construite par liste positive de fichiers suivis, avec filtrage
      des secrets, états OAuth, `.env`, `node_modules` et fichiers temporaires ;
- [x] dossier limité à 30 pages hors annexes et contrôles de rendu prévus dans
      le processus de génération ;
- [x] SHA Git et empreintes SHA-256 générés dans le manifeste du paquet.

Après toute nouvelle correction documentaire, le paquet doit être reconstruit :
le manifeste produit par cette dernière exécution, et lui seul, fait foi.

## 3. Dépôt

- [ ] Ouvrir chaque fichier du paquet final une dernière fois.
- [ ] Déposer tous les livrables demandés sur DigiformaCertif avant l'échéance.
- [ ] Télécharger ou capturer l'accusé de dépôt avec date et heure.
- [ ] Conserver une copie locale exacte du paquet déposé et de ses empreintes.
