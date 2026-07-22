# Livrables Bloc 2

Deux PDF constituent la remise écrite :

1. `output/pdf/dossier-bloc2-rncp39583-alcide-v0.13.0-rc.5-final-2026-07-22.pdf` ;
2. `output/pdf/annexes-bloc2-rncp39583-alcide-v0.13.0-rc.5-final-2026-07-22.pdf`.

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

- version : `0.13.0-rc.5` ;
- commit déployé : `c63439e8ac8d68efd5ba091211b326ee8575fbba` ;
- CI : `29930722308` ;
- CD : `29931146789` ;
- API liveness/readiness et Web : HTTP 200 le 22 juillet 2026.

Les anciens PDF ont été retirés de cet emplacement afin d'éviter toute remise
d'une version `rc.2` ou `rc.3` par erreur.
