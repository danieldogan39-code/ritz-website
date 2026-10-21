# RITZ Website – Quellcode

Quellcode der neuen RITZ-Website (Entwurf von Medialyte). Die gebaute Website liegt im Branch `main` und läuft
über GitHub Pages unter https://ritz.entwurf.medialyte.de.

| Ordner | Inhalt |
| --- | --- |
| `raw/` | Erfasste Inhalte der alten Websites (Seiten, Produkte, Bilder) |
| `tools/` | Datenaufbereitung in Python (`normalize_products.py`, `normalize_contacts.py`, `prepare.py`) |
| `site/` | Website: Ansichten, Styles, Client-Skripte, Übersetzungen, Build (`build.mjs`), Prüfskripte |
| `digest/` | Textauszüge der alten Seiten zum Nachschlagen |

Bauen und veröffentlichen:

```bash
cd site && npm ci
DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs
# Inhalt von site/dist-gh (ohne .htaccess und _projekt) in den Branch main übernehmen, CNAME und .nojekyll behalten,
# dann main und gh-pages pushen (GitHub Pages liefert gh-pages aus): git push origin main main:gh-pages
```

Für die echte Domain (mit PHP-Formularversand, Weiterleitungen der alten Adressen und Sitemap) genügt `npm run build`;
Details stehen in `site/docs/LIESMICH.md`.
