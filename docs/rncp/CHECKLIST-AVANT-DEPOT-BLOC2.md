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

## 2. Gel technique et paquet final

- [ ] Attendre la fusion de la PR de finalisation et noter le SHA final.
- [ ] Vérifier que la CI, la CD éventuelle et la suite OAuth sont vertes.
- [ ] Mettre à jour le manifeste avec le SHA, les runs et les empreintes.
- [ ] Générer le dossier et vérifier qu'il contient au maximum 30 pages hors
      annexes.
- [ ] Rendre toutes les pages en PNG et les inspecter à 100 %.
- [ ] Générer l'archive source avec `git archive`, jamais avec le répertoire de
      travail ; vérifier l'absence de `.env`, session OAuth, `node_modules` et
      fichiers temporaires.
- [ ] Calculer les SHA-256 du dossier, des annexes et de l'archive source.
- [ ] Vérifier que le répertoire de remise ne contient aucun ancien PDF.
- [ ] Créer le tag documentaire final sans déplacer les tags historiques.

## 3. Dépôt

- [ ] Ouvrir chaque fichier du paquet final une dernière fois.
- [ ] Déposer tous les livrables demandés sur DigiformaCertif avant l'échéance.
- [ ] Télécharger ou capturer l'accusé de dépôt avec date et heure.
- [ ] Conserver une copie locale exacte du paquet déposé et de ses empreintes.
