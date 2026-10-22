# RITZ Instrument Transformers – neue Website

Übergabedokumentation · Stand 22. Oktober 2026 · Konzeption, Design und Umsetzung: Medialyte

Dieses Paket enthält die fertig gebaute neue Website (Ordner `dist/`), den vollständigen Quellcode mit Datenaufbereitung (Ordner `site/` und `tools/`), die Bestandsaufnahme der beiden bisherigen Websites und alles für den Umzug: Weiterleitungen, Dokumentenmigration und Server-Konfiguration.

---

## 1. Ergebnis auf einen Blick

| | |
|---|---|
| Seiten | 1.880 statische Seiten in 5 Sprachen (DE, EN, FR, HU, ES) |
| Produkte | 298 Produkte aus dem bisherigen Produktfinder und dem Hauptkatalog, 282 davon mit Konfigurator; 243 ohne Foto mit eigener, bemaßter Schemazeichnung |
| Werkzeuge | Spezifikations-Check (Ausschreibung, E-Mail, Excel, Word, PDF, GAEB → passende Typen, vorkonfiguriert), Wandler-Rechner, Projektmappe mit Terminplanung und Ausschreibungstexten |
| Dokumente | 1.272 Datenblätter, Maßzeichnungen, Kataloge, Zertifikate und Bedingungen, filterbar – 226 davon direkt auf der eigenen Seite (`/dokumente/w/…`), die übrigen per Anforderung über das eigene Kontaktformular, kein Link auf die Altseiten |
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

**Produktseiten mit Konfigurator.** Die abhängigen Optionen des alten Magento-Shops (welche Option welche weiteren Optionen und Werte freischaltet) sind vollständig nachgebaut. Pflichtangaben werden geprüft, die Konfiguration landet mit Stückzahl in der Projektmappe. Das Typenschild füllt sich während der Auswahl live; aus einer frei formulierten Anforderung („400/5 A 0,5 FS5 15 VA, 24 kV“) belegt der Konfigurator die passenden Optionen selbst vor; der fertige Ausschreibungstext lässt sich kopieren; jede Konfiguration ist als Link teilbar.

**Schemazeichnungen für Produkte ohne Foto.** Für 243 Produkte gab es auf den Altseiten kein Bild. Sie bekommen eine isometrische Schemazeichnung ihrer Bauform (Aufsteck-, Durchführungs-, Rahmen- und Kabelumbau-Stromwandler, Stützer-, Generator- und Durchführungswandler, ein- und zweipolige Spannungswandler, metallgekapselte Wandler, Summen-, Zwischen- und Laborwandler, Bedämpfungseinrichtungen …) mit rot hervorgehobenem Primärleiter, Klemmen, Abdeckung und Tragschiene. Proportionen und Bemaßung (B/H/T, Innen-Ø, Fensteröffnung, Schienen, Kabel) liest der Build aus den Datenblatt-Texten (`src/lib/dims.js`), die Zeichnung entsteht in `src/lib/visual.js`. Auf der Produktseite gibt es dazu das Typenschild als zweite Ansicht und den Link „Maßbild anfordern“; die Maße stehen zusätzlich in den technischen Daten. Vorschau aller Zeichnungen: `node tools/qa/pv-preview.mjs <ordner>`.

**Werkzeuge (Engineering-Suite).** *Spezifikations-Check:* Ausschreibungstext, E-Mail, Typenschilddaten, Excel-, Word-, PDF-, CSV-, E-Mail- oder GAEB-Datei einfügen – der Check erkennt Positionen, Mengen, Kennzeichen und technische Daten (Übersetzung, Klassen, Bürden, Um, Ith, Frequenz, Normen, Bauform), schlägt je Position passende RITZ-Typen mit begründeter Übereinstimmung vor, konfiguriert sie vor und übernimmt alles in die Projektmappe. *Wandler-Rechner:* Leitungsbürde, wirksamer Überstrom- und Genauigkeitsgrenzfaktor, Kurzschlussfestigkeit, Primärstrom aus Last, Spannungswandler-Auslegung – mit Rechenweg und Normbezug. *Projektmappe:* Positionen mit Kennzeichen, Stückzahl und Sonderwünschen, Bestelltermine rückwärts aus Liefertermin und Lieferzeit, Ausschreibungstexte, CSV-Export, Teilen per Link, Anfrage mit allen Konfigurationen an den zuständigen Vertrieb. Alles läuft im Browser; Texte und Dateien verlassen das Gerät erst mit einer Anfrage.

**Vergleich.** Bis zu vier Produkte nebeneinander, Unterschiede hervorgehoben.

**Downloads.** Alle Dokumente beider Altseiten an einem Ort, filterbar nach Dokumentart, Produktbereich und Sprache, durchsuchbar nach Titel, Typcode und Dateiname. Liegt eine Datei auf der neuen Seite, wird sie unter `/dokumente/…` geladen; sonst führt „Anfordern“ in das eigene Kontaktformular – Thema und Nachricht (Titel und Dateiname) sind vorbelegt, auf Produktseiten gibt es „Alle Unterlagen anfordern“. Kein Link führt auf die alten Websites (Prüfskript `node tools/qa/oldlinks.mjs dist`).

**Dokumente je Sprachfassung.** Wie auf der bisherigen Website zeigt jede Sprachfassung ihre eigenen PDFs: Für jedes Dokument der Hauptseite ist hinterlegt, in welchen Sprachfassungen es verlinkt war (`vis`), unter welchem Titel (`tl`) und welches Dokument die anderssprachige Fassung derselben Seite an derselben Stelle zeigte (`alt`); Produktbereiche merken sich zusätzlich, welche Sprachfassung ihrer Bereichsseite ein Dokument zeigte (`areaLangs`). Ermittelt wird das in `tools/prepare.py` aus den Seiten aller fünf Sprachfassungen (Linkziel, Linktext, Position), die Sprache der Dateien selbst aus dem PDF-Text. Die Seiten wählen über `src/lib/doclang.js` aus: ein Dokument, das eine Sprachfassung nicht zeigte, wird durch sein Gegenstück ersetzt oder weggelassen; byte-gleiche Kopien erscheinen nur einmal. Das gilt für Produktbereiche, Produktseiten, Anwendungen, Qualität, Verantwortung, Referenzen, Karriere, News-Anhänge, das Downloadcenter und die Suche. Dokumente aus dem Produktfinder gelten in allen Sprachen. Prüfskripte: `node tools/qa/doc-langs.mjs` (Daten gegen die PDF-Listen der alten Seiten) und `node tools/qa/doc-pages.mjs` (gebaute Seiten).

**Karten.** Eigene, datenschutzfreundliche Weltkarte (keine Google- oder OpenStreetMap-Einbindung): Standorte und Vertretungen, Regionen, Zoom und Verschieben mit Maus, Touch und Tastatur, Suche über Länder und Firmen, Detailkarte mit Telefon, E-Mail und Routenlink. Jede Standortkarte zeigt zusätzlich einen Kartenausschnitt.

**Anwendungen.** Sieben Einstiege nach Kundensegment (Netze, Schaltanlagenbau, Industrie, Bahn, Erneuerbare/HGÜ/Power Quality, Kraftwerke, Mess- und Prüftechnik) mit den passenden Produktgruppen, Referenzen, Unterlagen und Ansprechpartnern.

**Suche.** Gesamtsuche über Produkte, Seiten und Dokumente (Strg/Cmd + K oder „/“), Typcodes werden direkt erkannt.

**Startseite.** Erst Präsentation, dann Verkauf. Die Bühne zeigt den Ringkern eines Messwandlers aus der Fertigung, darüber legt sich eine Mess-Optik als Vektorgrafik (Skala, Fadenkreuz, umlaufende Abtastbögen, zwei Beschriftungen mit Führungslinien und eine Anzeige „Primärstrom 2000 A → Sekundärstrom 5 A“). Foto und Grafik teilen sich ein Koordinatensystem in Fotopixeln (`STAGE` in `src/views/home.js`), deshalb bleibt die Optik bei jeder Breite exakt auf dem Kern; auf schmalen Bildschirmen entfallen Beschriftungen und Anzeige. Der Seitenkopf liegt transparent über der Bühne und wird beim Scrollen wieder weiß. Darunter erzählt die Seite in Kapiteln: das Prinzip des Messwandlers mit drei Kennzahlen, das Spektrum von 0,72 bis 550 kV (sechs Produktbereiche als Balken auf logarithmischer Achse; Zeiger oder Fokus wechselt das Bild daneben), die Fertigung als Bildband, die Werke der Gruppe auf der Weltkarte (Liste und Karte reagieren aufeinander), die Geschichte in sechs Etappen, Prüfung und Zertifikate, die vier jüngsten News als ruhige Liste und Karriere. Die Kennzahlen der Gruppe (gegründet 1945, Mitarbeitende, Werke und Länder, Spannungsbereich, Länder mit Vertretung) werden aus den Standort- und Vertretungsdaten berechnet.

**Startseite in Bewegung.** Beim ersten Besuch je Sitzung zeigt ein kurzes Intro (etwa 2,6 Sekunden, jederzeit per Klick, Taste, Mausrad oder Wischen zu überspringen) das Messwandler-Prinzip: Ein großer Primärstrom (2000 A) läuft in den Ringkern, heraus kommt ein kleiner, proportionaler Sekundärstrom (5 A). Dann setzt sich das RITZ-Zeichen zusammen und fliegt an seinen Platz im Seitenkopf. Danach zeichnet sich die Mess-Optik auf der Bühne (Ring, Skala, Führungslinien, Beschriftungen, Messkurven), der Leitsatz steigt auf, das Foto zoomt langsam; die Balken des Spektrums wachsen beim Scrollen von links ein, Bilder öffnen sich, Kennzahlen zählen hoch und das Standortnetz zeichnet sich von Hamburg aus. Außerhalb des sichtbaren Bereichs pausieren die Endlos-Bewegungen. Bewegt werden nur `transform`, `opacity` und `clip-path`. Bei „Bewegung reduzieren“, ohne JavaScript und im Druck ist alles sofort sichtbar; Vorleseprogramme hören immer die Endwerte. Gesteuert wird das über `data-intro` und die Klasse `rv` am Wurzelelement (Kopfskript in `build.mjs`, Stile in `home.css` und `extra.css`, Auslöser in `src/client/motion.js`, u. a. `initStage`). Prüfskript: `node tools/qa/intro.mjs`.

**Navigation.** Die Mega-Menüs zeigen nicht mehr alles auf einmal: links eine kurze Liste (Produktbereiche mit Spannungsbereich, Anwendungen, Unternehmensseiten), rechts die Vorschau des gewählten Eintrags mit Bild, einem Satz, den Unterpunkten und dem Link zur Seite. Der Zeiger wählt nach kurzer Verweildauer (eine Diagonale zur Vorschau schaltet nicht um), die Tastatur sofort; das Panel steht im DOM direkt hinter seinem Knopf, Tab führt vom Knopf durch die Einträge zum nächsten Menüpunkt und schließt das Panel. Prüfskript: `node tools/qa/menu.mjs`.

**News.** Oben die drei jüngsten Beiträge mit Foto, darunter alle Beiträge als ruhige Liste nach Jahren (Datum, Thema, Titel); die Jahreszahl bleibt beim Scrollen stehen. Der Themenfilter blendet die Fokus-Karten aus und zeigt alle Treffer in der Liste.

**Unternehmen.** Die Firmenstruktur ist kein Bild mehr, sondern ein Organigramm aus HTML: RITZ Stiftung → RITZ-Gruppe → fünf Gesellschaften mit Land und Standorten (Standorte verlinken auf die Standortseite), darunter die ungarische Tochter der österreichischen Gesellschaft; auf Telefonen als senkrechter Baum. Darunter die Marken unter dem Dach von RITZ (RITZ, WTW, TuR, MWB) mit dem Jahr der Übernahme. Die Logos stammen aus der Grafik der bisherigen Website (`raw/img/misc/brand-*.png`, `ritz-group.png`).

**Fuß.** Links auf die Profile bei LinkedIn, Instagram und Xing (wie im Fuß der bisherigen Website; die Netzwerk-Logos selbst sind nicht nachgezeichnet, die Links stehen als Text) und das Förderlogo des BMWi in lesbarer Größe.

**Weiteres.** Hell- und Dunkelmodus (folgt dem System, umschaltbar), druckfreundliche Produktseiten, strukturierte Daten (Organization, Product, NewsArticle), Sitemap mit Sprachzuordnung, saubere Sprachwechsel auf die jeweils gleiche Seite.

## 3. Konzept

**Zielgruppen.** Netzbetreiber und Stadtwerke, Schaltanlagenbauer, Industrie und Infrastruktur, Bahnindustrie, Erneuerbare und HGÜ, Kraftwerke sowie Mess- und Prüflabore. Sie kommen in der Regel mit einer konkreten Anforderung (Spannungsebene, Strom, Klasse, Norm) oder einem Typcode. Die Seite ist deshalb vom Datenblatt aus gedacht: schnell zum passenden Produkt, zum Dokument und zum zuständigen Menschen.

**Informationsarchitektur.** Produkte (sechs Bereiche, Finder, Vergleich, Anfrage) · Anwendungen (sieben Segmente) · Downloads · Unternehmen (Über RITZ, Standorte, Qualität und Zertifikate, Verantwortung, Referenzen) · Karriere (Stellen, Ausbildung, Praktika) · News · Kontakt. Die Hauptnavigation bleibt auf jeder Seite gleich; die Mega-Menüs zeigen eine kurze Liste und die Vorschau des gewählten Eintrags.

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
3. Dokumente: Alle Dokumentlinks zeigen bereits auf die neue Seite. Dateien, die im Dokumentenbestand `raw/docs/<pfad>` liegen (Zielpfad wie in `_projekt/dokumente-migration.csv`), veröffentlicht der Build unter `/dokumente/<pfad>`; alle übrigen erscheinen als „Anfordern“ (eigenes Kontaktformular, vorbelegt). Variante auf dem Server: `bash _projekt/dokumente-migration.sh` im Webroot lädt die noch erreichbaren Dateien der Altseiten nach `/dokumente/`; danach mit `DOCBASE=/dokumente/ node build.mjs` bauen (dann gelten alle Dokumente als vorhanden – nur sinnvoll, wenn wirklich alle Dateien liegen). Anschließend `_projekt/dokumente-redirects-hauptdomain.htaccess` in die `.htaccess` übernehmen.
4. Für `produkte.ritz-international.com` die Datei `_projekt/produkte-domain.htaccess` (Produktseiten) und `_projekt/dokumente-redirects-produktdomain.htaccess` (Dokumente) als `.htaccess` einsetzen, damit alte Produktlinks und Datenblatt-Links auf die neue Seite führen.
5. Sitemap in der Google Search Console einreichen: `https://ritz-international.com/sitemap.xml`.

**Entwurf auf GitHub Pages.** Die Entwurfsfassung läuft unter https://ritz.entwurf.medialyte.de (Repository `danieldogan39-code/ritz-website`, Branch `main`, ausgeliefert über den gleichlautenden Stand im Branch `gh-pages`; Quellcode im Branch `quellcode`). Gebaut wird sie mit `DIST=dist-gh SITE=https://ritz.entwurf.medialyte.de DRAFT=1 ONLY=static node build.mjs`: alle Adressen in canonical, hreflang und Vorschaubildern zeigen auf die Entwurfsadresse, die Seite ist für Suchmaschinen gesperrt, Formulare versenden nichts (Hinweis und Text zum Kopieren), die Startadresse zeigt direkt die deutsche Startseite ohne Weiterleitung, PHP-Dateien und `_projekt/` entfallen. Verweise aus alten Newsbeiträgen auf Seiten der alten Website sind auf die neuen Seiten umgestellt (oder bleiben als Text stehen).

**Wichtig zu den Dokumenten.** Die Seite verlinkt keine Datei mehr an ihrer alten Adresse. Die 226 Dateien der bisherigen Hauptseite (Datenblätter, Broschüren, Zertifikate, Verhaltenskodizes, AGB) liegen unter `/dokumente/w/` und werden direkt geöffnet; 8 weitere waren auf der Altseite schon nicht mehr vorhanden (7 Ausbildungs-Flyer von 2023, eine Produktinformation von 2018) und laufen wie alles Fehlende über „Anfordern“ (eigenes Kontaktformular, vorbelegt). Die 1.037 Dateien des bisherigen Produktfinders (`produkte.ritz-international.com/media/…`) sind nicht mehr abrufbar – das Hosting-Konto der Produktdomain ist abgeschaltet („Dieser Account ist zur Zeit nicht erreichbar“) – und müssen von RITZ aus dem internen Bestand in `raw/docs/p/…` gelegt werden. Prüfung nach jedem Build: `node tools/qa/oldlinks.mjs dist` (meldet jeden Link auf die Altseiten).

## 6. Inhalte pflegen

| Was | Wo |
|---|---|
| Texte der Seiten, Navigation, Beschriftungen | `site/src/i18n/de.js`, `en.js`, `fr.js`, `hu.js`, `es.js` |
| Produkte, Optionen, Dokumente, News, Stellen | Aufbereitung aus den Rohdaten: `tools/normalize_products.py`, `tools/prepare.py` → `site/src/data/build/*.json` |
| Standorte, Ansprechpartner, Vertretungen | `tools/normalize_contacts.py` → `site/src/data/contacts.json` |
| Zuordnungen (Referenzen, Zertifikate, Bilder der Historie und der Werke) | `site/src/lib/catalog.js` |
| Texte der Werkzeuge (Check, Rechner, Projektmappe) | `site/src/i18n/x/de.js`, `en.js`, `fr.js`, `hu.js`, `es.js` |
| Bilder der Startseiten-Bühne | `HERO_SLIDES` in `site/src/views/home.js` |
| Gestaltung | `site/src/styles/main.css`, `extra.css`, `tools.css`, `visual.css` (Schemazeichnungen), `home.css` (Startseite) |

Nach jeder Änderung: `cd site && npm install` (einmalig), dann `node build.mjs`. Der Build dauert rund 10 Sekunden und schreibt die komplette Seite nach `site/dist/`. Mit `npm run check:i18n` prüft man, ob alle Sprachdateien vollständig zur englischen passen.

**Qualitätssicherung.** In `site/tools/qa/` liegen automatische Prüfungen mit Playwright: `crawl.mjs` (alle Seiten: Konsolenfehler, fehlende Ressourcen, Überläufe, interne Links), `shot.mjs` (Bildschirmfotos), `map.mjs` (Karten), `configurator.mjs` (Konfigurator), `flow.mjs` (Finder, Vergleich, Anfrage, Suche, Sprachwechsel), `spa.mjs` (Vorschau), `a11y.mjs` (WCAG 2.1 AA mit axe-core), `perf.mjs` (Ladezeit und Layoutstabilität bei gedrosseltem Mobilfunk), `img-audit.mjs` (Bildschärfe: benötigte gegen vorhandene Pixel je Bild, Seiten ohne Bild), `oldlinks.mjs` (keine Links auf die Altseiten), `pv-preview.mjs` (alle Schemazeichnungen), `tools-probe.mjs` (Werkzeuge in jeder Sprache: `node tools/qa/tools-probe.mjs /tmp/w 390 hu`), `files-probe.mjs`, `mappe-probe.mjs`, `smart-probe.mjs` (Werkzeuge), `wide.mjs` und `minwidth.mjs` (Seitenbreite auf dem Telefon: was verbreitert die Seite, welche Wörter erzwingen die Mindestbreite) und `i18n-check.mjs` (Übersetzungen der Werkzeuge: Schlüssel, Listen, Platzhalter). Die Parser-Tests (`node tools/test/spec.test.mjs`) decken alle fünf Sprachen ab, auch Wortgrenzen neben Akzenten (z. B. „áttétel“). Aufruf jeweils mit laufendem lokalen Server (`cd dist && python3 -m http.server 8080`). `npm run check:i18n` prüft alle Sprachdateien.

## 7. Offene Punkte für RITZ

1. **Produktfotos und Bildauflösung.** Der bisherige Produktfinder ist abgeschaltet; seine 424 Produktbilder sind nicht mehr abrufbar. Die Seite zeigt deshalb die Produktfamilienbilder der Hauptseite und, wo keines existiert, die bemaßte Schemazeichnung. Liefert RITZ die Produktfotos (Dateinamen wie im alten Produktfinder): in `raw/img/pimg/` ablegen bzw. `node tools/fetch_product_images.mjs` anpassen, danach `python3 ../tools/normalize_products.py && python3 ../tools/prepare.py && node build.mjs`. Die Bilder der Hauptseite stammen aus den Originaldateien der WordPress-Mediathek (59 Motive dadurch in höherer Auflösung, bis 2.560 px). 142 Motive gab es auf der Altseite nur in der jetzt genutzten Größe (Produktfotos meist 623 px breit); kein Bild wird über seine natürliche Größe hinaus vergrößert. Für gestochen scharfe Darstellung auf hochauflösenden Bildschirmen bitte Originale aus der Bilddatenbank liefern und mit `node tools/import_originals.mjs <ordner>` übernehmen (Dateinamen wie in der Mediathek; das Skript wählt je Motiv die größte Datei und lässt die Varianten neu rechnen).
2. **Dokumente des Produktfinders.** 1.037 Datenblätter, Maßblätter und Anleitungen des alten Produktfinders (Server abgeschaltet) bitte aus dem internen Bestand in `raw/docs/p/…` legen (Pfade in `_projekt/dokumente-migration.csv`); bis dahin werden sie über das Kontaktformular angefordert. Die Dokumente der Hauptseite sind bereits übernommen.
3. **Rechtstexte prüfen lassen.** Impressum und Datenschutzerklärung sind auf den aktuellen Stand gebracht (DDG, MStV, DSGVO, keine Cookies, kein Tracking), müssen aber juristisch freigegeben werden. Verantwortliche Person nach § 18 Abs. 2 MStV ergänzen.
4. **Übersetzungen FR, HU, ES.** Oberflächentexte einschließlich der Werkzeuge, Standort-Schwerpunkte und die Namen der 15 Katalogprodukte liegen in allen fünf Sprachen vor. Produktbeschreibungen und Konfiguratoroptionen gab es auf den Altseiten nur auf Deutsch und Englisch; sie erscheinen in FR, HU und ES auf Englisch und sind für Screenreader entsprechend ausgezeichnet. Die neuen FR/HU/ES-Texte bitte von Muttersprachlern gegenlesen lassen.
5. **Fachliche Freigaben.** Übersetzungen, die es auf den Altseiten nicht gab: Beiträge „25 Jahre hochgenaue DC-Messung“ und „Besuchen Sie uns im Deutschen Pavillon in Taschkent“ (DE), „Sponsorship: Sportclub Lichteneiche“ (EN), VDE-Zählerfachtagung 2024 (EN, FR, HU, ES); Produkttexte KSR 60/62, KSSH 44, KSER 104 (EN) und UGSSF 704 (DE); Standort-Schwerpunkte in allen Sprachen (u. a. „Product & Equipment“ → „Produkte & Betriebsmittel“). Dazu: ergänzte Genauigkeitsklassen (GSO 1307, GSO 2507, GSO 5539, UGSS 304), Kennzahlen (1.500+ Mitarbeitende, 10 Standorte in 6 Ländern, über 50 Länder mit Vertretung), DUROMER-Partnerangabe, Typart von GBMW/GBMEI. Neu auf der Startseite: die Kapiteltexte (Prinzip mit 0,2S / 50.000 A / 550 kV, Spektrum, Fertigung, Prüfung), die Beschriftungen der Mess-Optik und die Etappen 1945, 1956, 1991, 2003, 2008, 2026.
6. **Formulare.** Empfänger, Absender und gegebenenfalls SMTP in `api/*.php` festlegen und einen Testversand machen.
7. **Stellenangebote.** Die 15 Stellen sind ein Stand vom Oktober 2026 aus Personio; für eine automatische Aktualisierung kann der Personio-XML-Feed beim Build eingelesen werden.
8. **Dokumente je Sprache prüfen.** Die Zuordnung folgt den alten Seiten, samt ihrer Eigenheiten: Fünf Produkte zeigen in manchen Sprachen kein Hauptseiten-PDF, weil die alte Seite dort keines verlinkt hatte (GBVBA nur DE; EMVI 4005, Zusatzbürde, GBMW, GBMEI nur DE/EN); auf der Qualitätsseite zeigt DE die deutschen, EN/FR/HU/ES die englischen ISO-Zertifikate; den IRIS-Silber-Nachweis verlinkten FR/HU/ES nicht, dort führt die Karte zur Anforderung. Der Titel „Produktinformation TE-Messung“ (TE146-93.006i01) wirkt fraglich, die Datei liegt nicht vor. Wo RITZ abweichen möchte, genügt ein Eintrag in `tools/prepare.py` (Abschnitt „Dokumente je Sprachfassung“).
9. **Social-Media-Logos.** Im Fuß stehen LinkedIn, Instagram und Xing als Textlinks. Sollen die Netzwerk-Logos erscheinen, bitte die offiziellen Dateien aus den Markenportalen der Netzwerke liefern; sie lassen sich dann in `footer()` (`src/views/layout.js`) einsetzen.

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
