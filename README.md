# RITZ Instrument Transformers – Website-Entwurf

Neue Website für RITZ Instrument Transformers (Entwurf von Medialyte), veröffentlicht über GitHub Pages unter
**https://ritz.entwurf.medialyte.de**.

- **Branch `main`**: die fertige, statische Website (5 Sprachen, Produktfinder, Konfigurator, Standortkarte,
  Downloads, Werkzeuge: Spezifikations-Check, Wandler-Rechner, Projektmappe). GitHub Pages liefert den Branch **`gh-pages`** aus, der denselben Stand hat:
  Änderungen immer auf beide pushen (`git push origin main main:gh-pages`).
- **Branch `quellcode`**: Quellcode, Datenaufbereitung und Build. Neu bauen für diese Adresse:
  `cd site && npm ci && DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs`,
  danach den Inhalt von `site/dist-gh` (ohne `.htaccess` und `_projekt`) nach `main` kopieren und `main` sowie `gh-pages` pushen.

Besonderheiten des Entwurfs (`DRAFT=1`): für Suchmaschinen gesperrt, Formulare im Vorschaumodus (es wird nichts
versendet, der Text lässt sich kopieren), die Startadresse zeigt direkt die deutsche Startseite – keine
Weiterleitung. Es gibt keine Links auf die bisherigen RITZ-Websites: Dokumente liegen unter `/dokumente/` auf dieser
Seite oder werden über das Kontaktformular angefordert (Thema und Nachricht vorbelegt); Verweise aus alten
Newsbeiträgen zeigen auf die neuen Seiten.
`CNAME` legt die Adresse fest (DNS bei IONOS: CNAME `ritz.entwurf` → `danieldogan39-code.github.io`).
