#!/usr/bin/env python3
"""Assemble le jeu en une seule page HTML autonome.

    python3 build.py

Produit dist/donjons-et-tractions.html : CSS et JS intégrés, sans manifeste ni service worker.
C'est cette version qui est publiée comme artifact claude.ai (lien ouvrable sur téléphone).
Le dossier lui-même (index.html + css/ + js/) reste la version PWA installable.
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def main():
    index = read("index.html")
    scripts = re.findall(r'<script src="([^"]+)"></script>', index)
    css = read("css/style.css")
    js = "\n".join("// ---- %s ----\n%s" % (s, read(s)) for s in scripts)
    if "</script" in js.lower():
        raise SystemExit("Un fichier JS contient '</script' : impossible de l'intégrer tel quel.")
    page = (
        "<title>Donjons & Tractions</title>\n"
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap">\n'
        "<style>\n" + css + "\n</style>\n"
        '<div id="app"><p style="padding:40px 16px;font-family:monospace;color:#94b0c2">Chargement de Donjons &amp; Tractions…</p></div>\n'
        "<script>\n" + js + "\n</script>\n"
    )
    out_dir = os.path.join(ROOT, "dist")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "donjons-et-tractions.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print("OK -> %s (%d Ko, %d scripts)" % (os.path.relpath(out, ROOT), len(page.encode("utf-8")) // 1024, len(scripts)))


if __name__ == "__main__":
    main()
