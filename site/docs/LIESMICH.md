# RITZ Instrument Transformers – neue Website

Übergabedokumentation · Stand 21. Oktober 2026 · Konzeption, Design und Umsetzung: Medialyte

Dieses Paket enthält die fertig gebaute neue Website (Ordner `dist/`), den vollständigen Quellcode mit Datenaufbereitung (Ordner `site/` und `tools/`), die Bestandsaufnahme der beiden bisherigen Websites und alles für den Umzug: Weiterleitungen, Dokumentenmigration und Server-Konfiguration.

---

## 1. Ergebnis auf einen Blick

| | |
|---|---|
| Seiten | 1.865 statische Seiten in 5 Sprachen (DE, EN, FR, HU, ES) |
| Produkte | 298 Produkte aus dem bisherigen Produktfinder und dem Hauptkatalog, 282 davon mit Konfigurator |
| Dokumente | 1.272 Datenblätter, Maßzeichnungen, Kataloge, Zertifikate und Bedingungen, filterbar |
| News | 42 Beiträge mit allen vorhandenen Sprachfassungen |
| Kontakte | 10 Standorte, 15 Ansprechpartner, 67 Vertretungen auf eigener Weltkarte |
| Weiterleitungen | 892 alte Adressen (Hauptseite und Produktfinder) mit 301 auf neue Seiten |
| Ladegewicht Startseite | HTML 10 KB, CSS 18 KB, JavaScript 3,4 KB (jeweils komprimiert); weitere Skripte nur bei Bedarf |
| Datenschutz | keine Cookies, kein Tracking, keine Drittanbieter (Schriften und Karten selbst gehostet) |
| Prüfungen | Barrierefreiheit nach WCAG 2.1 AA (axe-core) ohne Befund auf 92 Seitenansichten (hell/dunkel, Desktop/Telefon); bei gedrosseltem Mobilfunk Largest Contentful Paint 1,4–1,8 s, Layoutverschiebung 0; 722 Seitenaufrufe ohne Konsolenfehler, defekte Links oder Überläufe |

Die bisherigen Auftritte `ritz-international.com` (WordPress) und `produkte.ritz-international.com` (Magento-Produktfinder) sind in einer Website zusammengeführt. Produktsuche, Konfiguration, Anfrage, Dokumente und Ansprechpartner liegen jetzt an einem Ort und verweisen aufeinander.

## 2. Was die neue Seite kann

**Spannungsachse (Startseite, Produktübersicht).** Eine logarithmische Achse von 0,72 bis 550 kV zeigt, welche Produktbereiche welche Spannungsebene abdecken. Ziehen, Tippen oder Pfeiltasten wählen eine Normstufe (Um nach IEC); die Zahl passender Produkte aktualisiert sich sofort, ein Klick öffnet den gefilterten Produktfinder.

**Produktfinder.** Filter nach Produktbereich, Wandlerart, Einsatzort, Spannungsebene Um, Anwendung, Primär- und Sekundärstrom, Genauigkeitsklasse, Bauform, Norm, Frequenz, Lieferzeit und Herstellungsort. Die Trefferzahlen je Filter berücksichtigen die übrigen Filter. Der Filterzustand steht in der Adresse und lässt sich teilen. Auf Mobilgeräten öffnen sich die Filter als Blatt von unten.

**Produktseiten mit Konfigurator.** Die abhängigen Optionen des alten Magento-Shops (welche Option welche weiteren Optionen und Werte freischaltet) sind vollständig nachgebaut. Pflichtangaben werden geprüft, die Konfiguration landet mit Stückzahl in der Anfrageliste. Fehlt ein Produktfoto, zeigt die Seite ein Typenschild mit den Kenndaten (Um, Ipr, Isr, Upr, Usr, Klasse, Bürde, Frequenz, Norm).

**Vergleich und Anfrageliste.** Bis zu vier Produkte nebeneinander, Unterschiede hervorgehoben. Die Anfrageliste sammelt konfigurierte und unkonfigurierte Produkte und sendet sie mit dem Anfrageformular an den zuständigen Vertrieb (Empfänger je Produktbereich in `api/anfrage.php`).

**Downloads.** Alle Dokumente beider Altseiten an einem Ort, filterbar nach Dokumentart, Produktbereich und Sprache, durchsuchbar nach Titel, Typcode und Dateiname.

**Karten.** Eigene, datenschutzfreundliche Weltkarte (keine Google- oder OpenStreetMap-Einbindung): Standorte und Vertretungen, Regionen, Zoom und Verschieben mit Maus, Touch und Tastatur, Suche über Länder und Firmen, Detailkarte mit Telefon, E-Mail und Routenlink. Jede Standortkarte zeigt zusätzlich einen Kartenausschnitt.

**Anwendungen.** Sieben Einstiege nach Kundensegment (Netze, Schaltanlagenbau, Industrie, Bahn, Erneuerbare/HGÜ/Power Quality, Kraftwerke, Mess- und Prüftechnik) mit den passenden Produktgruppen, Referenzen, Unterlagen und Ansprechpartnern.

**Suche.** Gesamtsuche über Produkte, Seiten und Dokumente (Strg/Cmd + K oder „/“), Typcodes werden direkt erkannt.

**Startseite in Bewegung.** Beim ersten Besuch je Sitzung zeigt ein kurzes Intro (etwa 2,6 Sekunden, jederzeit per Klick, Taste, Mausrad oder Wischen zu überspringen) das Messwandler-Prinzip: Ein großer Primärstrom (2000 A) läuft in den Ringkern, heraus kommt ein kleiner, proportionaler Sekundärstrom (5 A). Dann setzt sich das RITZ-Zeichen zusammen und fliegt an seinen Platz im Seitenkopf. Danach steigt die Hauptaussage maskiert auf, die Spannungsachse misst sich einmal von 0,72 bis 24 kV ein (jede Bedienung bricht das ab), Bilder öffnen sich beim Scrollen, Kennzahlen zählen wie ein Messgerät hoch und das Standortnetz zeichnet sich von Hamburg aus. Bewegt werden nur `transform`, `opacity` und `clip-path`. Bei „Bewegung reduzieren“, ohne JavaScript und im Druck ist alles sofort sichtbar; Vorleseprogramme hören immer die Endwerte. Gesteuert wird das über `data-intro` und die Klasse `rv` am Wurzelelement (Kopfskript in `build.mjs`, Stile in `extra.css` unter „Startseite: Intro und Bewegung“, Auslöser in `src/client/motion.js`). Prüfskript: `node tools/qa/intro.mjs`.

**Weiteres.** Hell- und Dunkelmodus (folgt dem System, umschaltbar), druckfreundliche Produktseiten, strukturierte Daten (Organization, Product, NewsArticle), Sitemap mit Sprachzuordnung, saubere Sprachwechsel auf die jeweils gleiche Seite.

## 3. Konzept

**Zielgruppen.** Netzbetreiber und Stadtwerke, Schaltanlagenbauer, Industrie und Infrastruktur, Bahnindustrie, Erneuerbare und HGÜ, Kraftwerke sowie Mess- und Prüflabore. Sie kommen in der Regel mit einer konkreten Anforderung (Spannungsebene, Strom, Klasse, Norm) oder einem Typcode. Die Seite ist deshalb vom Datenblatt aus gedacht: schnell zum passenden Produkt, zum Dokument und zum zuständigen Menschen.

**Informationsarchitektur.** Produkte (sechs Bereiche, Finder, Vergleich, Anfrage) · Anwendungen (sieben Segmente) · Downloads · Unternehmen (Über RITZ, Standorte, Qualität und Zertifikate, Verantwortung, Referenzen) · Karriere (Stellen, Ausbildung, Praktika) · News · Kontakt. Die Hauptnavigation bleibt auf jeder Seite gleich, die Mega-Menüs zeigen die Produktbereiche mit Spannungsbereich.

**Gestaltung.** Leitmotiv „messbare Präzision“: viel Weißraum, Stahlgrau, RITZ-Rot als Signal, Kupfer und Gießharzbraun aus der Produktwelt. Schrift: Archivo (variable Breite und Stärke), breit für Überschriften, schmal für Daten und Tabellen. Gestaltungselemente aus dem Fachgebiet: die Spannungsachse, das Typenschild, die Raute aus dem RITZ-Logo als Anschnitt an Schaltflächen. Alle Farben sind als Variablen definiert (`site/src/styles/main.css`), Hell- und Dunkelmodus nutzen dieselben Bausteine.

**Technik.** Statische Seiten ohne CMS-Laufzeit und ohne Framework, dadurch schnell, sicher und günstig zu betreiben. Interaktive Teile (Finder, Konfigurator, Karte, Suche) laden ihr JavaScript erst, wenn sie auf der Seite vorkommen. Produkt-, Dokument- und Kontaktdaten liegen als JSON vor und werden beim Build in die Seiten geschrieben.

**Barrierefreiheit.** Semantisches HTML, Sprunglinks, sichtbarer Tastaturfokus, Fokusführung in Menü und Suche, Beschriftungen für alle Bedienelemente, Kontraste nach WCAG AA, Rücksicht auf „Bewegung reduzieren“.

## 4. Bestandsaufnahme der bisherigen Websites

Erfasst wurden alle öffentlich erreichbaren Seiten, Beiträge, Produkte, Dokumente, Bilder, Karten und Kontaktdaten beider Systeme. Die Ergebnisse liegen in `_projekt/`:

| Datei | Inhalt |
|---|---|
| `inventar-produkte.csv` | alle 298 Produkte mit alter und neuer Adresse, Konfigurator, Bildern, Dokumenten |
| `inventar-dokumente.csv` | alle 1.272 Dokumente mit Typ, Sprache, Quelle und neuem Pfad |
| `inventar-news.csv` | alle 42 Beiträge mit Sprachen, alter und neuer Adresse |
| `inventar-kontakte.csv` | Standorte, Ansprechpartner und Vertretungen |
| `redirects.csv` | 892 Weiterleitungen alt → neu |
| `audit.md` | automatisch gefundene Datenfehler und Altlasten |

**Quellen:** 310 Seiten der Hauptseite in 5 Sprachen, 566 Produktseiten des Produktfinders (283 DE, 283 EN) mit allen Optionen und Abhängigkeiten, 135 Beiträge, Kartenmarker der Kontaktseite (85 Vertretungen im CMS, davon 63 öffentlich sichtbar), Stellenangebote aus Personio.

**Gefundene Probleme der Altseiten (Auswahl, Details in `audit.md`):**

- Produktfinder und Hauptseite widersprechen sich teils: „EMWI 7xx“ gegenüber „EMVI 7xx“ (vereinheitlicht auf EMVI), MKSOH-S mit Code 1082 gegenüber 1384, deutsche Bezeichnungen mit englischem Text und umgekehrt.
- Datenblatt-Links der Hauptseite für VEF 52/72,5 und VZF zeigten auf falsche Dokumente; die neue Seite ordnet Dokumente über die Produktdaten zu.
- Ein Dokumentlink enthielt zwei verkettete Adressen (SIS-Broschüre DE/EN) und war defekt.
- Hochspannungs-Kontakt in Lavonia mit falscher Postleitzahl (30907 statt 30553).
- DUROMER-Text nennt noch „Bayer Material Science AG“ (heute Covestro) – bitte fachlich aktualisieren.
- Impressum der Altseite verweist auf überholte Gesetze (TMG, RStV); die neue Seite nennt DDG und MStV. Eine verantwortliche Person nach § 18 Abs. 2 MStV ist auf der Altseite nicht angegeben.
- Beiträge mit Platzhalter-Adressen („lorem-ipsum-news-1“, reine Zahlen), ein englischer Titel aus „$$$$“, deutsche Texte in EN/FR/HU/ES-Beiträgen.
- Öffentlich erreichbare Reste des früheren Shops von 2019 (AGB, Widerruf, Zahlungsarten, Lieferung) – werden auf passende neue Seiten umgeleitet.
- Die Karten der Altseite basierten auf Google Maps (Elementor-Widget und JetEngine-Karte) und luden damit einen Drittanbieter; die neue Karte ist selbst gehostet und braucht keine Einwilligung.
- Der englische Produktfinder (Grundlage auch für FR, HU, ES) enthielt 385 deutsche oder zusammengeklebte Optionstexte in 109 Produkten („4 Wochen“, „andere Leistung im Feld Sonderwünsche angeben“, „… Special Requestsünsche angeben“). Sie sind über die Options-IDs mit der deutschen Fassung abgeglichen und übersetzt; Schreibweisen (Dezimalzeichen, „Other …: please specify under Special Requests“) sind vereinheitlicht.
- Vier Genauigkeitsklassen waren im Shop vertippt (z. B. „0.S5“, „0.FS5“, „.2“, „05“) und sind aus der Reihe derselben Option ergänzt – Liste in `audit.md`, bitte bestätigen.
- Produkttexte in vertauschter Sprache: KSR 60/62 und KSSH 44 (englisch = deutsch), KSER 104 (englisch = deutsch, dazu „Double-pole“ statt einpolig), UGSSF 704 (deutsch = englisch), KSER 100 (englisch nannte 2 statt 1 Klemmenabdeckung). Übersetzt bzw. an die deutsche Fassung angeglichen.
- Die Schwerpunkte der Werke standen auch auf der deutschen Standortseite überwiegend auf Englisch, die Liste von Marchtrenk fehlte in der Übersicht, und die englischen Adressen waren zusammengeklebt („…92-9822041 HamburgGermany“). Schwerpunkte liegen jetzt in allen fünf Sprachen vor, das Land wird je Sprache ergänzt.

## 5. Betrieb und Go-Live

**Anforderungen.** Jeder Webserver für statische Dateien. Für die Formulare (Anfrage, Kontakt) wird PHP 8 mit `mail()` oder ein angebundenes SMTP benötigt; ohne PHP zeigen die Formulare eine Kopierfunktion für die Anfrage. Die mitgelieferte `.htaccess` ist für Apache geschrieben (Sicherheitsheader, Caching, Komprimierung, Sprachweiche, Weiterleitungen).

**Schritte.**

1. Inhalt von `dist/` in den Webroot von `ritz-international.com` kopieren.
2. In `dist/api/anfrage.php` und `dist/api/kontakt.php` Empfängeradressen und Absender prüfen (je Produktbereich vorbelegt mit den bisherigen Vertriebsadressen).
3. Dokumente umziehen: `bash _projekt/dokumente-migration.sh` im Webroot ausführen (lädt alle 1.272 Dateien nach `/dokumente/`), dann die Seite mit `DOCBASE=/dokumente/ node build.mjs` neu bauen, damit alle Links auf den eigenen Server zeigen. Anschließend `_projekt/dokumente-redirects-hauptdomain.htaccess` in die `.htaccess` übernehmen.
4. Für `produkte.ritz-international.com` die Datei `_projekt/produkte-domain.htaccess` (Produktseiten) und `_projekt/dokumente-redirects-produktdomain.htaccess` (Dokumente) als `.htaccess` einsetzen, damit alte Produktlinks und Datenblatt-Links auf die neue Seite führen.
5. Sitemap in der Google Search Console einreichen: `https://ritz-international.com/sitemap.xml`.

**Entwurf auf GitHub Pages.** Die Entwurfsfassung läuft unter https://ritz.entwurf.medialyte.de (Repository `danieldogan39-code/ritz-website`, Branch `main`, ausgeliefert über den gleichlautenden Stand im Branch `gh-pages`; Quellcode im Branch `quellcode`). Gebaut wird sie mit `DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs`: alle Adressen in canonical, hreflang und Vorschaubildern zeigen auf die Entwurfsadresse, die Seite ist für Suchmaschinen gesperrt, Formulare versenden nichts (Hinweis und Text zum Kopieren), die Startadresse zeigt direkt die deutsche Startseite ohne Weiterleitung, PHP-Dateien und `_projekt/` entfallen. Verweise aus alten Newsbeiträgen auf Seiten der alten Website sind auf die neuen Seiten umgestellt (oder bleiben als Text stehen).

**Wichtig zu den Dokumenten.** Bis zur Migration verlinkt die Seite alle Dokumente an ihren bisherigen Adressen (`/wp-content/uploads/…` auf ritz-international.com und `/media/…` auf produkte.ritz-international.com). Wird die Domain umgestellt, also entweder Schritt 3 vor dem Go-live ausführen oder den bisherigen Ordner `/wp-content/uploads/` unverändert in den neuen Webroot übernehmen und den Produktfinder-Server für `/media/` weiterlaufen lassen.

## 6. Inhalte pflegen

| Was | Wo |
|---|---|
| Texte der Seiten, Navigation, Beschriftungen | `site/src/i18n/de.js`, `en.js`, `fr.js`, `hu.js`, `es.js` |
| Produkte, Optionen, Dokumente, News, Stellen | Aufbereitung aus den Rohdaten: `tools/normalize_products.py`, `tools/prepare.py` → `site/src/data/build/*.json` |
| Standorte, Ansprechpartner, Vertretungen | `tools/normalize_contacts.py` → `site/src/data/contacts.json` |
| Zuordnungen (Referenzen, Zertifikate, Bilder der Historie) | `site/src/lib/catalog.js` |
| Gestaltung | `site/src/styles/main.css`, `extra.css` |

Nach jeder Änderung: `cd site && npm install` (einmalig), dann `node build.mjs`. Der Build dauert rund 10 Sekunden und schreibt die komplette Seite nach `site/dist/`. Mit `npm run check:i18n` prüft man, ob alle Sprachdateien vollständig zur englischen passen.

**Qualitätssicherung.** In `site/tools/qa/` liegen automatische Prüfungen mit Playwright: `crawl.mjs` (alle Seiten: Konsolenfehler, fehlende Ressourcen, Überläufe, interne Links), `shot.mjs` (Bildschirmfotos), `map.mjs` (Karten), `configurator.mjs` (Konfigurator), `flow.mjs` (Finder, Vergleich, Anfrage, Suche, Sprachwechsel), `spa.mjs` (Vorschau), `a11y.mjs` (WCAG 2.1 AA mit axe-core) und `perf.mjs` (Ladezeit und Layoutstabilität bei gedrosseltem Mobilfunk). Aufruf jeweils mit laufendem lokalen Server (`cd dist && python3 -m http.server 8080`). `npm run check:i18n` prüft alle Sprachdateien.

## 7. Offene Punkte für RITZ

1. **Produktfotos.** Der bisherige Produktfinder war während der Umsetzung nicht mehr erreichbar, als die 424 Produktbilder geladen werden sollten. Die Seite zeigt deshalb die Produktfamilienbilder der Hauptseite und, wo keines existiert, das Typenschild. Sobald der Server erreichbar ist: `cd site && node tools/fetch_product_images.mjs`, danach `python3 ../tools/normalize_products.py && python3 ../tools/prepare.py && node build.mjs`.
2. **Rechtstexte prüfen lassen.** Impressum und Datenschutzerklärung sind auf den aktuellen Stand gebracht (DDG, MStV, DSGVO, keine Cookies, kein Tracking), müssen aber juristisch freigegeben werden. Verantwortliche Person nach § 18 Abs. 2 MStV ergänzen.
3. **Übersetzungen FR, HU, ES.** Oberflächentexte, Standort-Schwerpunkte und die Namen der 15 Katalogprodukte liegen in allen fünf Sprachen vor. Produktbeschreibungen und Konfiguratoroptionen gab es auf den Altseiten nur auf Deutsch und Englisch; sie erscheinen in FR, HU und ES auf Englisch und sind für Screenreader entsprechend ausgezeichnet. Die neuen FR/HU/ES-Texte bitte von Muttersprachlern gegenlesen lassen.
4. **Fachliche Freigaben.** Übersetzungen, die es auf den Altseiten nicht gab: Beiträge „25 Jahre hochgenaue DC-Messung“ und „Besuchen Sie uns im Deutschen Pavillon in Taschkent“ (DE), „Sponsorship: Sportclub Lichteneiche“ (EN), VDE-Zählerfachtagung 2024 (EN, FR, HU, ES); Produkttexte KSR 60/62, KSSH 44, KSER 104 (EN) und UGSSF 704 (DE); Standort-Schwerpunkte in allen Sprachen (u. a. „Product & Equipment“ → „Produkte & Betriebsmittel“). Dazu: ergänzte Genauigkeitsklassen (GSO 1307, GSO 2507, GSO 5539, UGSS 304), Kennzahlen (1.500+ Mitarbeitende, 10 Standorte in 6 Ländern, über 50 Länder mit Vertretung), DUROMER-Partnerangabe, Typart von GBMW/GBMEI.
5. **Formulare.** Empfänger, Absender und gegebenenfalls SMTP in `api/*.php` festlegen und einen Testversand machen.
6. **Stellenangebote.** Die 15 Stellen sind ein Stand vom Oktober 2026 aus Personio; für eine automatische Aktualisierung kann der Personio-XML-Feed beim Build eingelesen werden.

## 8. Ordnerstruktur

```
dist/                    fertige Website (in den Webroot kopieren)
  de/ en/ fr/ hu/ es/    Seiten je Sprache
  assets/                CSS, JavaScript, Schriften, Logo
  img/                   Bilder in mehreren Breiten (WebP)
  data/                  Daten für Finder, Suche, Karte, Downloads
  api/                   PHP-Endpunkte für Anfrage und Kontakt
  _projekt/              Dokumentation, Inventare, Weiterleitungen, Migration (nicht öffentlich verlinkt)
site/
  build.mjs              Build (statische Seite und Vorschau)
  src/views/             Seitenvorlagen (gemeinsam für Build und Vorschau)
  src/client/            Browser-Skripte (Finder, Konfigurator, Karte, Suche …)
  src/lib/               gemeinsame Logik (Routen, Produktdaten, Formatierung)
  src/i18n/              Sprachdateien
  src/styles/            Gestaltung
  tools/                 Prüf- und Hilfsskripte
tools/                   Datenaufbereitung (Python)
raw/                     Rohdaten der Altseiten (Produkte, Beiträge, Bilder, Dokumentliste)
```

Hinweis: Den Ordner `_projekt/` vor dem Go-live aus dem öffentlichen Webroot entfernen oder per Server-Regel sperren (die `.htaccess` sperrt ihn bereits).
