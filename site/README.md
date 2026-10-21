# RITZ Website – Quellcode

Ausführliche Übergabedokumentation: [`docs/LIESMICH.md`](docs/LIESMICH.md) (wird beim Build nach `dist/_projekt/LIESMICH.md` kopiert).

```bash
npm install            # einmalig (Node 20+)
npm run build          # statische Seite nach dist/ und Vorschau nach artifact/
npm run serve          # lokal ansehen: http://localhost:8080/de/
npm run check:i18n de  # Sprachdatei gegen en.js prüfen (de, fr, hu, es)
npm run qa:flow        # Finder, Vergleich, Anfrage, Suche (laufender Server nötig)
node tools/qa/intro.mjs # Intro und Bewegung der Startseite (Einzelbilder, Ablauf, reduzierte Bewegung)

# Entwurf für GitHub Pages (eigene Adresse, noindex, Formulare ohne Versand, Start ohne Weiterleitung):
DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs
```

Datenaufbereitung (Python 3, im Projektordner darüber): `python3 tools/normalize_products.py`, `python3 tools/normalize_contacts.py`, `python3 tools/prepare.py`.
