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
  responsibility: 'mimg/wind-energy-sq.webp', references: 'mimg/JKI0984-2-2048x1366.webp', career: 'mimg/stellenangebote_intro_slider_4_International.webp',
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

export const RESP_DOCS = ['DE-Hinweisgebersystem.pdf', 'EN-Hinweisgebersystem.pdf', 'RITZ_Praesentation_UKE_2025-1.pdf', 'RITZ-CO2-Reduktion-in-den-Werken-1.pdf',
  'Verhaltenskodex_Lieferanten_30_7_2025-1.pdf', 'Supplier-Code-of-Conduct-.pdf', 'ZVEI-VDMA-Code-of-Conduct-RITZ-DE.pdf', 'ZVEI-VDMA-Code-of-Conduct-RITZ-EN.pdf',
  'Foerderung-des-Projektes-zum-Austausch-der-Beleuchtung-an-dem-Standort-Ottendorf-Okrilla.docx', 'DRC_conflict_free-purchasing_policy.pdf'];

export const FEATURED_DOCS = ['RITZ-Mittelspannungswandler_Standard_GER_2014_01-2-1.pdf', 'RITZ-Metallgekapselte_Messwandler_GER_2013-02-1.pdf', 'N7-2002-111.pdf',
  'DE-Kundenkatalog-Sensoren_2024_V3.pdf', 'RITZ_SIS_Broschuere_DE-1.pdf', 'Allgemeine-Lieferbedingungen-GL2018.pdf', 'AEB_Ritz_final_dtsch_Apr2023.pdf',
  '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-QM15.pdf'];
export const FEATURED_DOCS_EN = ['RITZ-medium_voltage_instrument_transformers_standard_ENG_2014_01-2.pdf', 'RITZ-Metal_Clad_Instrument_Transformers_ENG_2013-02-1.pdf',
  'N7-2002-111-3.pdf', 'EN_SENSORS_CUSTOMER_2024.pdf', 'RITZ_SIS_Brochure_EN-3.pdf', 'Delivery_conditions_GL2018_EN.pdf', 'AEB_Ritz_final_engl_Apr2023.pdf',
  '000632-Ritz-Instrument-Transformers-GmbH-CERTIFICATE-deutsch-2026-07-17-QM15.pdf'];

export const LOC_IMG = {
  hamburg: 'mimg/2022__07__unternehmen_historie_1.webp', kirchaich: 'mimg/Luftbild_Kirchaich_2014_klein.webp', dresden: 'mimg/image5.webp',
  wirges: 'mimg/image4.webp', kecskemet: 'mimg/image14.webp', shanghai: 'mimg/image12.webp', lavonia: 'mimg/image13.webp', waynesboro: 'mimg/image17.webp',
};
