# RITZ Instrument Transformers – Website-Entwurf

Neue Website für RITZ Instrument Transformers (Entwurf von Medialyte), veröffentlicht über GitHub Pages unter
**https://ritz.entwurf.medialyte.de**.

- **Branch `main`**: die fertige, statische Website (5 Sprachen, Produktfinder, Konfigurator, Standortkarte,
  Downloads). Diese Dateien liefert GitHub Pages aus.
- **Branch `quellcode`**: Quellcode, Datenaufbereitung und Build. Neu bauen für diese Adresse:
  `cd site && npm ci && DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs`,
  danach den Inhalt von `site/dist-gh` (ohne `.htaccess` und `_projekt`) nach `main` kopieren.

Besonderheiten des Entwurfs (`DRAFT=1`): für Suchmaschinen gesperrt, Formulare im Vorschaumodus (es wird nichts
versendet, der Text lässt sich kopieren), die Startadresse zeigt direkt die deutsche Startseite – keine
Weiterleitung. Datenblätter und Zertifikate kommen weiterhin von den RITZ-Servern und öffnen in einem neuen Tab.
`CNAME` legt die Adresse fest (DNS bei IONOS: CNAME `ritz.entwurf` → `danieldogan39-code.github.io`).
