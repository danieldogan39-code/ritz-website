// Routen: Seiten-IDs ↔ sprachspezifische Pfade (isomorph: Build + Client)
export const LANGS = ['de', 'en', 'fr', 'hu', 'es'];
export const LANG_NAMES = { de: 'Deutsch', en: 'English', fr: 'Français', hu: 'Magyar', es: 'Español' };
export const LOCALES = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', hu: 'hu-HU', es: 'es-ES' };
// Sprachen mit vollständigen Produktdaten (Produktfinder hatte nur DE/EN)
export const DATA_LANGS = ['de', 'en'];
export const dataLang = (lang) => (DATA_LANGS.includes(lang) ? lang : 'en');

export const SEG = {
  products: { de: 'produkte', en: 'products', fr: 'produits', hu: 'termekek', es: 'productos' },
  finder: { de: 'produktfinder', en: 'product-finder', fr: 'recherche-produits', hu: 'termekkereso', es: 'buscador-productos' },
  compare: { de: 'vergleich', en: 'compare', fr: 'comparer', hu: 'osszehasonlitas', es: 'comparar' },
  inquiry: { de: 'anfrage', en: 'inquiry', fr: 'demande', hu: 'ajanlatkeres', es: 'solicitud' },
  sectors: { de: 'anwendungen', en: 'applications', fr: 'applications', hu: 'alkalmazasok', es: 'aplicaciones' },
  company: { de: 'unternehmen', en: 'company', fr: 'entreprise', hu: 'vallalat', es: 'empresa' },
  locations: { de: 'standorte', en: 'locations', fr: 'sites', hu: 'telephelyek', es: 'sedes' },
  quality: { de: 'qualitaet', en: 'quality', fr: 'qualite', hu: 'minoseg', es: 'calidad' },
  responsibility: { de: 'verantwortung', en: 'responsibility', fr: 'responsabilite', hu: 'felelossegvallalas', es: 'responsabilidad' },
  references: { de: 'referenzen', en: 'references', fr: 'references', hu: 'referenciak', es: 'referencias' },
  downloads: { de: 'downloads', en: 'downloads', fr: 'telechargements', hu: 'letoltesek', es: 'descargas' },
  contact: { de: 'kontakt', en: 'contact', fr: 'contact', hu: 'kapcsolat', es: 'contacto' },
  career: { de: 'karriere', en: 'careers', fr: 'carriere', hu: 'karrier', es: 'empleo' },
  training: { de: 'ausbildung', en: 'apprenticeships', fr: 'apprentissage', hu: 'szakkepzes', es: 'formacion' },
  internships: { de: 'praktika', en: 'internships', fr: 'stages', hu: 'gyakornoki-program', es: 'practicas' },
  news: { de: 'news', en: 'news', fr: 'actualites', hu: 'hirek', es: 'noticias' },
  imprint: { de: 'impressum', en: 'imprint', fr: 'mentions-legales', hu: 'impresszum', es: 'aviso-legal' },
  privacy: { de: 'datenschutz', en: 'privacy', fr: 'confidentialite', hu: 'adatvedelem', es: 'privacidad' },
  search: { de: 'suche', en: 'search', fr: 'recherche', hu: 'kereses', es: 'buscar' },
  tools: { de: 'werkzeuge', en: 'tools', fr: 'outils', hu: 'eszkozok', es: 'herramientas' },
  assistant: { de: 'spezifikations-check', en: 'specification-check', fr: 'analyse-specification', hu: 'specifikacio-ellenorzes', es: 'analisis-especificacion' },
  calculators: { de: 'wandler-rechner', en: 'calculators', fr: 'calculateurs', hu: 'kalkulatorok', es: 'calculadoras' },
};

export const AREAS = ['niederspannung', 'mittelspannung', 'hochspannung', 'elektronik-sensoren', 'stromschienen-sis', 'giessharzteile-duromer'];
export const AREA_SEG = {
  niederspannung: { de: 'niederspannung', en: 'low-voltage', fr: 'basse-tension', hu: 'kisfeszultseg', es: 'baja-tension' },
  mittelspannung: { de: 'mittelspannung', en: 'medium-voltage', fr: 'moyenne-tension', hu: 'kozepfeszultseg', es: 'media-tension' },
  hochspannung: { de: 'hochspannung', en: 'high-voltage', fr: 'haute-tension', hu: 'nagyfeszultseg', es: 'alta-tension' },
  'elektronik-sensoren': { de: 'elektronik-sensoren', en: 'electronics-sensors', fr: 'electronique-capteurs', hu: 'elektronika-erzekelok', es: 'electronica-sensores' },
  'stromschienen-sis': { de: 'stromschienen-sis', en: 'busbars-sis', fr: 'jeux-de-barres-sis', hu: 'sinrendszer-sis', es: 'barras-sis' },
  'giessharzteile-duromer': { de: 'giessharzteile-duromer', en: 'cast-resin-duromer', fr: 'resine-coulee-duromer', hu: 'ontogyanta-duromer', es: 'resina-colada-duromer' },
};

export const SECTORS = ['netze', 'schaltanlagenbau', 'industrie', 'bahn', 'erneuerbare', 'kraftwerke', 'messtechnik'];
export const SECTOR_SEG = {
  netze: { de: 'energieversorgung-netze', en: 'utilities-grids', fr: 'reseaux-energie', hu: 'energiaellatas-halozatok', es: 'redes-energia' },
  schaltanlagenbau: { de: 'schaltanlagenbau', en: 'switchgear-manufacturers', fr: 'fabricants-appareillage', hu: 'kapcsoloberendezes-gyartok', es: 'fabricantes-aparamenta' },
  industrie: { de: 'industrie-infrastruktur', en: 'industry-infrastructure', fr: 'industrie-infrastructure', hu: 'ipar-infrastruktura', es: 'industria-infraestructura' },
  bahn: { de: 'bahntechnik', en: 'railway', fr: 'ferroviaire', hu: 'vasuti-technika', es: 'ferroviario' },
  erneuerbare: { de: 'erneuerbare-hgue-power-quality', en: 'renewables-hvdc-power-quality', fr: 'renouvelables-ccht-qualite-reseau', hu: 'megujulok-hvdc-halozatminoseg', es: 'renovables-hvdc-calidad-energia' },
  kraftwerke: { de: 'kraftwerke-generatoren', en: 'power-plants-generators', fr: 'centrales-generateurs', hu: 'eromuvek-generatorok', es: 'centrales-generadores' },
  messtechnik: { de: 'mess-pruef-zaehlertechnik', en: 'metering-testing', fr: 'comptage-essais', hu: 'meres-vizsgalat', es: 'medicion-ensayos' },
};

// Seiten-ID → Pfadsegmente
export function pathFor(lang, id, p = {}) {
  const s = (k) => SEG[k][lang];
  switch (id) {
    case 'home': return '';
    case 'products': return s('products');
    case 'area': return `${s('products')}/${AREA_SEG[p.area][lang]}`;
    case 'product': return `${s('products')}/${AREA_SEG[p.area][lang]}/${p.slug}`;
    case 'finder': return s('finder');
    case 'compare': return s('compare');
    case 'inquiry': return s('inquiry');
    case 'sectors': return s('sectors');
    case 'sector': return `${s('sectors')}/${SECTOR_SEG[p.sector][lang]}`;
    case 'company': return s('company');
    case 'locations': return `${s('company')}/${s('locations')}`;
    case 'quality': return `${s('company')}/${s('quality')}`;
    case 'responsibility': return `${s('company')}/${s('responsibility')}`;
    case 'references': return `${s('company')}/${s('references')}`;
    case 'downloads': return s('downloads');
    case 'contact': return s('contact');
    case 'career': return s('career');
    case 'training': return `${s('career')}/${s('training')}`;
    case 'internships': return `${s('career')}/${s('internships')}`;
    case 'news': return s('news');
    case 'article': return `${s('news')}/${p.slug}`;
    case 'imprint': return s('imprint');
    case 'privacy': return s('privacy');
    case 'search': return s('search');
    case 'tools': return s('tools');
    case 'assistant': return `${s('tools')}/${s('assistant')}`;
    case 'calculators': return `${s('tools')}/${s('calculators')}`;
    case '404': return '404';
    default: throw new Error('unknown page ' + id);
  }
}

// Pfad (ohne Sprache) → { id, params } ; benötigt Produkt- und News-Slugs nicht (werden nach dem Matching geprüft)
export function matchPath(lang, path) {
  const parts = path.split('/').filter(Boolean);
  const eq = (k, v) => SEG[k][lang] === v;
  if (!parts.length) return { id: 'home', p: {} };
  const [a, b, c] = parts;
  if (eq('products', a)) {
    if (!b) return { id: 'products', p: {} };
    const area = Object.keys(AREA_SEG).find((k) => AREA_SEG[k][lang] === b);
    if (!area) return null;
    if (!c) return { id: 'area', p: { area } };
    return { id: 'product', p: { area, slug: c } };
  }
  if (eq('sectors', a)) {
    if (!b) return { id: 'sectors', p: {} };
    const sector = Object.keys(SECTOR_SEG).find((k) => SECTOR_SEG[k][lang] === b);
    return sector ? { id: 'sector', p: { sector } } : null;
  }
  if (eq('company', a)) {
    if (!b) return { id: 'company', p: {} };
    for (const k of ['locations', 'quality', 'responsibility', 'references']) if (eq(k, b)) return { id: k, p: {} };
    return null;
  }
  if (eq('career', a)) {
    if (!b) return { id: 'career', p: {} };
    if (eq('training', b)) return { id: 'training', p: {} };
    if (eq('internships', b)) return { id: 'internships', p: {} };
    return null;
  }
  if (eq('tools', a)) {
    if (!b) return { id: 'tools', p: {} };
    for (const k of ['assistant', 'calculators']) if (eq(k, b)) return { id: k, p: {} };
    return null;
  }
  if (eq('news', a)) return b ? { id: 'article', p: { slug: b } } : { id: 'news', p: {} };
  for (const k of ['finder', 'compare', 'inquiry', 'downloads', 'contact', 'imprint', 'privacy', 'search']) if (eq(k, a)) return { id: k, p: {} };
  return null;
}
