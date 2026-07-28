# Annexes de preuve — Bloc 4 RNCP

Ce dossier contient des **modèles de préparation** pour les compétences C4.2.1,
C4.3.2 et C4.3.3. Il ne contient pas, à lui seul, la preuve qu'une issue, un
retour support, un correctif, une validation ou une livraison existe.

| Fichier                                                                                | Usage                                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [C4.2.1-modele-ticket-anomalie-github.md](C4.2.1-modele-ticket-anomalie-github.md)     | Brouillon complet d'une issue d'anomalie alignée sur le formulaire GitHub. |
| [C4.3.3-modele-cas-support-github.md](C4.3.3-modele-cas-support-github.md)             | Brouillon de cas support, marqué **SIMULATION** par défaut.                |
| [C4.3.2-matrice-tracabilite-maintenance.md](C4.3.2-matrice-tracabilite-maintenance.md) | Chaîne ticket → correctif/PR → validations → changelog/version.            |

## Remplir un modèle

1. Partir du formulaire GitHub correspondant :
   [anomalie](../../../.github/ISSUE_TEMPLATE/anomaly_report.yml) ou
   [support](../../../.github/ISSUE_TEMPLATE/support_case.yml).
2. Copier le modèle d'annexe approprié dans l'issue ou conserver une copie
   datée dans un espace de preuve autorisé.
3. Remplacer chaque `[À compléter]` par un fait constaté, une référence ou la
   mention explicite `non disponible` / `non applicable` motivée.
4. Pour un cas support sans retour réel, conserver `SIMULATION` dans le titre,
   le contexte et la matrice. Ne pas présenter la mise en situation comme un
   échange avec un utilisateur.
5. Lorsque le correctif est engagé, relier son ticket, sa PR ou son commit, les
   validations exécutées, puis la section de [CHANGELOG](../../../CHANGELOG.md)
   et la version réellement concernée.

## Captures et éléments à conserver

Pour chaque élément attesté, capturer au minimum :

- la date et l'URL ou l'identifiant de la page ;
- le titre du ticket, son état et les champs renseignés ;
- la PR ou le commit lié ;
- le résultat visible des validations (commande, CI, test manuel ou
  healthcheck), avec l'environnement ;
- l'entrée de changelog et la version, uniquement si elles existent.

Nommer les fichiers de manière factuelle, par exemple :

```text
C4-A01-ticket-BUG-XXX-YYYY-MM-DD.png
C4-A02-pr-BUG-XXX-YYYY-MM-DD.png
C4-A03-validation-BUG-XXX-YYYY-MM-DD.png
```

## Précautions de dépôt

- Ne pas déposer de secret, token, cookie, URL signée, adresse e-mail, nom de
  client, identifiant de compte, donnée de santé ou capture non anonymisée.
- Conserver le message d'erreur et les résultats tels qu'observés ; distinguer
  une hypothèse, un correctif proposé, un correctif fusionné et un correctif
  déployé.
- Ne pas créer de lien artificiel : une URL, un SHA, un numéro de run ou une
  version ne sont renseignés qu'après leur existence vérifiée.
- Garder la matrice à jour au fil de la maintenance afin que chaque ligne mène
  à des preuves consultables.

## Vérification avant dépôt

- [ ] Les liens Markdown locaux de ce dossier fonctionnent.
- [ ] Les champs requis des formulaires GitHub sont couverts par les modèles.
- [ ] Toute simulation est encore explicitement marquée.
- [ ] Chaque affirmation de correction, validation ou livraison renvoie à une
      preuve réellement disponible.
- [ ] Les captures sont datées, lisibles et expurgées des données sensibles.
