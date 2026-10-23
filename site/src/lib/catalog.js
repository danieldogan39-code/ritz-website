// Redaktionelle Zuordnungen (sprachunabhängig)
export const SECTOR_LINKS = {
  netze: { docs: ['Produktwissen_kompakt_metallgekapselte_Kombiwandler.pdf', 'Compact_product_knowledge_metal_clad_combined_transformers.pdf', 'Produktwissen_kompakt_Zusatzbuerde.pdf', 'Compact_product_knowledge_additonal_burden.pdf', 'PQ_Analyse_DE.pdf'], news: ['kombiwandler-platzersparnis', 'zusatzbuerde'], areas: ['mittelspannung', 'hochspannung'] },
  schaltanlagenbau: { docs: ['RITZ-Metallgekapselte_Messwandler_GER_2013-02-1.pdf', 'RITZ-Mittelspannungswandler_Standard_GER_2014_01-2-1.pdf', 'Technische_Spezifikation_SIS.pdf', 'F2PD003_Tender_Textbesipiele_SIS_DE.pdf'], news: ['ge-hypact-anlage', 'kundenreferenz-sis'], areas: ['mittelspannung', 'stromschienen-sis', 'elektronik-sensoren'] },
  industrie: { docs: ['Kundenreferenz-SIS-Projekt-BSW.pdf', 'RITZ-Ringkern-Stromwandler_bis_10000A.pdf', 'RITZ-ERKU23_Zweiteilige_Kabelumbau-Stromwandler-GER_2013-02.pdf', 'RITZ_SIS_Broschuere_DE-1.pdf'], news: ['kundenreferenz-sis', 'emvi-produktneuheit'], areas: ['stromschienen-sis', 'niederspannung', 'elektronik-sensoren'] },
  bahn: { docs: ['Ritz-Messwandler-IRIS-Certificate-2024.pdf', 'IRIS_silver_status.pdf'], news: ['ritz-marchtrenk-erreichte'], areas: ['mittelspannung'] },
  erneuerbare: { docs: ['Produktwissen_kompakt_HVDC.pdf', 'Product_knowledge_compact_HVDC.pdf', 'Die_Power_Quality_Analyse.pdf', 'MKGBEA24_DE_23.04.2018._Digitale-Version.pdf', 'MKGBEA24_EN.pdf', '2302-AM-Offenbach-v6.pdf', 'J2-DE_EMVI-4005-Word-DATENBLATT_2Seiter.pdf'], news: ['uebersicht-hvdc', 'emvi-produktneuheit', 'auszeichnung-zum-lieferanten'], areas: ['elektronik-sensoren', 'mittelspannung'] },
  kraftwerke: { docs: ['IRBT_Generatorwandler_optimiertes_Design.pdf', 'IRBT_generator_transformer_optimized_design.pdf'], news: ['irbt-generatorwandler', 'neues-werk-in-waynesboro'], areas: ['mittelspannung', 'hochspannung'] },
  messtechnik: { docs: ['Akkreditierung-Ritz-AT_ISO-17025.pdf', 'EOSS_122_DE_2021-11-1.pdf', 'Produktwissen_kompakt_Zusatzbuerde.pdf'], news: ['mehr-sicherheit-fuer-mensch', 'ritz-nimmt-an-xxx-vde'], areas: ['niederspannung', 'elektronik-sensoren'] },
};

export const AREA_IMG = {
  niederspannung: 'mimg/ritz_header-niederspannung.webp', mittelspannung: 'mimg/ritz_header-mittelspannung.webp',
  hochspannung: 'mimg/Hochspannungswandler-Intro2.webp', 'elektronik-sensoren': 'mimg/ritz_header-elektronik.webp',
  'stromschienen-sis': 'mimg/SIS_Slider.webp', 'giessharzteile-duromer': 'mimg/ritz_header-duromer.webp',
};
export const SECTOR_IMG = {
  netze: 'mimg/2022__06__image_empowering_the_future.webp', schaltanlagenbau: 'mimg/2022__07__unternehmen_qualitaetsmanagement_wandler_pruefung.webp',
  industrie: 'mimg/Kundenreferenz-SIS-Projekt-BSW-3.webp', bahn: 'mimg/2022__07__sonderwandler_bahnwandler_gsefb.webp',
  erneuerbare: 'mimg/wind-energy-sq.webp', kraftwerke: 'mimg/IRBT-1.webp', messtechnik: 'mimg/2022__07__unternehmen_qualitaetsmanagement_schienen_pruefung.webp',
};
// Bilder der Unternehmensseiten (Seitenkopf und Vorschau im Menü)
export const PAGE_IMG = {
  company: 'mimg/ritz_header-unternehmen.webp', locations: 'mimg/Luftbild_Kirchaich_2014_klein.webp', quality: 'mimg/JKI1023-2.webp',
  responsibility: 'mimg/image003.webp', references: 'mimg/JKI0984-2-2048x1366.webp', career: 'mimg/IMG_20230607_060125_233.webp',
};

export const HISTORY_IMG = {
  // Zuordnung wie in der Zeitleiste der bisherigen Website (Abschnitt je Jahr: Text und Foto)
  2026: ['mimg/RITZ-USA-HV-Waynesboro-Grand-Opening-2026-Ribbon-Cutting.webp'],
  2022: ['mimg/image17.webp'], 2020: ['mimg/image16.webp'], 2015: ['mimg/image14.webp'], 2008: ['mimg/image13.webp'], 2003: ['mimg/image12.webp'],
  1999: ['mimg/image11.webp'], 1996: ['mimg/image8.webp', 'mimg/image9.webp'], 1991: ['mimg/image5.webp'], 1989: ['mimg/image4.webp'], 1986: ['mimg/image3.webp'],
  1956: ['mimg/image2-1.webp'], 1945: ['mimg/unternehmen_vision_timeline_image_5.webp'],
};

export const PEOPLE_IMG = {
  'Christian Henze': 'mimg/unternehmen_geschaeftsfuehrer_christian_henze.webp',
  'Andreas Grambow': 'mimg/unternehmen_geschaeftsfuehrer_andreas_grambow-e1704732643652.webp',
  'Marcel Rosin': 'mimg/unternehmen_geschaeftsleitung_marcel_rosin.webp',
  'Katrin Pras-Eberenz': 'mimg/unternehmen_geschaeftsleitung_katrin_pras_eberenz.webp',
  'Ingmar Grambow': 'mimg/unternehmen_geschaeftsleitung_ingmar_grambow.webp',
  'Andreas Grambow#board': 'mimg/Managment_intro_4_bild_dr.Andreas_Grambow.webp',
  'Johann Spreitzer': 'mimg/unternehmen_geschaeftsleitung_johann_spreitzer.webp',
  'Dirk Blömer': 'mimg/unternehmen_geschaeftsleitung_dirk_bloemer.webp',
  'Wolfgang Wawrzinek': 'mimg/unternehmen_geschaeftsleitung_wolfgang_wawrzinek.webp',
  'Klaus Heuck': 'mimg/Ritz_0050_5.webp',
  'Gernot Kugler': 'mimg/unternehmen_geschaeftsleitung_gernot_kugler.webp',
};
export function personImg(name, board = false) {
  const key = Object.keys(PEOPLE_IMG).find((k) => name.includes(k.split('#')[0]) && (board ? true : !k.includes('#')));
  if (board && name.includes('Andreas Grambow')) return PEOPLE_IMG['Andreas Grambow#board'];
  return key ? PEOPLE_IMG[key] : null;
}

export const REFERENCE_IMG = ['mimg/Ritz-Lieferanten-auszeichnung.png.webp', 'mimg/Angebauter-Stromwandler-von-Ritz-bei-einer-HYPACT-Schaltanlage.webp', 'mimg/Kundenreferenz-SIS-Projekt-BSW-5.webp', 'mimg/2022__07__unternehmen_referenzen_1.webp'];
export const REFERENCE_DOC = [null, 'RITZ_Solution_GE_HYpact-1.pdf', 'Kundenreferenz-SIS-Projekt-BSW.pdf', '2302-AM-Offenbach-v6.pdf'];
export const REFERENCE_NEWS = ['auszeichnung-zum-lieferanten', 'ge-hypact-anlage', 'kundenreferenz-sis', null];

export const CERT_FILES = {
  QM15: '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-QM15.pdf',
  UM15: '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-UM15.pdf',
  EMSt21: '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-EMSt21.pdf',
  17025: 'Akkreditierung-Ritz-AT_ISO-17025.pdf', 'IRIS-Certificate': 'Ritz-Messwandler-IRIS-Certificate-2024.pdf',
  IRIS_silver_status: 'IRIS_silver_status.pdf', 'AEO-F': 'Zertifizierungsurkunde-RITZ-AEO-F-.pdf',
};

// ---------- Verantwortung ----------
// CO₂-Reduktion 2021–2024 (Scope 1 und 2) je Standort in Europa, laut RITZ-Dokument „CO₂-Reduktion in den Werken“ (Juli 2025)
export const CO2_CUT = { doc: 'RITZ-CO2-Reduktion-in-den-Werken-1.pdf', news: 'co2-reduktion-in-den-werken', from: 2021, to: 2024,
  sites: [['dresden', -92], ['kirchaich', -71], ['hamburg', -49], ['marchtrenk', -48], ['kecskemet', -20]] };
// Maßnahmen aus demselben Dokument; Standorte nur, wo das Dokument sie nennt
export const CO2_MEASURES = { eff: [], elec: [], pv: ['marchtrenk', 'kecskemet'], green: ['kirchaich', 'dresden', 'hamburg', 'marchtrenk'] };
// Zertifizierte Managementsysteme (DQS, Zertifikate vom 17.07.2026): Standorte laut Anhang und Gültigkeit
export const CERT_SCOPE = {
  UM15: { std: 'ISO 14001:2015', sites: ['hamburg', 'dresden', 'kirchaich', 'marchtrenk', 'kecskemet'], valid: '2029-08-14' },
  EMSt21: { std: 'ISO 50001:2018', sites: ['hamburg', 'dresden', 'kirchaich', 'kecskemet'], valid: '2029-09-15' },
};
// LED-Projekt Ottendorf-Okrilla (EFRE/SAB) mit dem Pflichthinweis aus dem RITZ-Dokument
export const LED_PROJECT = { doc: 'Foerderung-des-Projektes-zum-Austausch-der-Beleuchtung-an-dem-Standort-Ottendorf-Okrilla.docx', img: 'mimg/foerderhinweis-efre-sachsen.webp' };
export const FOUNDATION = { img: 'mimg/Screenshot-2025-06-26-183902.webp', news: 'das-neueste-aus-der-alzheimerforschung-veranstaltung-bei-ritz-mit-experten-vom-uke', doc: 'RITZ_Praesentation_UKE_2025-1.pdf' };
// Engagement vor Ort (Beitrag, Bild); Texte je Sprache in pages.responsibility.engage, gleiche Reihenfolge
export const ENGAGE = [
  ['f1-in-schools', 'mimg/image003.webp'],
  ['ritz-oeffnet-tueren-fuer-kleine-entdecker-kita-kinder-blicken-hinter-die-kulissen-der-technik', 'mimg/RITZ_Kita_Kinder_Besuch_im_Werk.webp'],
  ['ein-voller-erfolg-auf-und-neben-dem-platz', 'mimg/Ritz-Naisa.webp'],
  ['sponsoring-sportclub-lichteneiche', 'mimg/IMG_3816-scaled.webp'],
];
// Regeln und Meldewege: Dateien je Thema (die Sprachfassung wählt die passende)
export const GOV_DOCS = {
  coc: ['ZVEI-VDMA-Code-of-Conduct-RITZ-DE.pdf', 'ZVEI-VDMA-Code-of-Conduct-RITZ-EN.pdf'],
  supplier: ['Verhaltenskodex_Lieferanten_30_7_2025-1.pdf', 'Supplier-Code-of-Conduct-.pdf'],
  drc: ['DRC_conflict_free-purchasing_policy.pdf'],
  aeo: ['Zertifizierungsurkunde-RITZ-AEO-F-.pdf'],
  wb: ['DE-Hinweisgebersystem.pdf', 'EN-Hinweisgebersystem.pdf'],
};
// Meldeformular der externen Ombudsperson (laut Dokument „Hinweisgebersystem“, deutsche und englische Fassung)
export const WB_FORM = { de: 'https://www.ombudsperson-frankfurt.de/de/kontaktformular/?company=RITZ_INSTRUMENT_TRANSFORMERS_GMBH', en: 'https://www.ombudsperson-frankfurt.de/en/contactform/?company=RITZ_INSTRUMENT_TRANSFORMERS_GMBH' };
// Nachweise: Bereich, Dateien, Stand (valid = gültig bis, since = seit, date = Stand)
export const RESP_EVIDENCE = [
  ['env', [CERT_FILES.UM15], { valid: '2029-08-14' }],
  ['env', [CERT_FILES.EMSt21], { valid: '2029-09-15' }],
  ['env', [CO2_CUT.doc], { date: '2025-07-03' }],
  ['env', [LED_PROJECT.doc], {}],
  ['soc', [FOUNDATION.doc], { date: '2025-06-26' }],
  ['gov', GOV_DOCS.coc, { date: '2022-01-01' }],
  ['gov', GOV_DOCS.supplier, { date: '2025-07-30' }],
  ['gov', GOV_DOCS.drc, { date: '2024-03-06' }],
  ['gov', GOV_DOCS.aeo, { since: '2015-09-24' }],
  ['gov', GOV_DOCS.wb, {}],
];

export const FEATURED_DOCS = ['RITZ-Mittelspannungswandler_Standard_GER_2014_01-2-1.pdf', 'RITZ-Metallgekapselte_Messwandler_GER_2013-02-1.pdf', 'N7-2002-111.pdf',
  'DE-Kundenkatalog-Sensoren_2024_V3.pdf', 'RITZ_SIS_Broschuere_DE-1.pdf', 'Allgemeine-Lieferbedingungen-GL2018.pdf', 'AEB_Ritz_final_dtsch_Apr2023.pdf',
  '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-QM15.pdf'];
export const FEATURED_DOCS_EN = ['RITZ-medium_voltage_instrument_transformers_standard_ENG_2014_01-2.pdf', 'RITZ-Metal_Clad_Instrument_Transformers_ENG_2013-02-1.pdf',
  'N7-2002-111-3.pdf', 'EN_SENSORS_CUSTOMER_2024.pdf', 'RITZ_SIS_Brochure_EN-3.pdf', 'Delivery_conditions_GL2018_EN.pdf', 'AEB_Ritz_final_engl_Apr2023.pdf',
  '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-QM15.pdf'];

// Beiträge auf der Weltkarte der Startseite – übernommen aus der Karte der bisherigen Startseite (Unlimited Elements,
// Stand 22.10.2026): Beitrag (News-Kennung), Kategorie wie dort (Einsatzgebiet, Neuigkeiten, Neue Produkte, Case Studies)
// und die dort eingetragene Lage. Liegt ein Beitrag auf einem eigenen Standort, steht er in dessen Karte.
export const MAP_STORIES = [
  { news: 'uebersicht-hvdc-und-anwendungen', cat: 'field', lat: 59.3251172, lng: 18.0710935 },
  { news: 'konstruktion-neues-hochspannungswerk', cat: 'news', lat: 33.1013, lng: -81.9908 },
  { news: 'neue-produkte-gbmw-gbmei', cat: 'product', lat: 43.2961743, lng: 5.3699525 },
  { news: 'zusatzbuerde', cat: 'case', lat: 48.2043985, lng: 15.6229118 },
  { news: 'kombiwandler-platzersparnis', cat: 'case', lat: 49.630668, lng: 8.3567606 },
  { news: 'emvi-produktneuheit', cat: 'product', lat: 55.6052931, lng: 13.0001566 },
  { news: 'giessharzanwendungen-in-der-elektrotechnik-und-mehr', cat: 'field', lat: 51.178264216329964, lng: 13.845022732157767 },
  { news: 'irbt-generatorwandler-mit-optimiertem-design', cat: 'product', lat: 19.054999, lng: 72.8692035 },
  { news: 'auszeichnung-zum-lieferanten-des-jahres-bei-den-hitachi-supplier-days-2024', cat: 'case', lat: 60.1453848, lng: 15.1722065 },
  { news: 'kundenreferenz-sis-projekt-bsw', cat: 'case', lat: 48.59408950805664, lng: 7.822681903839111 },
];

// Titelkarten der Beiträge ohne Foto (src/views/newscover.js): Schlagwort (kw, Zeilen mit \n), Unterzeile je Sprache,
// Motiv (ring: Ringkernwandler als Maßzeichnung, block: metallgekapselter Blockwandler, dc: Stromrichter-Schaltzeichen, doc: Schreiben mit Siegel,
// cal: Kalenderblatt mit dem Datum, map: Punktkarte mit Ort at = [Breite, Länge]).
export const NEWS_COVERS = {
  'kundenmitteilung-zu-aktuellen-entwicklungen-im-aussenwirtschaftsbereich-sowie-zur-eu-verordnung-eu-2026-2133': {
    kw: '(EU)\n2026/2133', motif: 'doc',
    sub: { de: 'Kundenmitteilung', en: 'Customer letter', fr: 'Lettre aux clients', hu: 'Ügyféltájékoztató', es: 'Carta a los clientes' },
  },
  'ritz-auf-der-gritec-energy-conference': { kw: 'GRITEC', sub: 'Energy Conference', motif: 'cal' },
  'uebersicht-hvdc-und-anwendungen': {
    kw: 'HVDC', motif: 'dc',
    sub: { de: 'Hochspannungs-Gleichstrom-Übertragung', en: 'High-voltage direct current', fr: 'Courant continu à haute tension', hu: 'Nagyfeszültségű egyenáramú átvitel', es: 'Corriente continua en alta tensión' },
  },
  'konstruktion-neues-hochspannungswerk': { kw: 'Waynesboro', sub: 'Georgia, USA', motif: 'map', at: [33.0896, -82.0157] },
  'neue-produkte-gbmw-gbmei': {
    kw: 'GBMW\nGBMEI', motif: 'block',
    sub: { de: 'Neue Produkte', en: 'New products', fr: 'Nouveaux produits', hu: 'Új termékek', es: 'Nuevos productos' },
  },
};

// Karriereseite: Foto im Kopf (Teamchallenge Dresden, Bildunterschrift verlinkt den Beitrag) und Einblicke aus den News
// (Beitrag, Bild – erstes Element groß). Nur echte Fotos aus den Beiträgen, keine Stockbilder.
export const CAREER_HERO = { img: 'mimg/IMG_20230607_060125_233.webp', news: 'teamchallenge-in-dresden' };
export const CAREER_NEWS = [
  ['personalmesse-karrierestart-dresden', 'mimg/IMG-20240119-WA0003.webp'],
  ['teamchallenge-in-dresden', 'mimg/IMG_20230607_060435_853.webp'],
  ['ritz-familienfest', 'mimg/20230624_160153.webp'],
  ['ritz-oeffnet-tueren-fuer-kleine-entdecker-kita-kinder-blicken-hinter-die-kulissen-der-technik', 'mimg/RITZ_Kita_Kinder_Besuch_im_Werk.webp'],
  ['ritz-mitarbeiterin-zur-besten-auszubildenden-ihres-lehrgangs-ausgezeichnet-worden', 'mimg/Foto_Ehrung_IHK_Petersen-768x510-1.webp'],
];

export const LOC_IMG = {
  hamburg: 'mimg/2022__07__unternehmen_historie_1.webp', kirchaich: 'mimg/Luftbild_Kirchaich_2014_klein.webp', dresden: 'mimg/image5.webp',
  wirges: 'mimg/image4.webp', kecskemet: 'mimg/image14.webp', shanghai: 'mimg/image12.webp', lavonia: 'mimg/image13.webp', waynesboro: 'mimg/image17.webp',
};
