from __future__ import annotations

from bloc2_delivery_config import DELIVERY_DATE, ROOT, VERSION, load_jury_access_from_env
from build_bloc2_annexes_pdf import build_pdf as build_annexes_pdf
from build_bloc2_dossier_pdf import build_pdf as build_dossier_pdf


def main() -> None:
    jury_access = load_jury_access_from_env(verify_runtime_hash=True)
    output = ROOT / "output" / "jury-private"
    dossier = output / (
        f"dossier-bloc2-rncp39583-alcide-v{VERSION}-jury-confidentiel-{DELIVERY_DATE}.pdf"
    )
    annexes = output / (
        f"annexes-bloc2-rncp39583-alcide-v{VERSION}-jury-confidentiel-{DELIVERY_DATE}.pdf"
    )

    build_dossier_pdf(output=dossier, jury_access=jury_access)
    build_annexes_pdf(output=annexes, jury_access=jury_access)
    print(f"Édition jury privée générée dans : {output}")
    print(f"- {dossier.name}")
    print(f"- {annexes.name}")


if __name__ == "__main__":
    main()
