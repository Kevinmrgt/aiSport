# Livrables Bloc 2

Deux PDF constituent la remise écrite :

1. `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.6-final-2026-07-23.pdf` ;
2. `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.6-final-2026-07-23.pdf`.

Le premier document reste sous la limite de 30 pages hors annexes. Le second
regroupe les preuves sélectionnées, le cahier de recettes, le plan de correction
des bogues, la revue OWASP, la matrice user stories et les trois manuels.

## Régénération

Depuis la racine du dépôt, avec Python 3.12 ou plus récent :

```bash
python -m pip install -r docs/rncp/tools/requirements.txt
python docs/rncp/tools/build_bloc2_dossier_pdf.py
python docs/rncp/tools/build_bloc2_annexes_pdf.py
python -m unittest discover -s docs/rncp/tools -p "test_*.py"
```

Le paquet complet peut ensuite être construit depuis un état Git propre :

```bash
python docs/rncp/tools/build_bloc2_delivery_pack.py
```

Cette dernière commande vérifie les pages, les signets, les liens internes,
l'anonymisation et les empreintes avant de créer l'archive de remise.

## Version applicative de référence

- version : `0.13.0-rc.6` ;
- commit déployé : `b5f941311fb034831f2c6a310c61585ad7b3f092` ;
- CI : `29990178784` ;
- CD : `29990426551` ;
- API liveness/readiness et Web : HTTP 200 le 23 juillet 2026.

Les anciens PDF ont été retirés de cet emplacement afin d'éviter toute remise
d'une version `rc.2` ou `rc.3` par erreur.
