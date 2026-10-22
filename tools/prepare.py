#!/usr/bin/env python3
"""
RITZ Relaunch – Datenaufbereitung.
Liest die abgegriffenen Rohdaten (raw/*, site/src/data/*_raw.json) und erzeugt
bereinigte, build-fertige JSON-Dateien in site/src/data/build/.

Ausgaben:
  products.json   alle Produkte (Produktfinder + Katalogfamilien ohne Konfigurator)
  docs.json       alle Dokumente (Produktanhänge + PDFs der Hauptseite) mit Kategorie
  news.json       News, nach Übersetzungen gruppiert, Altlasten entfernt
  jobs.json       offene Stellen (Personio)
  images.json     Bildregister (Quelle → Datei, Maße)
  oldurls.json    Inventar alter URLs mit semantischem Ziel (für 301-Weiterleitungen)
  audit.json      maschinell gefundene Datenfehler (fürs Audit-Dokument)
"""
import json, re, html, os, collections, unicodedata
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
RAW = f'{ROOT}/raw'
OUT = f'{ROOT}/site/src/data/build'
os.makedirs(OUT, exist_ok=True)

AUDIT = collections.defaultdict(list)


def audit(kind, msg, **kw):
    AUDIT[kind].append(dict(msg=msg, **kw))


def slugify(s):
    s = s.replace('ß', 'ss').replace('…', '-').replace('/', '-').replace('|', '-')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return re.sub(r'-{2,}', '-', s)


# --------------------------------------------------------------------------------------
# Bilder
# --------------------------------------------------------------------------------------
IMG_DIRS = ['mimg', 'pimg']
IMG = {}          # key -> meta (file, w, h, dir)
IMG_BY_URL = {}   # normalized url -> key


def norm_url(u):
    u = unquote(u.split('?')[0])
    u = re.sub(r'^https?://(www\.)?', '', u)
    return u


for d in IMG_DIRS:
    p = f'{RAW}/img/{d}/_index.json'
    if not os.path.exists(p):
        continue
    for k, v in json.load(open(p)).items():
        key = f'{d}/{v["file"]}'
        IMG[key] = dict(file=v['file'], dir=d, w=v['w'], h=v['h'], src=v['url'])
        IMG_BY_URL[norm_url(v['url'])] = key
        # Größenvarianten (-300x200) auf das Original zeigen lassen, falls Original fehlt
        base = re.sub(r'-\d+x\d+(?=\.\w+$)', '', norm_url(v['url']))
        IMG_BY_URL.setdefault(base, key)


def img_for_url(u):
    if not u:
        return None
    n = norm_url(u)
    if n in IMG_BY_URL:
        return IMG_BY_URL[n]
    base = re.sub(r'-\d+x\d+(?=\.\w+$)', '', n)
    if base in IMG_BY_URL:
        return IMG_BY_URL[base]
    # scaled-Variante
    base2 = base.replace('-scaled.', '.')
    for k, v in IMG_BY_URL.items():
        if k.replace('-scaled.', '.') == base2:
            return v
    return None


def img_by_sub(sub):
    for k, v in IMG.items():
        if sub in v['src']:
            return k
    raise KeyError(sub)


# --------------------------------------------------------------------------------------
# Produkte
# --------------------------------------------------------------------------------------
RAWP = json.load(open(f'{ROOT}/site/src/data/products_raw.json'))

TYPO_EN = [
    ('Oudoor', 'Outdoor'), ('Suport', 'Support'), ('Acuracy', 'Accuracy'), ('Low voltag.', 'low voltage,'),
    ('conventionell', 'conventional'), ('Insruction', 'Instruction'), ('discription', 'description'),
    ('Insolation', 'Insulation'), ('Overlaod', 'Overload'), ('Disign', 'Design'), ('Reconectable', 'Reconnectable'),
    ('Matal Clad', 'Metal-Clad'), ('Bock Type', 'Block Type'), ('Transfomer', 'Transformer'), ('Tranformer', 'Transformer'),
    ('Curent', 'Current'), ('Volatge', 'Voltage'), ('Voltge', 'Voltage'), ('Freiluftz', 'Outdoor'),
]
TYPO_DE = [
    ('Inneraum', 'Innenraum'), ('Duchrchführung', 'Durchführung'), ('Freiluftz-', 'Freiluft-'), ('Klemmenkätsen', 'Klemmenkästen'),
    ('conventionell', 'konventionell'), ('Erbebensicherheit', 'Erdbebensicherheit'), ('Spannungwandler', 'Spannungswandler'),
]


from options_i18n import harmonize  # noqa: E402

OPT_JUNK = re.compile(r"\s*\$\(\s*'options_.*$", re.S)


def clean_opt(s):
    """Optionstexte aus dem Shop: mitgelesenes Inline-Skript entfernen, Leerraum normalisieren."""
    if not isinstance(s, str):
        return s
    s = OPT_JUNK.sub('', s)
    s = re.sub(r'\bWindig\b', 'Winding', s)
    return re.sub(r'\s+', ' ', s).strip()


SQRT3 = re.compile(r'(\d)\s*/\s*V3\b')


def sqrt3(s):
    """Altes Ersatzzeichen „/V3“ der Shopdaten → „/√3“."""
    return SQRT3.sub(r'\1/√3', s) if isinstance(s, str) else s


TYPO_EN += [
    ('(VA) )', '(VA)'), ('Leve (', 'Level ('), ('Levelplease', 'Level please'), ('IIndoor', 'Indoor'), ('doublr', 'double'),
    ('inidicate', 'indicate'), ('Frequenzcy', 'Frequency'), ('Frequenvy', 'Frequency'), ('FrequenCy', 'Frequency'),
    ('Corec1', 'Core 1'), ('Weeka', 'Weeks'), ('termial', 'terminal'), ('cabel', 'cable'),
    ('Straigtforward', 'Straightforward'), ('Dameter', 'Diameter'), ('Withd', 'Width'), ('meassuring', 'measuring'), ('P rimary', 'Primary'),
    ('a pprox', 'approx'), ('Voltage Faktor', 'Voltage Factor'), ('Gewicht: ca.', 'Weight: approx.'), (' Kabel ', ' cable '),
    (' variabel ', ' variable '), ('cos(ß)', 'cos(φ)'), ('Weight in kgs', 'Weight in kg'),
    ('Frequeny', 'Frequency'), ('Frequencyz', 'Frequency'), ('Secundary', 'Secondary'), ('Windigs', 'Windings'), ('Nmber', 'Number'),
    ('Votage', 'Voltage'), ('Meassurment', 'Measurement'), ('Meassurement', 'Measurement'), ('Maessurement', 'Measurement'),
    ('Intermediat Conformity', 'Intermediate Conformity'), ('witout', 'without'), ('whithout', 'without'), ('worksk', 'works'),
    ('Ratin Plate', 'Rating Plate'), ('(V) (V)', '(V)'), ('Uncontinuously', 'Un continuously'), ('Größe W/H/D', 'Size W/H/D'), (' für ', ' for '),
    ('power upplies', 'power supplies'), ('longterm', 'long-term'), ('switchabler', 'switchable'), ('Suppot', 'Support'),
    ('Aperture: 102x22m; invl. Terminal cover', 'Aperture: 102 × 22 mm; incl. terminal cover'), ('invl.', 'incl.'), ('measurment', 'measurement'),
    ('leekage', 'leakage'), (' wich ', ' which '), ('Tansformer', 'Transformer'), ('positionn', 'position'), ('T ransformers', 'Transformers'),
    ('Poliester', 'Polyester'), ('Inndoor', 'Indoor'), ('FrequenCY', 'Frequency'), ('Cabel', 'Cable'),
    ('transformer for also for earth fault detection for', 'transformer, also for earth fault detection, for'), ('for also for', 'also for'),
]
TYPO_DE += [
    ('Genauigkeitskalsse', 'Genauigkeitsklasse'), ('Genauigkeitskasse', 'Genauigkeitsklasse'), ('Primärstöme', 'Primärströme'), ('Kurtzzeitstrom', 'Kurzzeitstrom'), ('cos(ß)', 'cos(φ)'),
    ('f ür für', 'für'), ('f ür', 'für'), ('Primärwick lung', 'Primärwicklung'), ('isolierkörper', 'Isolierkörper'),
]
TYPO_DE += [
    # alte Schreibung aus den Shoptexten (ß nach kurzem Vokal)
    ('schluß', 'schluss'), ('Schluß', 'Schluss'), ('guß', 'guss'), ('Guß', 'Guss'), ('Meß', 'Mess'), ('meß', 'mess'),
    ('muß ', 'muss '), ('daß', 'dass'), ('läßt', 'lässt'),
]
# Wortgenaue Korrekturen (regulärer Ausdruck)
RX_EN = [
    (re.compile(r'(\d)\s*kgs\b'), r'\1 kg'), (re.compile(r'\bDesig\b'), 'Design'), (re.compile(r'\bAccuracy Classe\b'), 'Accuracy Class'),
    (re.compile(r'\bFrequen\b'), 'Frequency'), (re.compile(r'\bOvercurren\b'), 'Overcurrent'), (re.compile(r'\bLeve\b'), 'Level'),
    (re.compile(r'\bVoltag\b'), 'Voltage'), (re.compile(r'\bcasted\b'), 'cast'), (re.compile(r'\blease (specify|indicate)'), r'please \1'), (re.compile(r'\bTyp\b'), 'Type'),
    (re.compile(r'\b(converter|transducer) passage\b'), 'transformer aperture'),
    (re.compile(r'\b(converter|transducer)s\b'), 'transformers'),
    (re.compile(r'\b(converter|transducer)\b'), 'transformer'),
    (re.compile(r'\boder\b'), 'or'), (re.compile(r'\bSizee\b'), 'Size'),
]
RX_DE = [(re.compile(r'\bincl\.'), 'inkl.')]
RX_BOTH = [
    (re.compile(r'(?<=\d)(mm|kg|kV|kA|Hz)\b'), r' \1'),  # „92mm“ → „92 mm“ (nicht „A“: Typcodes wie eA10A)
    (re.compile(r'\(\s+'), '('), (re.compile(r'\s+\)'), ')'),
    (re.compile(r'Innen\s*-\s*Ø\s*'), 'Innen-Ø '), (re.compile(r'\b(Inner|Inside)\s*-\s*Ø\s*'), r'\1 Ø '),
    (re.compile(r'(?<=\w)\s+-Ø\s*'), ' Ø '),               # „cable -Ø 5“ → „cable Ø 5“
    (re.compile(r'(\d)\s*\.\.\.\s*(\d)'), r'\1…\2'),
    (re.compile(r'(\d)\s*\.\.(?!\.)\s*(\d)'), r'\1…\2'),             # „10..45“ → „10…45“
    (re.compile(r'\s+mm\s*mm>'), ' mm'), (re.compile(r',\s*>\s*$'), ''),   # Reste aus dem Shop-HTML
    (re.compile(r'(?<=[a-z])\.\.(?=\s|$)'), '.'),
    (re.compile(r'\b(einem|for|mm|IEC|the|der|die|das|und|and)\s+\1\b'), r'\1'), (re.compile(r'Ø\s+Ø'), 'Ø'),
    (re.compile(r'\s+([,;:.])(?=\s|$)'), r'\1'),
]


def fix_typos(s, lang):
    if not s:
        return s
    for a, b in (TYPO_EN if lang == 'en' else TYPO_DE):
        s = s.replace(a, b)
    for rx, b in (RX_EN if lang == 'en' else RX_DE) + RX_BOTH:
        s = rx.sub(b, s)
    return sqrt3(s)


JOINED = {'de': re.compile(r'([a-zäöüß0-9)])\s(Der|Die|Das)\s(?=[A-ZÄÖÜ])'), 'en': re.compile(r'([a-z0-9)])\s(The)\s(?=[a-z])')}
HTML_JUNK = re.compile(r'^\W*text-align:[^>]*>\s*')
WINDOW = re.compile(r'(Fensteröffnung|window)\s*:?\s*(\d+)\s*[xX×]\s*(\d+)\s*mm', re.I)


def clean_desc(t, lang):
    """Beschreibungszeile: Satzgrenzen wiederherstellen, die beim Shop-Export verloren gingen, HTML-Reste entfernen."""
    t = HTML_JUNK.sub('', t)
    t = JOINED[lang].sub(r'\1. \2 ', t)
    t = WINDOW.sub(lambda m: f'{m.group(1)}: {m.group(2)} × {m.group(3)} mm', t)
    return t


# Redaktionelle Korrekturen einzelner Produkttexte: Sprache vertauscht, Übersetzung fehlte, Inhalte widersprüchlich.
# Grundlage ist jeweils der Text der anderen Sprache im Produktfinder; Abweichungen stehen im Audit.
NAME_FIX = {
    'KSSH 44': {'en': 'Indoor bar-type current transformer, low voltage'},
    'UGSSF 704': {'de': 'Freiluft-Kabelumbau-Stromwandler'},
    'KSER 100': {'de': 'Innenraum-Spannungswandler Niederspannung, einpolig'},
    'KSER 104': {'en': 'Indoor voltage transformer, low voltage, single pole'},
}
DESC_FIX = {
    'KSR 60 / 62': {
        'de': ['Die Wandler der Baureihe KSR 60 / KSR 62 sind Rohrstab-Stromwandler mit einer auf einen Ringkern aufgebrachten Sekundärwicklung. '
               'Das Aktivteil wird von zwei ultraschallverschweißten Gehäuse-Halbschalen aus einem Polykarbonat vollständig umschlossen. '
               'Die Wandler werden mit einem herausnehmbaren Primärleiter in Form eines Kupferrohres geliefert.',
               'mögliche Modellvarianten', 'Innen-Ø 50 mm für Bolzen M12 bis Ø 16 mm', 'Größe 1: B / H / T: 60 / 81 / 30 mm',
               'Größe 2: B / H / T: 60 / 86 / 52 mm', 'Größe 3: B / H / T: 50 / 70 / 69 mm', 'Gewicht: 0,6 kg', 'Standardzubehör:',
               '2 Fußbefestigungen,', 'transparente Klemmenabdeckung', 'Sonderzubehör:', 'verdrehbare Schnappbefestigung für Tragschiene (DIN EN 60715-TH35)',
               'Montage in beliebiger Position', 'Der Stromwandler ist wartungsfrei'],
        'en': ['The KSR 60 / KSR 62 series are tube-type current transformers with a secondary winding on a toroidal core. '
               'The active part is completely enclosed by two ultrasonically welded polycarbonate housing half-shells. '
               'The transformers are supplied with a removable primary conductor in the form of a copper tube.',
               'possible model versions:', 'Inner Ø 50 mm for bolts M12 up to Ø 16 mm', 'Size 1: W / H / L: 60 / 81 / 30 mm',
               'Size 2: W / H / L: 60 / 86 / 52 mm', 'Size 3: W / H / L: 50 / 70 / 69 mm', 'Weight: 0.6 kg', 'Standard accessories:',
               '2 mounting feet,', 'transparent terminal cover', 'Optional accessories:', 'rotatable snap-on fixing for mounting rail (DIN EN 60715-TH35)',
               'Mounting in any position', 'The current transformer is maintenance-free'],
    },
    'KSSH 44': {
        'en': ['The KSSH 44 is a bar-type current transformer with a secondary winding on a toroidal core.',
               'The active part is housed in an enclosure insulated with cast resin.',
               'A copper bar serves as the primary conductor, max. current load: Icth = 130 A',
               'The secondary connection is made via 300 mm long leads', 'Size: W / H / L: 44 / 56 / 30 mm', 'Weight: 0.3 kg', 'Application:',
               'Instrument transformer for operational purposes, e.g. for mounting on fuse switch-disconnectors',
               'Mounting in any position', 'The current transformer is maintenance-free'],
    },
    'UGSSF 704': {
        'de': ['UGSSF 704 Kabelumbau-Stromwandler für den Freilufteinsatz.', 'Standardzubehör:', 'Klemmenkasten aus Aluminium',
               'Kabelverschraubung, PA, M16x1,5 für Kabel-Ø 5…10,', 'auf Anfrage M20x1,5 für Kabel-Ø 8…13',
               'Größe 1: B / H / T: 170 / 207 / 92 mm*', 'Größe 2: B / H / T: 170 / 207 / 132 mm*', '*(inkl. Klemmenkasten)', 'Sonderzubehör:',
               'Klemmenkasten aus PETP', 'Kabelverschraubung, PA, M20x1,5 für Kabel-Ø 8…13,', 'auf Anfrage M25x1,5 für Kabel-Ø 11…17',
               'Größe 1: B / H / T: 170 / 229 / 92 mm*', 'Größe 2: B / H / T: 170 / 229 / 132 mm*', '*(inkl. Klemmenkasten)',
               '2 Fußbefestigungen', '2 Kabelbefestigungen', '1 Wandhalterung', 'Gewicht: variiert', 'Montage in beliebiger Position',
               'Der Stromwandler ist wartungsfrei'],
    },
    'KSER 104': {
        'en': ['KSER 104 | 0.72 | 1.2 | kV low voltage indoor voltage transformer, single pole.', 'Dimensions W/H/L: 104 / 135 / 75 mm',
               'Weight: approx. 2.0 kg', 'Standard accessories:', '1 transparent terminal cover', '4 mounting feet', 'Possible special versions:',
               'different rated voltage', 'different rated frequency', 'tropical version', 'cast resin filling'],
    },
    'KSER 100': {
        'en': ['KSER 100 | 0.72 | 1.2 | kV low voltage indoor voltage transformer, single pole.', 'Dimensions W/H/L: 100 / 126 / 70 mm',
               'Weight: approx. 1.1 kg', 'Standard accessories:', '1 transparent terminal cover', '4 mounting feet', 'Possible special versions:',
               'different rated frequency', 'tropical version', 'cast resin filling'],
    },
    'KSZ 150': {
        'en': ['KSZ 150 | 0.72 | 1.2 | kV low voltage indoor voltage transformer, double-pole insulated.', 'Dimensions W/H/L:',
               'Size 1: 150 / 123 / 172 mm,', 'Size 2: 150 / 123 / 182 mm,', 'Size 3: 150 / 123 / 192 mm or', 'Size 4: 150 / 123 / 212 mm.',
               'Weight: ≤ 7, 8, 9 or 12 kg (size 1, 2, 3 or 4)', 'Standard accessories:', '2 transparent terminal covers', '4 mounting feet',
               'Possible special versions:', 'different rated voltage', 'different rated frequency', 'tropical version', 'cast resin filling'],
    },
}
GERMAN_TXT = re.compile(r'\b(und|der|die|das|mit|für|von|bis|oder|ist|beliebiger)\b|[äöüß]', re.I)
NONSTD = re.compile(r'^Non-standard accessor(?:y|ies)\s*:?')
DESC_NOTES = {
    'KSR 60 / 62': 'Englische Beschreibung war deutsch – übersetzt.',
    'KSSH 44': 'Englische Bezeichnung und Beschreibung waren deutsch – übersetzt.',
    'UGSSF 704': 'Deutsche Bezeichnung und Beschreibung waren englisch – übersetzt.',
    'KSER 104': 'Englische Beschreibung war deutsch; englische Bezeichnung nannte „Double-pole“, Beschreibung und Daten sagen einpolig – korrigiert.',
    'KSER 100': 'Englische Fassung nannte 2 Klemmenabdeckungen und eine abweichende Bemessungsspannung, die deutsche 1 Klemmenabdeckung – an die deutsche Fassung angeglichen.',
    'KSZ 150': 'Englische Beschreibung mit deutschen Wörtern und Tippfehlern („oder“, „Sizee“, „12ksg“) – bereinigt.',
}


NUMTOK = re.compile(r'^[\(\[]?[\d.,…]+(?:\s*(?:kV|V|A|kA))?[\)\]]?[,;:|]?$', re.I)


def clean_name(name, code, lang):
    """Bezeichnung ohne Typcode und Spannungsliste."""
    s = html.unescape(name or '').strip()
    s = fix_typos(s, lang)
    s = s.replace('VT (konventionell)', '').replace('VT (conventional)', '')
    # exakten Code am Anfang entfernen
    for c in sorted({code, code.replace(' / ', '/'), code.split(' ')[0]}, key=len, reverse=True):
        if c and s.startswith(c):
            s = s[len(c):].strip()
            break
    toks = s.split()
    i = 0
    while i < len(toks):
        t = toks[i]
        if t in ('|', '/', '...', '…', '-', '–', 'kV', 'kV)', ',', '(', ')'):
            i += 1; continue
        if NUMTOK.match(t) or re.match(r'^[\d.,…]+\.\.\.[\d.,]+$', t) or re.match(r'^\(?\d[\d.,]*\s*-$', t):
            i += 1; continue
        if re.match(r'^[A-Z0-9][A-Z0-9()\-/.,…|]*$', t) and not re.match(r'^(DIN|IEC|EN|PQ|TUR|TuR|CT|VT|AC|DC)$', t) and i < 3:
            i += 1; continue
        if re.match(r'^\(?\d[\d.,]*\s*-\s*[\d.,]+\s*kV\)?$', t, re.I):
            i += 1; continue
        break
    s = ' '.join(toks[i:]).strip(' |,-–')
    s = re.sub(r'^\(?\s*\d[\d.,]*\s*[-–]\s*[\d.,]+\s*kV\)?\s*', '', s)
    s = re.sub(r'\s{2,}', ' ', s)
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    return s


def dedupe_sentences(text):
    out, seen = [], set()
    for sent in re.split(r'(?<=[.!?])\s+', text.strip()):
        k = re.sub(r'\W+', '', sent.lower())
        if k and k in seen:
            continue
        seen.add(k)
        out.append(sent)
    return ' '.join(out)


TAG_RE = re.compile(r'<[^>]+>')


def html_to_paras(s):
    if not s:
        return []
    s = s.replace('\r', '')
    s = re.sub(r'<\s*br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'</\s*(p|div|li|h\d)\s*>', '\n', s, flags=re.I)
    s = TAG_RE.sub(' ', s)
    s = html.unescape(s).replace('\xa0', ' ')
    paras = []
    for line in s.split('\n'):
        line = re.sub(r'\s+', ' ', line).strip()
        if line:
            paras.append(line)
    return paras


ATTR_MAP = {
    # de-label: key
    'Herstellungsort': None, 'Konformitätserkl./Beglaubigungsfähig': 'verifiable', 'Umgebungstemperatur -5°C … +40°C': 'temp_m5_40',
    'Innenraum': 'indoor', 'Einphasig': 'single_phase', 'NS Mess-Wandler': 'lv_metering', 'Einbaulage': None,
    'Einbaulage beliebig': 'mount_any', 'Isolierstoffklasse E (120°C)': 'class_e', 'Freiluft': 'outdoor', 'Gießharzisolierung': 'cast_resin_ins',
    'MS Mess-Wandler': 'mv_metering', 'NS Schutz-Wandler': 'lv_protection', 'Umgebungstemperatur -25...+40°C': 'temp_m25_40',
    'sekundär angezapft': 'secondary_tap', 'Erdschlußerfassung': 'earth_fault', 'MS-Schutz-Wandler': 'mv_protection',
    'Belastbarkeit/Überbelastbarkeit ext. 120%': 'overload_120', 'Bauform': None, 'Gießharz': 'cast_resin', 'Erdungsanschluß': 'ground_clamp',
    'zweipolig isoliert': 'double_pole', 'tropentauglich': 'tropical', 'Made in Austria': None, 'primär umschaltbar': 'primary_reconnectable',
    'PQ-Messung': 'pq', 'kap. Abgriff / CK-Klemme /kap. Teiler': 'cap_tap', 'Einbaulage stehend': 'mount_upright', 'Mehrkernausführung': 'multi_core',
    'silikonfrei': 'silicone_free', 'für Luft-isolierte SA': 'ais', 'Made in Germany': None, 'berührungssicher': 'touch_proof', 'metallgekapselt': 'metal_clad',
    'Diff-Abgleich': 'diff', 'für Einsatz am Generator': 'generator', 'rolling stock': 'rolling_stock', 'Große Bauform': 'large', 'TUR -Bauform': 'tur',
    'rüttelfest': 'vibration_proof', 'mit 2 Klemmenkätsen/Anschlusskasten': 'two_boxes', 'Einkernausführung': 'single_core', 'für Gas-isolierte SA': 'gis',
    'Kleine Bauform': 'small', 'Blockwandler/Stützerstromwandler': 'block_support', 'Schmale Bauform': 'narrow', 'Basic-Line': 'basic_line',
    'Bauartzulassung': 'type_approval', 'exgeschützt': 'ex', 'im Bergwerkseinsatz': 'mining', 'Umgebungstemperatur -5°C...+50°C': 'temp_m5_50',
    'Isolierstoffklasse F (160°C)': 'class_f', 'Umgebungstemperatur -5...+70°C': 'temp_m5_70', 'Kopfbauform': 'head',
}
MOUNT_MAP = {'beliebig': 'any', 'stehend': 'upright', 'stehend oder liegend': 'upright_or_lying'}

EN_OVERRIDES = {
    # EN-Bezeichnung passt nicht zum Typ → aus DE übernommen/korrigiert
    'MKSOH-S 1082': '3-phase current sensor, indoor',
}

FAMILY_IMG = {
    'ASS': '2022/07/produkte_stromwandler_ASS_12_1_7_5_24_36_stuetzerstromwandler.jpg',
    'GSW 3,6 / 12/0': '2022/07/produkte_stromwandler_GSW_12_0_3_6_7_2_12_Stuetzerstromwandler.jpg',
    'ASN': 'innenraumanwendung_stromwandler_asn_12_17_5_24_36',
    'GI 52 / 72,5': 'innenraumanwendung_stromwandler_gi_52_72_5',
    'VES': 'innenraumanwendung_spannungswandler_ves_12_17_5_24',
    'GSE 12/0': 'innenraumanwendung_spannungswandler_gse_12_0_3_6_7_2_12',
    'VEN': 'innenraumanwendung_spannungswandler_ven_12_17_5_24_36_52_72_5',
    'VZS': 'VZS-12_175_24-Spannungswandler-Zweipolig',
    'GSZ 12/0': 'innenraumanwendung_spannungswandler_gsz_12_0_3_6_7_2_12',
    'VZN': 'innenraumanwendung_spannungswandler_vzn_12_17_5_24_36',
    'GIFK': 'freiluftanwendung_stromwandler_gifk_12_17_5_24_36',
    'GIFS': 'freiluftanwendung_stromwandler_GIFS-12-17-5-24-36',
    'GIF 12…72,5': 'freiluftanwendung_stromwandler_gif_10_17_5_20_30_36_52_72_5',
    'VEF 12…36': 'freiluftanwendung_spannungswandler_ves_12_17_5_24',
    'VZF': 'freiluftanwendung_spannungswandler_ven_12_17_5_24_36_52_72_5',
    'GBW': 'beruehrungssichere_wandler_stromwandler_gbw',
    'GBEI(N) / GBEA(N)': 'beruehrungssichere_wandler_spannungswandler_gbein_gbean',
    'KGBEI / KGBEA': 'beruehrungssichere_wandler_kombiwandler_kgbei_kgbea',
    'GSEFB 15…25': 'sonderwandler_bahnwandler_gsefb',
    'GDS 10…36': 'sonderwandler_durchfuehrungsstabstromwandler_gds',
    'GSSO 12 / 17,5 / 24': 'sonderwandler_stuetzerstromwandler_gsso',
    'KGBEA / KGBEI PQ': 'kgbea_36_kgbei_36_ausgefuehrt_als_breitbandwandler',
    'GSWS 24 PQ': 'sonderwandler_stuetzerstromwandler_gsws24',
    'GSES 12D / 24D PQ': 'sonderwandler_induktiver_einpoliger_spannungswandler_gses24d',
    'IRBT': 'IRBT-1.png',
    'KSOH-S 1082': 'stromsensor_ksoh-s_1082', 'MKSOH-S 1082': 'stromsensor_mksoh-s_1384', 'UGSS-S 104': 'stromsensor_ugss-s_104',
    'RKU-S 2012': 'stromsensor_rku-s_2012', 'GBERA 12…36': 'spannungssensor_gbera_12_24_36', 'GSER 3': 'spannungssensor_gser_3',
    'MGTK 12 / 24': 'spannungssensor_mgtk_12_17_5_24', 'MGTK-V': 'spannungssensor_mgtk-v_12_17_5_24', 'GSER(F) 16': 'freiluft_gserf_16',
    'GSER(F) 52': 'freiluft_gserf_52', 'GSR 27 / 38': 'freiluft_gsr_27_38', 'ABS': 'kombisensor_abs_12_17_5_24_36',
    'EGIW x64': 'egiw_x64', 'EGIW x85': 'egiw_x85', 'EVBA x06': 'evba_x06', 'EMWI 7xx': 'emvi_7xx',
    'KS…': 'standard_ks_50-02_d', 'KSW 52': 'standard_ksw_52_d', 'KSO 311 / KSS 382': 'standard_kso_311_d',
}

# Datenblätter/Texte der Hauptseite (Produktfamilien) – nur wo eindeutig zuordenbar
U = 'https://ritz-international.com/wp-content/uploads/'
FAMILY_MAIN = {
    'ASS': ('Stützerstromwandler, Blockausführung, schmale Bauform nach DIN 42600 Teil 8; erhältlich als Gr. 1, 2, 3', 'Support-type current transformer, block design, narrow type to DIN 42600 part 8; available as size 1, 2, 3', 'TDB20260012_REV01.pdf'),
    'GSW 3,6 / 12/0': ('Stützerstromwandler, Blockausführung, kleine Bauform nach DIN 42600 Teil 4', 'Support-type current transformer, block design, small type to DIN 42600 part 4', 'De_GSW_12_03_6_Stuetzenstromwandler.pdf'),
    'ASN': ('Stützerstromwandler, Blockausführung, große Bauform nach DIN 42600 Teil 5', 'Support-type current transformer, block design, large type to DIN 42600 part 5', 'De_ASN_12_17_5_Stuetzerstromwandler.pdf'),
    'GI 52 / 72,5': ('Stützerstromwandler nach DIN 42600 Teil 1', 'Support-type current transformer to DIN 42600 part 1', 'De_GI_52-72_5_Stuetzerstromwandler.pdf'),
    'VES': ('Spannungswandler, einpolig, schmale Bauform nach DIN 42600 Teil 9', 'Voltage transformer, single-pole, narrow type to DIN 42600 part 9', 'De_VES_12_17_5_Spannungswandler.pdf'),
    'GSE 12/0': ('Spannungswandler, einpolig, kleine Bauform nach DIN 42600 Teil 7', 'Voltage transformer, single-pole, small type to DIN 42600 part 7', 'De_GSE_12_Spannungswandler.pdf'),
    'VEN': ('Spannungswandler, einpolig, große Bauform/Stützerbauform nach DIN 42600 Teil 3', 'Voltage transformer, single-pole, large/support type to DIN 42600 part 3', 'De_VEN_12_17_5_24_36_52_72_5_Spannungswandler.pdf'),
    'VZS': ('Spannungswandler, zweipolig, schmale Bauform nach DIN 42600 Teil 9', 'Voltage transformer, double-pole, narrow type to DIN 42600 part 9', 'De_VZS_12_17_5_25_Spannungswandler.pdf'),
    'GSZ 12/0': ('Spannungswandler, zweipolig, kleine Bauform nach DIN 42600 Teil 7', 'Voltage transformer, double-pole, small type to DIN 42600 part 7', 'De_GSZ_12_03_6_7_2_12_Spannungswandler.pdf'),
    'VZN': ('Spannungswandler, zweipolig, große Bauform nach DIN 42600 Teil 3', 'Voltage transformer, double-pole, large type to DIN 42600 part 3', 'De_VZN_12_17_5_24_36_Spannungswandler.pdf'),
    'GIFK': ('Freiluft-Stützerstromwandler in Kompaktbauweise', 'Outdoor support-type current transformer, compact design', 'De_GIFK_Stuetzerstromwandler.pdf'),
    'GIFS': ('Freiluft-Stützerstromwandler in Standardbauweise', 'Outdoor support-type current transformer, standard design', 'De_GIFS_Stuetzerstromwandler.pdf'),
    'GIF 12…72,5': ('Freiluft-Stromwandler in Kopfbauform, auch nach GOST erhältlich', 'Outdoor head-type current transformer, also available to GOST', 'De_GIF.pdf'),
    'GBW': ('Metallgekapselter Stromwandler, 12–36 kV, berührungssicher', 'Metal-clad current transformer, 12–36 kV, touch-proof', 'DE_GBW.pdf'),
    'GBEI(N) / GBEA(N)': ('Metallgekapselter Spannungswandler, 12–52 kV, berührungssicher', 'Metal-clad voltage transformer, 12–52 kV, touch-proof', 'DE_GBEIN_GBEAN.pdf'),
    'KGBEI / KGBEA': ('Metallgekapselter Kombiwandler, 12–36 kV', 'Metal-clad combined instrument transformer, 12–36 kV', 'DE_KGBEIKGBEA.pdf'),
    'GDS 10…36': ('Durchführungsstromwandler mit Festleiter', 'Bushing-type current transformer with fixed conductor', 'De_GDS.pdf'),
    'GSSO 12 / 17,5 / 24': ('Hochstromwandler in Stützerbauform', 'High-current transformer, support type', 'De_GSSO.pdf'),
    'KGBEA / KGBEI PQ': ('Metallgekapselter Kombiwandler, ausgeführt als Breitbandwandler für Power-Quality-Messungen', 'Metal-clad combined transformer designed as broadband transformer for power quality measurement', 'Datenblatt-KGBEA36-KGBEI36-ausgefuehrt-als-Breitbandwandler.pdf'),
    'GSWS 24 PQ': ('Stützerstromwandler mit optional erweitertem Frequenzbereich', 'Support-type current transformer with optionally extended frequency range', 'Datenblatt_GSWS24_Breitband_Index_01.pdf'),
    'GSES 12D / 24D PQ': ('Induktiver, einpoliger Spannungswandler mit optional erweitertem Frequenzbereich', 'Inductive single-pole voltage transformer with optionally extended frequency range', 'Datenblatt_GSES24D_Breitband_Index_02.pdf'),
    'ABS': ('Kombisensor in Stützer-Bauform für den Einbau in luftisolierte Schaltanlagen', 'Combined sensor, support type, for air-insulated switchgear', 'DE_T.Data-Sheet_ABS-12_17.5_24_36.pdf'),
    'EGIW x64': ('DC- und AC-Messsystem mit optischer Datenübertragung', 'DC and AC measuring system with optical data transmission', '2018-08_EGIW_x64_datasheet-1.pdf'),
    'EVBA x06': ('DC- und AC-Messsystem mit Pufferverstärker', 'DC and AC measuring system with buffer amplifier', '2018-08_EVBA_x06_datasheet.pdf'),
    'EMWI 7xx': ('DC- und AC-Messsystem nach dem Nullfluss-Prinzip', 'DC and AC measuring system based on the zero-flux principle', '2018-08_EMVI_7xx_datasheet.pdf'),
    'KSOH-S 1082': ('Passiver Kleinsignal-Stromwandler', 'Passive low-power current transformer', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'MKSOH-S 1082': ('Passiver Kleinsignal-Stromwandler, 3-phasig', 'Passive low-power current transformer, 3-phase', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'UGSS-S 104': ('Passiver Kleinsignal-Stromwandler, teilbar', 'Passive low-power current transformer, split-core', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'RKU-S 2012': ('Passiver Kleinsignal-Stromwandler, teilbar', 'Passive low-power current transformer, split-core', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'GBERA 12…36': ('Passiver Kleinsignal-Spannungswandler', 'Passive low-power voltage transformer', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'GSER 3': ('Passiver Kleinsignal-Spannungswandler', 'Passive low-power voltage transformer', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'MGTK 12 / 24': ('Passiver Kleinsignal-Spannungswandler', 'Passive low-power voltage transformer', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'MGTK-V': ('Passiver Kleinsignal-Spannungswandler', 'Passive low-power voltage transformer', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'GSER(F) 16': ('Passiver Kleinsignal-Spannungswandler für Freiluft', 'Passive low-power voltage transformer, outdoor', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'GSER(F) 52': ('Passiver Kleinsignal-Spannungswandler für Freiluft', 'Passive low-power voltage transformer, outdoor', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'GSR 27 / 38': ('Passiver Kleinsignal-Spannungswandler für Freiluft', 'Passive low-power voltage transformer, outdoor', 'DE-Kundenkatalog-Sensoren_2024_V3.pdf'),
    'KS…': (None, None, 'KS_50-02_d-1.pdf'),
    'KSW 52': (None, None, 'KSW_52_d-1.pdf'),
    'KSO 311 / KSS 382': (None, None, 'KSO_311_d-1.pdf'),
}
RAIL_TEXT_DE = ('Für den Einsatz auf elektrischen Bahnfahrzeugen. Isolation aus freiluftbeständigem cycloaliphatischem Epoxidharz; '
                'alle Freiluftteile aus korrosionsbeständigen Materialien, wartungsfrei. Konform zu EN 50463, erfüllt die Vorgaben der TSI LOC&PAS '
                'und ist damit zur Energiemessung auf dem Fahrzeug geeignet. Gefertigt in einem IRIS-zertifizierten Werk.')
RAIL_TEXT_EN = ('For use on electric rail vehicles. Insulation made of weather-resistant cycloaliphatic epoxy resin; all outdoor parts made of '
                'corrosion-resistant materials, maintenance-free. Compliant with EN 50463 and the TSI LOC&PAS requirements, and therefore suitable '
                'for on-board energy metering. Manufactured in an IRIS-certified plant.')

MADE_FROM_ATTR = {'Made in Austria': 'AT', 'Made in Germany': 'DE', 'Made in Hungary': 'HU'}


def rng(v):
    if not v:
        return None
    if isinstance(v, (int, float)):
        return [v, v]
    v = [x for x in v if x is not None]
    return [min(v), max(v)] if v else None


products = []
code_seen = collections.Counter()
for p in RAWP:
    code = p['code'].strip()
    if code == 'EMWI 7xx':
        audit('produktdaten', 'Typcode im Produktfinder lautet „EMWI 7xx“, auf der Hauptseite „EMVI 7xx“ – vereinheitlicht auf EMVI 7xx.', pid=p['pid'])
        display_code = 'EMVI 7xx'
    else:
        display_code = code
    de, en = p['i18n']['de'], p['i18n']['en']
    name_de = clean_name(de['name'], code, 'de')
    name_en = EN_OVERRIDES.get(code) or clean_name(en['name'], code, 'en')
    if re.search(r'\b(Innenraum|Freiluft|Stromwandler|Spannungswandler)\b', name_en):
        audit('produktdaten', f'Englische Bezeichnung enthält deutschen Text: „{en["name"]}“', pid=p['pid'], code=code)
    if re.search(r'\b(Indoor|Outdoor|current transformer|voltage transformer)\b', name_de, re.I):
        audit('produktdaten', f'Deutsche Bezeichnung enthält englischen Text: „{de["name"]}“', pid=p['pid'], code=code)
        name_de = ''
    if code == 'MKSOH-S 1082' and '1384' in en['name']:
        audit('produktdaten', 'MKSOH-S: Code 1082, englische Bezeichnung und Hauptseite nennen 1384.', pid=p['pid'])

    nf = NAME_FIX.get(code) or {}
    name_de, name_en = nf.get('de', name_de), nf.get('en', name_en)

    # Beschreibung
    raw = {lang: [HTML_JUNK.sub('', dedupe_sentences(x)) for x in html_to_paras(src.get('desc') or '')] for lang, src in (('de', de), ('en', en))}
    # deutsche Zeilen, die in die englische Fassung gerutscht sind (die übersetzte Fassung steht jeweils daneben)
    if raw['en'] != raw['de'] and code not in DESC_FIX:
        de_lines = set(raw['de'])
        stray = [x for x in raw['en'] if x in de_lines and GERMAN_TXT.search(x)]
        if stray:
            raw['en'] = [x for x in raw['en'] if x not in stray]
            audit('produktdaten', f'{code}: deutsche Zeile in der englischen Beschreibung entfernt („{stray[0][:60]}“).', pid=p['pid'], code=code)
    desc = {lang: [y for y in (clean_desc(fix_typos(x, lang), lang) for x in raw[lang]) if len(y) > 2] for lang in ('de', 'en')}
    # „Non-standard accessory“ war die Übersetzung sowohl für „Sonderzubehör“ als auch für „Mögliche Sonderausführungen“
    special = any(x.startswith('Mögliche Sonderausführungen') for x in desc['de']) and not any(x.startswith('Sonderzubehör') for x in desc['de'])
    desc['en'] = [NONSTD.sub('Possible special versions:' if special else 'Optional accessories:', x) for x in desc['en']]
    if code in DESC_FIX:
        desc.update(DESC_FIX[code])
        audit('produktdaten', f'{code}: {DESC_NOTES[code]}', pid=p['pid'], code=code)

    # Merkmale / Attribute
    feats, specs, made = [], {}, p.get('made')
    for k, v in de['attrs']:
        if k in MADE_FROM_ATTR or k == 'Herstellungsort':
            m = MADE_FROM_ATTR.get(v) or MADE_FROM_ATTR.get(k)
            if m and not made:
                made = m
            continue
        if k == 'Einbaulage':
            specs['mount'] = MOUNT_MAP.get(v, None)
            continue
        if k == 'Bauform':
            continue
        key = ATTR_MAP.get(k, 'x:' + k)
        if key is None:
            continue
        if v in ('Ja',):
            feats.append(key)
    feats = sorted(set(feats))

    # Optionen (Konfigurator) – Werte als [id, label]
    options = {}
    for lang, src in (('de', de), ('en', en)):
        ol = []
        for o in src.get('options') or []:
            ol.append(dict(id=o['id'], t=fix_typos(clean_opt(o['title']), lang), type=o['type'], req=bool(o['required']),
                           v=[[str(a), fix_typos(clean_opt(b), lang)] for a, b in o.get('values') or []]))
        options[lang] = ol
    harmonize(options, audit, display_code, p['pid'])
    # Abhängigkeiten kompakt
    d = p.get('deps') or {}
    deps = None
    if d:
        def o(x):
            return (d.get(x) or {}).get('o') or {}
        deps = dict(
            order=[x['id'] for x in d.get('sortedOIds') or []],
            req=sorted(int(k) for k in o('isRequired')),
            free={k: v for k, v in o('notDepVIdsByOId').items()},
            showO={k: (v.get('o') if isinstance(v, dict) else v) for k, v in o('cOIdsByVId').items()},
            showV={k: (v.get('o') if isinstance(v, dict) else v) for k, v in (o('cVIdsByVId') if isinstance(o('cVIdsByVId'), dict) else {}).items()},
            childO={k: (v.get('o') if isinstance(v, dict) else v) for k, v in o('cOIdsByOId').items()},
        )

    # Bilder
    imgs = []
    for im in p.get('images') or []:
        k = img_for_url(im['src'])
        if k and k not in imgs:
            imgs.append(k)
    fam_img = FAMILY_IMG.get(code)
    if fam_img:
        try:
            fk = img_by_sub(fam_img)
            if fk not in imgs:
                imgs.append(fk)  # Familienbild als Ergänzung/Fallback
        except KeyError:
            audit('build', f'Familienbild nicht gefunden: {fam_img}')

    fam = FAMILY_MAIN.get(code)
    family = None
    if fam:
        family = dict(de=fam[0], en=fam[1], datasheet=(U + fam[2]) if fam[2] else None)

    slug = slugify(display_code)
    code_seen[slug] += 1
    if code_seen[slug] > 1:
        slug = f'{slug}-{code_seen[slug]}'

    um = sorted(set(p['um'] or []))
    prod = dict(
        id=slug, pid=p['pid'], code=display_code, area=p['area'], kind=p['kind'], install=p['install'], form=p['form'], apps=p['apps'],
        um=um, ipr=rng(p['ipr']), isr=sorted(set(p['isr'] or [])) or None, upr=rng(p['upr']), usr=[sqrt3(x) for x in p['usr']] or None,
        classes=p['classes'], ith=rng(p['ith']), freq=sorted(set(p['freq'] or [])), std=p['std'], weeks=rng(p['weeks']),
        cores=p.get('cores'), burden=rng(p['burden']), made=made,
        name=dict(de=name_de, en=name_en), desc=desc, feats=feats, specs=specs,
        options=options, deps=deps, images=imgs, docs=[], family=family, cats=p['cats'],
        old=dict(de=p['source'].get('de') if isinstance(p.get('source'), dict) else None,
                 en=p['source'].get('en') if isinstance(p.get('source'), dict) else None),
        catalog=False, isNew=False,
        aliases=sorted({code, code.replace(' ', ''), display_code, display_code.replace(' ', '')} - {display_code}),
        _docs_raw=p['docs'],
    )
    if 'rail' in p['apps'] and p['kind'] in ('ct', 'vt') and p['area'] == 'mittelspannung':
        prod['railText'] = dict(de=RAIL_TEXT_DE, en=RAIL_TEXT_EN)
    products.append(prod)

from options_i18n import STATS as OPT_STATS  # noqa: E402
audit('produktdaten', f'Englischer Produktfinder (Grundlage auch für FR/HU/ES): {OPT_STATS["de2en"]} Optionstexte in {len(OPT_STATS["products"])} Produkten '
      'waren deutsch oder zusammengeklebt (z. B. „4 Wochen“, „… Special Requestsünsche angeben“) – über die Options-IDs mit der deutschen Fassung abgeglichen und übersetzt.')
audit('inhalt', 'Standortseite: Schwerpunkte der Werke standen auch auf Deutsch überwiegend englisch, bei Marchtrenk fehlte die Liste, englische Adressen waren zusammengeklebt '
      '(„…92-9822041 HamburgGermany“) – Schwerpunkte in fünf Sprachen gepflegt (bitte freigeben), Land je Sprache ergänzt.')

# Katalogfamilien (ohne Konfigurator) -------------------------------------------------
def cat_prod(id, code, area, kind, name_de, name_en, desc_de, desc_en, img_subs=(), docs=(), um=None, install=('outdoor',), apps=(), form=(), isNew=False, made=None, extra=None):
    imgs = []
    for s in img_subs:
        try:
            imgs.append(img_by_sub(s))
        except KeyError:
            audit('build', f'Bild nicht gefunden: {s}')
    pr = dict(id=id, pid=None, code=code, area=area, kind=kind, install=list(install), form=list(form), apps=list(apps),
              um=um or [], ipr=None, isr=None, upr=None, usr=None, classes=[], ith=None, freq=[], std=[], weeks=None, cores=None,
              burden=None, made=made, name=dict(de=name_de, en=name_en), desc=dict(de=desc_de, en=desc_en), feats=[], specs={},
              options={}, deps=None, images=imgs, docs=[], family=None, cats=[], old={}, catalog=True, isNew=isNew, aliases=[],
              _docs_raw=[dict(title=t, url=(u if u.startswith('http') else U + u), type=ty, lang=l, size=None) for (t, u, ty, l) in docs])
    if extra:
        pr.update(extra)
    return pr

CATALOG = [
    cat_prod('ivo', 'IVO', 'hochspannung', 'vt', 'Ölpapier-isolierter Freiluft-Spannungswandler', 'Oil-paper insulated outdoor voltage transformer',
             ['Induktiver Spannungswandler für Hochspannungsanlagen. Er liefert die Ausgangsgrößen für Messgeräte zur Abrechnungsmessung, für Schutzrelais und andere Überwachungsgeräte.',
              'Spannungsklassen von 72 kV bis 245 kV. Öl-Papier-Isolation mit PCB-freiem Isolieröl, hermetisch abgeschlossen durch Edelstahl-Dehnzelle und geklammerte O-Ring-Dichtungen – keine Ölwartung über die gesamte Lebensdauer.'],
             ['Inductive voltage transformer for high-voltage systems. It supplies metering devices for revenue metering, protection relays and other monitoring equipment.',
              'Voltage classes from 72 kV to 245 kV. Oil-paper insulation with PCB-free insulating oil, hermetically sealed by a stainless-steel expansion cell and clamped O-ring seals – no oil maintenance over the entire service life.'],
             ['Type-IVO-Outdoor-Oil-Filled'], [('Produktbroschüre IVO', 'type-ivo-outdoor-oil-filled-product-brochure.pdf', 'catalog', 'en')], um=[72.5, 123, 145, 170, 245], apps=['metering', 'protection'], made='US'),
    cat_prod('ico', 'ICO', 'hochspannung', 'ct', 'Ölpapier-isolierter Freiluft-Stromwandler', 'Oil-paper insulated outdoor current transformer',
             ['Induktiver Stromwandler (CT) für Hochspannungsanlagen zur Versorgung von Abrechnungszählern, Schutzrelais und Überwachungsgeräten.',
              'Spannungsklassen von 72 kV bis 245 kV. Primärleiter umschaltbar ausführbar; bevorzugt Verbundisolatoren mit spezifischem Kriechweg von 31 mm/kV.'],
             ['Inductive current transformer (CT) for high-voltage systems, supplying revenue meters, protection relays and monitoring devices.',
              'Voltage classes from 72 kV to 245 kV. Reconnectable primary available; composite insulators with a specific creepage distance of 31 mm/kV preferred.'],
             ['Type-ICO-Outdoor-Oil-Filled'], [('Produktbroschüre ICO', 'type-ico-outdoor-oil-filled-product-brochure.pdf', 'catalog', 'en')], um=[72.5, 123, 145, 170, 245], apps=['metering', 'protection'], made='US'),
    cat_prod('cmo', 'CMO', 'hochspannung', 'combined', 'Ölpapier-isolierter Kombiwandler (CT/VT)', 'Oil-paper insulated combined transformer (CT/VT)',
             ['Kombinierter induktiver Strom- und Spannungswandler für Hochspannungsanlagen. Er liefert Strom- und Spannungssignale für Abrechnungsmessung, Schutz und Überwachung.',
              'Spannungsklassen von 72 kV bis 245 kV.'],
             ['Combined inductive current and voltage transformer for high-voltage systems, providing current and voltage signals for revenue metering, protection and monitoring.',
              'Voltage classes from 72 kV to 245 kV.'],
             ['Type-CMO-Oil-Filled'], [('Produktbroschüre CMO', 'type-cmo-outdoor-oil-filled-combined-ct-vt-product-brochure.pdf', 'catalog', 'en')], um=[72.5, 123, 145, 170, 245], apps=['metering', 'protection'], made='US'),
    cat_prod('cvo', 'CVO', 'hochspannung', 'ccvt', 'Kapazitiver Spannungswandler (CCVT)', 'Capacitor voltage transformer (CCVT)',
             ['Koppelkondensator-Spannungswandler für Hoch- und Höchstspannungsanlagen. Er liefert die Ausgangsspannung für Zähler, Schutzrelais und Messgeräte; mit Zubehör auch zur Einkopplung von Powerline-Trägersignalen (PLC) nutzbar.',
              'Mit steigender Netzspannung zunehmend wirtschaftlicher und leichter als induktive Spannungswandler. Die oberen Kondensatorsegmente sind für Transport und Handhabung demontierbar. Lebenslange Genauigkeitsgarantie; CVO550EM mit Erdbebennachweis nach IEEE 693.'],
             ['Coupling capacitor voltage transformer for high and extra-high voltage systems. It supplies the output voltage for meters, protection relays and measuring devices; with accessories it can also couple power line carrier (PLC) signals.',
              'Increasingly economical and lighter than inductive voltage transformers as system voltage rises. Upper capacitor sections can be dismantled for shipping and handling. Lifetime accuracy warranty; CVO550EM qualified for high seismic performance to IEEE 693.'],
             ['CVO-Capacitor'], [('Produktbroschüre CVO', 'cvo-capacitor-product-brochure.pdf', 'catalog', 'en'),
                                 ('CVO550EM – Erdbebensicherheit nach IEEE 693', 'CVO550EM-IEEE693-High-Seismic.pdf', 'document', 'en'),
                                 ('CVO – Garantie für lebenslange Genauigkeit 2024', 'CVO-Lifetime-Accuracy-Warranty-r2024.pdf', 'document', 'en')],
             um=[72.5, 123, 145, 170, 245, 362, 420, 550], apps=['metering', 'protection'], made='US'),
    cat_prod('sis', 'SIS', 'stromschienen-sis', 'busbar', 'Vollisoliertes Stromschienensystem bis 40,5 kV / 8.000 A', 'Fully insulated busbar system up to 40.5 kV / 8,000 A',
             ['Das vollisolierte, kapazitiv gesteuerte Stromschienensystem SIS überträgt hohe Ströme und Leistungen auch bei räumlicher Enge – als Alternative zu parallel geschalteten Kabeln und blechgekapselten Schienenkanälen.',
              'Platzsparend durch sehr kleine Biegeradien und frei wählbare Geometrien, geringer Montageaufwand durch genormte Befestigungsteile, hohe thermische und dynamische Kurzschlussfestigkeit, berührungssicher im Bereich des konzentrisch eingebetteten Erdungsbelags. Jede Schiene wird im Werk stückgeprüft.'],
             ['The fully insulated, capacitively graded busbar system SIS transmits high currents and power even in confined spaces – an alternative to parallel cables and metal-enclosed bus ducts.',
              'Space-saving thanks to very small bending radii and free geometry, low installation effort with standardised fixing parts, high thermal and dynamic short-circuit strength, touch-proof in the area of the concentrically embedded earth layer. Every busbar is routine-tested in the factory.'],
             ['SIS_Slider', 'introduction_image_stromschienen'], [('Technische Spezifikation SIS', 'Technische_Spezifikation_SIS.pdf', 'datasheet', 'de'),
                                                                   ('Beispieltexte für Ausschreibungen SIS', 'F2PD003_Tender_Textbesipiele_SIS_DE.pdf', 'document', 'de'),
                                                                   ('SIS Flyer', 'RITZ_SIS_Flyer_DE.pdf', 'catalog', 'de'), ('SIS Broschüre', 'RITZ_SIS_Broschuere_DE-1.pdf', 'catalog', 'de'),
                                                                   ('Kundenreferenz SIS – Projekt BSW', 'Kundenreferenz-SIS-Projekt-BSW.pdf', 'document', 'de')],
             um=[3.6, 7.2, 12, 17.5, 24, 36, 40.5], install=('indoor', 'outdoor'), apps=['touch-proof', 'high-current'], made='DE',
             extra=dict(specs={'imax': 8000})),
    cat_prod('sisd', 'SISD', 'stromschienen-sis', 'bushing', 'Durchführungen bis 72,5 kV / 5.000 A', 'Bushings up to 72.5 kV / 5,000 A',
             ['Gießharzisolierte Durchführungen aus dem Werk Kirchaich für Spannungen bis 72,5 kV und Ströme bis 5.000 A.'],
             ['Cast-resin insulated bushings from the Kirchaich plant for voltages up to 72.5 kV and currents up to 5,000 A.'],
             [], [('SISD Durchführungen', 'SISD-Durchfuehrungen.pdf', 'catalog', 'de')], um=[12, 24, 36, 52, 72.5], install=('indoor',), made='DE'),
    cat_prod('gbvba', 'GBVBA', 'giessharzteile-duromer', 'cast-resin', 'Berührungssichere Kabelverteilerbox', 'Touch-proof cable distribution box',
             ['Metallgekapselte, gießharzisolierte Kabelverteilerbox von DUROMER für berührungssichere Kabelverbindungen in Mittelspannungsanlagen – als 3- und 4-polige Ausführung (Typ B) sowie mit 4-Konen-Adapter.'],
             ['Metal-clad, cast-resin insulated cable distribution box by DUROMER for touch-proof cable connections in medium-voltage installations – available in 3-pole and 4-pole versions (type B) and with a 4-cone adapter.'],
             ['4-polig-Typ-B', '3-polig-Typ-B', 'EB1.png', 'EB2-2', '4-Konen-Adapter'], [('Datenblatt GBVBA', 'Datenblatt-GBVBA-2.pdf', 'datasheet', 'de')],
             um=[12, 24], install=('indoor',), apps=['touch-proof'], made='DE'),
    cat_prod('giessharzsysteme', 'DUROMER', 'giessharzteile-duromer', 'cast-resin', 'Gießharzsysteme, Formteile und Isolierteile', 'Cast resin systems, moulded and insulating parts',
             ['DUROMER entwickelt und konfektioniert Gießharzformmassen – überwiegend auf Polyurethanbasis – und verarbeitet sie zu Isolierteilen und feststoffisolierten Geräten für Nieder- und Mittelspannung und die Elektronik.',
              'Verarbeitung im Vakuumverguss und im Druckgelierverfahren; jede Rezeptur wird im eigenen Labor geprüft und dokumentiert (Isoliervermögen, Teilentladungsfreiheit, Klimabeständigkeit).'],
             ['DUROMER develops and formulates casting compounds – mainly polyurethane-based – and processes them into insulating parts and solid-insulated devices for low and medium voltage and electronics.',
              'Processing by vacuum casting and automatic pressure gelation; every formulation is tested and documented in our own laboratory (insulation capability, freedom from partial discharge, climatic resistance).'],
             ['Giessharzanwendungen', 'introduction_image_giessharzteile_duromer'], [('Produktionsübersicht DUROMER', 'produktionsuebersicht.pdf', 'catalog', 'de'),
                                                                                         ('DUROMER Harzlösungen', 'Duromer_Harzloesungen.pdf', 'catalog', 'de')],
             um=[], install=('indoor',), made='DE'),
    cat_prod('egiw-x45', 'EGIW x45', 'elektronik-sensoren', 'electronic-vt', 'Elektronischer Spannungswandler mit Trennverstärker', 'Electronic voltage transformer with isolation amplifier',
             ['DC- und AC-Messsystem mit Trennverstärker.'], ['DC and AC measuring system with isolation amplifier.'],
             [], [('Datasheet EGIW x45', 'EGIW_x45_Data_Sheet.pdf', 'datasheet', 'en')], install=('indoor',), apps=['dc-measurement'], made='DE'),
    cat_prod('evba-06', 'EVBA 06', 'elektronik-sensoren', 'electronics', 'Pufferverstärker (Stand-alone-Elektronik)', 'Buffer amplifier (stand-alone electronics)',
             ['Ergänzung für vorhandene Spannungssensoren.'], ['Add-on for existing voltage sensors.'],
             ['pufferverstaerker_evba_006'], [('Datasheet EVBA 06', '2018-08_EVBA_x06_datasheet-1.pdf', 'datasheet', 'en')], install=('indoor',), apps=['dc-measurement'], made='DE'),
    cat_prod('eoss-122', 'EOSS 122', 'elektronik-sensoren', 'accessory', 'Offenspannungsschutz für Stromwandler', 'Open-circuit voltage protection for current transformers',
             ['Schutzeinrichtung für Stromwandler: begrenzt gefährliche Überspannungen, wenn der Sekundärkreis eines Stromwandlers versehentlich geöffnet wird – mehr Sicherheit für Mensch und Anlage.'],
             ['Protection device for current transformers: limits dangerous overvoltages if the secondary circuit of a current transformer is accidentally opened – more safety for people and installations.'],
             ['offenspannungsschutz_eoss_122'], [('Datenblatt EOSS 122', 'EOSS_122_DE_2021-11-1.pdf', 'datasheet', 'de')], install=('indoor',), apps=['protection'], made='DE'),
    cat_prod('emvi-4005', 'EMVI 4005', 'elektronik-sensoren', 'electronic-ct', 'Elektronischer Stromwandler für DC- und AC-Ströme bis 12.000 A', 'Electronic current transformer for DC and AC currents up to 12,000 A',
             ['Kompakter elektronischer Stromwandler für die hochgenaue Messung von Gleich-, Wechsel- und Mischströmen bis 12.000 A – z. B. in SVC-Anlagen, Back-to-Back-Stationen, DC-Links und der Hochspannungs-Gleichstrom-Übertragung.',
              'In Mittelspannungsanlagen wird er mit einem entsprechend isolierten Primärleiter eingesetzt. Bei Primärströmen mit Gleichanteilen oder hohen Frequenzanteilen ist er eine gute Alternative zu konventionellen Stromwandlern.'],
             ['Compact electronic current transformer for high-precision measurement of DC, AC and mixed currents up to 12,000 A – e.g. in SVC installations, back-to-back stations, DC links and HVDC transmission.',
              'In medium-voltage installations it is used with a suitably insulated primary conductor. For primary currents with DC or high-frequency components it is a good alternative to conventional current transformers.'],
             ['wp-content/uploads/EMVI.png'], [('Datenblatt EMVI 4005', 'J2-DE_EMVI-4005-Word-DATENBLATT_2Seiter.pdf', 'datasheet', 'de')],
             install=('indoor',), apps=['dc-measurement', 'power-quality'], isNew=True, made='DE', extra=dict(specs={'imax': 12000})),
    cat_prod('zusatzbuerde', 'Zusatzbürde', 'niederspannung', 'accessory', 'Zusatzgerät zur Ausbürdung von Messwandlern', 'Additional burden for instrument transformers',
             ['Mit der Zusatzbürde wird eine ausreichende Bebürdung von Messwandlern erreicht, die z. B. beim Einsatz elektronischer Zähler nicht annähernd ausgebürdet sind.',
              'Hinweis: Nicht ausgebürdete Messwandler halten ihre Genauigkeitsklasse nicht ein.'],
             ['The additional burden ensures sufficient loading of instrument transformers that are far from their rated burden, for example when electronic meters are used.',
              'Note: instrument transformers operated below their rated burden do not keep their accuracy class.'],
             ['Zusatzbuerde.png'], [('Produktwissen kompakt: Zusatzbürde', 'Produktwissen_kompakt_Zusatzbuerde.pdf', 'document', 'de')], install=('indoor',), apps=['metering'], made='DE'),
    cat_prod('gbmw', 'GBMW', 'mittelspannung', 'ct', 'Neuer Wandlertyp im Mittelspannungsprogramm', 'New transformer type in the medium-voltage range',
             ['Neu im RITZ-Mittelspannungsprogramm. Technische Daten und Ausführungen enthält das Datenblatt.'],
             ['New in the RITZ medium-voltage range. Technical data and versions are listed in the datasheet.'],
             [], [('Datenblatt GBMW', 'GBMW120240.pdf', 'datasheet', 'de')], install=('indoor',), isNew=True, made='DE'),
    cat_prod('gbmei', 'GBMEI', 'mittelspannung', 'vt', 'Neuer Wandlertyp im Mittelspannungsprogramm', 'New transformer type in the medium-voltage range',
             ['Neu im RITZ-Mittelspannungsprogramm. Technische Daten und Ausführungen enthält das Datenblatt.'],
             ['New in the RITZ medium-voltage range. Technical data and versions are listed in the datasheet.'],
             [], [('Datenblatt GBMEI', 'GBMEI-120240.pdf', 'datasheet', 'de')], install=('indoor',), isNew=True, made='DE'),
]
products.extend(CATALOG)
audit('inhalt', 'GBMW/GBMEI werden nur in einer News mit Datenblatt genannt; Produktbeschreibung fehlt (Typart aus dem Kürzel abgeleitet, bitte prüfen).')

# Einheitliche Kurzbezeichnung (Schlüssel → Übersetzungen in den i18n-Dateien)
def descriptor_keys(p):
    if p['catalog']:
        return None
    k, f, a = p['kind'], set(p['form']), set(p['apps'])
    lv = p['area'] == 'niederspannung'
    n = k
    if k == 'ct':
        for cond, key in (
            ('metal-clad' in f, 'ct.metalclad'), ('high-current' in f, 'ct.highcurrent'), ('generator' in a, 'ct.generator'),
            ('split-core' in f, 'ct.splitcore'), ('summation' in f, 'ct.summation'), ('interposing' in f, 'ct.interposing'),
            ('laboratory' in f, 'ct.laboratory'), ('tube-bar' in f, 'ct.tubebar'), ('busbar' in f, 'ct.busbar'),
            ('threading' in f, 'ct.threading'), ('frame' in f, 'ct.frame'), ('window' in f and 'ring-core' in f, 'ct.windowring'),
            ('window' in f, 'ct.window'), ('wound' in f, 'ct.wound'), ('bushing' in f and 'bar' in f, 'ct.bushingbar'),
            ('bushing' in f, 'ct.bushing.lv' if lv else 'ct.bushing'), ('cascade' in f, 'ct.cascade'),
            ('support' in f and 'head' in f, 'ct.supporthead'), ('support' in f, 'ct.support'), ('block' in f, 'ct.block'),
            ('ring-core' in f, 'ct.ringcore'), (True, 'ct')):
            if cond:
                n = key
                break
    elif k == 'vt':
        for cond, key in (('metal-clad' in f, 'vt.metalclad'), ('three-phase' in f, 'vt.threephase'), ('auxiliary-supply' in a, 'vt.supply'),
                          ('two-pole' in f, 'vt.twopole'), ('single-pole' in f, 'vt.singlepole'), (True, 'vt')):
            if cond:
                n = key
                break
    elif k == 'combined':
        n = 'combined.metalclad' if 'metal-clad' in f else 'combined'
    elif k == 'current-sensor':
        n = 'cs.threephase' if 'three-phase' in f else 'cs.splitcore' if 'split-core' in f else 'cs.tubebar' if 'tube-bar' in f else 'current-sensor'
    elif k == 'damping':
        n = 'damping.choke' if p['code'].startswith('ZGSWD') else 'damping'
    q = []
    if 'rail' in a:
        q.append('q.rail')
    if 'ex-protection' in a:
        q.append('q.ex')
    if 'power-quality' in a and k in ('ct', 'vt', 'combined'):
        q.append('q.pq')
    if 'touch-proof' in a and 'metal-clad' not in f:
        q.append('q.touchproof')
    if 'head' in f and n not in ('ct.supporthead',):
        q.append('q.head')
    for dkey in ('narrow', 'small', 'large', 'tur'):
        if dkey in f:
            q.append('q.' + dkey)
            break
    if 'auxiliary-supply' in a and n != 'vt.supply':
        q.append('q.supply')
    return dict(n=n, q=q)


for pr in products:
    pr['dk'] = descriptor_keys(pr)

# IRBT: News-Inhalt in Produkt übernehmen
for pr in products:
    if pr['code'] == 'IRBT':
        pr['news'] = dict(de='Optimiertes Design: für Umgebungstemperaturen bis 80 °C ausgelegt, rund 15 % geringere Bauhöhe und 5–10 % weniger Gewicht; zusätzlicher Klemmkasten für eine verbesserte sekundäre Anschlusstechnik. Für Ströme bis 50.000 A; Ausgleichswicklungen kompensieren Fremdfeldeinflüsse bei geringen Phasenabständen.',
                          en='Optimised design: rated for ambient temperatures up to 80 °C, approx. 15 % lower height and 5–10 % less weight; additional terminal box for improved secondary connection. For currents up to 50,000 A; compensating windings cancel external-field effects at small phase spacings.')
        pr['isNew'] = True

# --------------------------------------------------------------------------------------
# Dokumente
# --------------------------------------------------------------------------------------
MAIN_DOCS = json.load(open(f'{RAW}/main_docs.json'))
docs = {}
TSRC = {}  # (url, Sprache) -> Herkunft des Titels: catalog | family | shop | link | file | override (für die Titel je Sprachfassung)


def doc_lang_guess(title, url):
    fn = os.path.basename(urlparse(url).path)
    t = (title + ' ' + fn).lower()
    if re.search(r'(fra|jeux_de|transformateurs|francais|_fr[_.\-])', t):
        return 'fr'
    if re.search(r'(sistemas|transformadores|dispositivo|_es[_.\-]|espanol)', t):
        return 'es'
    if re.search(r'(^|[_\-/ ])hu[_\-]|_hu\.|magyar', t):
        return 'hu'
    if re.search(r'(ger[-_]eng|de[_\-]en|_de_en|deutsch.*english|de\+en)', t):
        return 'de+en'
    if re.search(r'^(en|eng)[_\-]|[_\-](en|e|eng|english)\.pdf$|data[_\- ]?sheet|datasheet|brochure|warranty|statement|notice|customer[-_ ]letter|compact_product|supplier-code|whistleblower', t):
        return 'en'
    return 'de'


def doc_type_guess(title, url):
    fn = os.path.basename(urlparse(url).path).lower()
    t = (title + ' ' + fn).lower()
    rules = [
        ('certificate', ['zertifikat', 'certificate', 'akkreditierung', 'accreditation', 'iris_silver_status', 'iris-certificate', 'zertifizierungsurkunde']),
        ('terms', ['lieferbedingung', 'einkaufsbedingung', 'aeb_', 'zusatzvermerk', 'conflict', 'gl2018', 'terms', 'delivery_conditions', 'purchasing']),
        ('compliance', ['code of conduct', 'code-of-conduct', 'verhaltenskodex', 'hinweisgeber', 'whistleblower', 'co2', 'beleuchtung']),
        ('knowledge', ['produktwissen', 'compact_product', 'power_quality', 'pq_analyse', 'hvdc', 'breitbandwandlern', 'broadband']),
        ('career', ['azubis_', 'ausbildung', 'instandhaltungstechniker', 'mechatroniker', 'elektroniker-mechatronik']),
        ('press', ['messe', 'trade_fair', 'trade-fair', 'kundenmitteilung', 'customer-letter', 'new_facility', 'expansion_factory', 'announces',
                   'kita_kinder', 'trikotsponsoring', 'praesentation_uke', 'irbt_generator', 'iris_silver_performance', 'solution_ge', 'kundenreferenz']),
        ('drawing', ['maßblatt', 'massblatt', 'outline drawing', 'maßzeichnung']),
        ('catalog', ['katalog', 'catalog', 'catalogue', 'broschüre', 'brochure', 'broschuere', 'flyer', 'messwandler_standard', 'metallgekapselte_messwandler',
                     'metal_clad_instrument', 'medium_voltage_instrument', 'ringkern', 'kabelumbau', 'kippschwing', 'n7-2002', 'kser_100',
                     '3_phasen', '3_phase', 'sensoren', 'sensors', 'elektronik', 'sisd', 'produktion', 'harzloesungen', 'resin-solutions',
                     'jeux_de_barres', 'sistemas_de', 'transformadores', 'transformateurs', 'dispositivo', 'mkgbea24']),
        ('datasheet', ['datenblatt', 'datasheet', 'data_sheet', 'data-sheet', 'tdb2026', 'technische_spezifikation']),
    ]
    for ty, words in rules:
        if any(w in t for w in words):
            return ty
    if re.match(r'^(de|en)_', fn) or re.search(r'_(d|e)(-\d)*\.pdf$', fn):
        return 'datasheet'
    if re.match(r'^m\d{6}', fn):
        return 'drawing'
    return 'document'


def add_doc(url, title_de=None, title_en=None, typ=None, lang=None, size=None, area=None, product=None, source='main', pages=(), tsrc=None):
    # Altlast: zwei Dokumentlinks in einem href verkettet → einzeln aufnehmen
    if re.search(r'(?:%20|\s)https?://', url):
        audit('altlasten', f'Defekter Dokumentlink (zwei URLs in einem Link): {url}')
        last = None
        for part in re.split(r'(?:%20|\s)+(?=https?://)', url):
            last = add_doc(part, title_de, title_en, typ, None, size, area, product, source, pages, tsrc)
        return last
    key = url.split('?')[0]
    d = docs.get(key)
    if not d:
        fn = unquote(os.path.basename(urlparse(key).path))
        d = dict(id='d' + format(abs(hash(key)) % 10**8, '08d'), url=key, file=fn, title={}, type=typ or None, lang=lang or None, size=size,
                 areas=[], products=[], source=source, pages=[])
        docs[key] = d
    if title_de and not d['title'].get('de'):
        d['title']['de'] = title_de
        TSRC[(key, 'de')] = tsrc
    if title_en and not d['title'].get('en'):
        d['title']['en'] = title_en
        TSRC[(key, 'en')] = tsrc
    if typ and not d['type']:
        d['type'] = typ
    if lang and not d['lang']:
        d['lang'] = lang
    if size and not d['size']:
        d['size'] = size
    if area and area not in d['areas']:
        d['areas'].append(area)
    if product and product not in d['products']:
        d['products'].append(product)
    for pg in pages:
        if pg not in d['pages']:
            d['pages'].append(pg)
    return d


# deterministische IDs
import hashlib


def did(url):
    return 'd' + hashlib.sha1(url.encode()).hexdigest()[:8]


for pr in products:
    for dr in pr.pop('_docs_raw'):
        title = dr['title']
        t_de = title if not re.match(r'^(Datasheet|Data-Sheet|Outline|Installation Manual|Technical Description|Operating|Leaflet|Product brochure)', title, re.I) else None
        t_en = title if not t_de else None
        d = add_doc(dr['url'], t_de, t_en, dr.get('type') if dr.get('type') != 'manual' else 'manual', dr.get('lang') or None, dr.get('size'),
                    pr['area'], pr['id'], 'produkte' if 'produkte.' in dr['url'] else 'main', tsrc='catalog' if pr['catalog'] else 'shop')
        pr['docs'].append(did(d['url']))
    if pr.get('family') and pr['family'].get('datasheet'):
        d = add_doc(pr['family']['datasheet'], f'Datenblatt {pr["code"]}', f'Datasheet {pr["code"]}', 'datasheet', 'de', None, pr['area'], pr['id'], 'main', tsrc='family')
        if did(d['url']) not in pr['docs']:
            pr['docs'].insert(0, did(d['url']))

# Hauptseiten-Dokumente
PAGE_AREA = {'/produkte/mittelspannungswandler/': 'mittelspannung', '/produkte/niederspannungswandler/': 'niederspannung',
             '/produkte/hochspannungswandler/': 'hochspannung', '/produkte/stromschienen/': 'stromschienen-sis',
             '/produkte/giessharzteile-duromer/': 'giessharzteile-duromer', '/produkte/elektronische-messwandler-und-sensoren/': 'elektronik-sensoren'}
PAGE_AREA_DE = dict(PAGE_AREA)
CRAWL = [p for p in json.load(open(f'{RAW}/crawl.json')) if 'url' in p]


def upath(u):
    """Pfad einer Seite der alten Website, immer mit abschließendem Schrägstrich."""
    pth = urlparse(u).path or '/'
    return pth if pth.endswith('/') else pth + '/'


# Bereichsseiten aller Sprachfassungen (hreflang der deutschen Seiten), damit auch nur englisch/französisch/… verlinkte Kataloge einen Bereich bekommen
for _p in CRAWL:
    _a = PAGE_AREA_DE.get(upath(_p['url']))
    for _l, _u in (_p.get('hreflang') or []) if _a else []:
        if _l != 'x-default' and 'ritz-international.com' in _u:
            PAGE_AREA.setdefault(upath(_u), _a)
GENERIC_LINK = {'weiterlesen', 'datenblatt', 'datasheet', 'produktbroschüre', 'product brochure', 'mehr erfahren', 'read more', '', 'download',
                'datenblatt (englisch)', 'data sheet', 'adatlap', 'fiche technique', 'hoja de datos', 'en savoir plus', 'leer más', 'tovább'}


def page_lang(pg):
    m = re.match(r'^/(en|fr|hu|es)/', pg)
    return m.group(1) if m else 'de'


for url, info in MAIN_DOCS.items():
    by_lang = collections.defaultdict(list)
    for t, pg in info['pairs']:
        t = re.sub(r'\s+', ' ', t).strip()
        if t.lower() in GENERIC_LINK or len(t) < 3:
            continue
        by_lang[page_lang(pg)].append(t)
    pages = info['pages']
    fn = unquote(os.path.basename(urlparse(url).path))
    t_de = by_lang['de'][0] if by_lang.get('de') else None
    t_en = by_lang['en'][0] if by_lang.get('en') else None
    src = 'link'
    if not t_de and not t_en:
        t_de = re.sub(r'[_\-]+', ' ', os.path.splitext(fn)[0]).strip()
        src = 'file'
    area = None
    for pg in pages:
        if pg in PAGE_AREA_DE:
            area = PAGE_AREA_DE[pg]
    if area is None:  # nur auf einer anderssprachigen Bereichsseite verlinkt
        for pg in pages:
            if pg in PAGE_AREA:
                area = PAGE_AREA[pg]
    ty = doc_type_guess((t_de or '') + ' ' + (t_en or '') + ' ' + fn, url)
    add_doc(url, t_de, t_en, ty, doc_lang_guess((t_de or t_en or ''), url), None, area, None, 'main', pages, tsrc=src)

# Bereinigung / Typen vervollständigen
for d in docs.values():
    d['id'] = did(d['url'])
    if not d['type']:
        d['type'] = doc_type_guess(' '.join(d['title'].values()), d['url'])
    if d['source'] == 'main':
        d['type'] = doc_type_guess(' '.join(d['title'].values()), d['url'])
        d['lang'] = doc_lang_guess(' '.join(d['title'].values()), d['url'])
    if not d['lang']:
        d['lang'] = doc_lang_guess(' '.join(d['title'].values()), d['url']) or 'de'
    if not d['title']:
        d['title']['de'] = d['file']
    d['ext'] = os.path.splitext(d['file'])[1].lstrip('.').lower() or 'pdf'
    # neuer Zielpfad für die Migration
    host = 'p' if 'produkte.' in d['url'] else 'w'
    d['path'] = f'/dokumente/{host}/{d["file"]}'

DOC_TITLE = {
    'Produktwissen_kompakt_metallgekapselte_Kombiwandler.pdf': ('Produktwissen kompakt: Metallgekapselte Kombiwandler', None),
    'Compact_product_knowledge_metal_clad_combined_transformers.pdf': (None, 'Compact product knowledge: metal-clad combined transformers'),
    'Produktwissen_kompakt_HVDC.pdf': ('Produktwissen kompakt: HVDC und Anwendungen', None),
    'Product_knowledge_compact_HVDC.pdf': (None, 'Compact product knowledge: HVDC and applications'),
    'Produktwissen_kompakt_Zusatzbuerde.pdf': ('Produktwissen kompakt: Zusatzbürde', None),
    'IRIS_Silver_performance_level_news-1.pdf': ('IRIS Silver Performance Level – Mitteilung', None),
    'IRIS_Silver_performance_level_news_en.pdf': (None, 'IRIS Silver performance level – announcement'),
    'Messe_Vorlage_DE_2026.pdf': ('RITZ Messetermine 2026', None), 'Messe_Vorlage_ENG_2026.pdf': (None, 'RITZ trade fair dates 2026'),
    'Trade_fairs__1738597680-1.pdf': ('RITZ Messetermine 2025', 'RITZ trade fair dates 2025'),
    'New_facility_RITZ_Waynesboro.pdf': ('Neues Werk RITZ Waynesboro', 'New facility RITZ Waynesboro'),
    'Kundenmitteilung_EU_Verordnung_2026_2133.pdf': ('Kundenmitteilung zur Durchführungsverordnung (EU) 2026/2133', None),
    'Customer-Letter_EU_Regulation_2026_2133.pdf': (None, 'Customer letter on Implementing Regulation (EU) 2026/2133'),
    'RITZ_Solution_GE_HYpact-1.pdf': ('RITZ-Lösung für die GE-HYpact-Anlage', None), 'RITZ_Solution_GE_HYpact_En-1.pdf': (None, 'RITZ solution for the GE HYpact switchgear'),
    'TE146-93.006i01_Produktinformation.pdf': ('Produktinformation TE-Messung', 'Product information PD measurement'),
    'IRBT_Generatorwandler_optimiertes_Design.pdf': ('IRBT: Generatorwandler mit optimiertem Design', None),
    'Expansion_factory_RITZ_Hungary.pdf': ('Erweiterung des Werks RITZ Ungarn', 'Expansion of the RITZ Hungary plant'),
    'RitzUSA-Announces-New-High-Voltage-Factory-JUL-23-2024.pdf': ('RITZ USA kündigt neues Hochspannungswerk an', 'RITZ USA announces new high-voltage factory'),
    'ASV_Naisa_Trikotsponsoring_2025.pdf': ('Trikotsponsoring ASV Naisa 2025', None),
    'RITZ_Kita_Kinder_Besuch_im_Werk_Kirchaich.pdf': ('Kita-Besuch im Werk Kirchaich', None),
}


def prettify(t):
    if not t:
        return t
    if '_' in t or re.search(r'\.pdf$', t, re.I):
        t = re.sub(r'\.pdf$', '', t, flags=re.I)
        t = re.sub(r'[_]+', ' ', t)
        t = re.sub(r'[-\s]+\d{1,2}$', '', t).strip()
    return t


for d in docs.values():
    fn = os.path.basename(urlparse(d['url']).path)
    if fn in DOC_TITLE:
        a, b = DOC_TITLE[fn]
        if a:
            d['title']['de'] = a
            TSRC[(d['url'], 'de')] = 'override'
        if b:
            d['title']['en'] = b
            TSRC[(d['url'], 'en')] = 'override'
        if a and not b and d['source'] == 'main':
            d['title'].pop('en', None) if d['title'].get('en', '').lower() in ('additional burden', 'zusatzbürde') else None
    for k in list(d['title']):
        d['title'][k] = prettify(d['title'][k])
    if not d['title'].get('de') and d['title'].get('en') and d['lang'] == 'de' and d['source'] == 'main':
        d['lang'] = 'en'
audit('inhalt', 'News „Kombiwandler Platzersparnis“ verlinkt das PDF zu metallgekapselten Kombiwandlern mit dem Linktext „Zusatzbürde“ (DE und EN).')

docs_list = sorted(docs.values(), key=lambda d: (d['type'], ' '.join(d['title'].values()).lower()))
# Dubletten-Dateinamen im Zielpfad auflösen
seenp = collections.Counter()
for d in docs_list:
    seenp[d['path']] += 1
    if seenp[d['path']] > 1:
        b, e = os.path.splitext(d['path'])
        d['path'] = f'{b}-{seenp[d["path"]]}{e}'

# --------------------------------------------------------------------------------------
# News
# --------------------------------------------------------------------------------------
POSTS = [p for p in json.load(open(f'{RAW}/posts.json')) if 'date' in p]
JUNK = {'agb', 'widerrufsbelehrung', 'widerrufsformular', 'order', 'lieferung', 'datenschutz', 'zahlungsarten', 'no-route', 'impressum'}


def last_seg(u):
    return [x for x in urlparse(u).path.split('/') if x][-1] if urlparse(u).path.strip('/') else ''


posts = []
for p in POSTS:
    seg = last_seg(p['link'])
    if seg in JUNK:
        audit('altlasten', f'Shop-/Altlast-Beitrag aus 2019 öffentlich erreichbar: {p["link"]}')
        continue
    posts.append(p)

# Übersetzungen per hreflang gruppieren (Union-Find über URLs)
parent = {}


def find(x):
    parent.setdefault(x, x)
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra


def nu(u):
    return u.rstrip('/') + '/'


for p in posts:
    me = nu(p['link'])
    find(me)
    for lang, u in p.get('hreflang') or []:
        if lang == 'x-default':
            continue
        union(me, nu(u))

groups = collections.defaultdict(list)
for p in posts:
    groups[find(nu(p['link']))].append(p)

# Gleiche Beiträge ohne hreflang-Verknüpfung über Featured-Image + Datum zusammenführen
def gkey(ps):
    p0 = ps[0]
    return (p0['date'][:10], (p0.get('featured') or '')[-40:])
merged = {}
for g, ps in list(groups.items()):
    k = gkey(ps)
    if k[1] and k in merged and not set(x['lang'] for x in ps) & set(x['lang'] for x in groups[merged[k]]):
        groups[merged[k]].extend(ps)
        del groups[g]
    else:
        merged.setdefault(k, g)

NEWS_DE_TITLE = {'lorem-ipsum-news-1': '25 Jahre hochgenaue DC-Messung'}
# Deutscher Beitrag enthielt auf der alten Seite nur den englischen Text → sinngetreue Übersetzung
NEWS_DE_BODY = {'lorem-ipsum-news-1': (
    '<h3>RITZ erneut von seinem schwedischen Partner in HGÜ-Projekten beauftragt: 96 DC-Messsysteme</h3> '
    '<p>Seit fast 25 Jahren ermöglicht die Hochspannungs-Gleichstrom-Übertragung (HGÜ) den Austausch sauberer, erneuerbarer elektrischer Energie zwischen Québec und Neuengland.</p> '
    '<p>Von Anfang an dabei: die hochgenaue DC-Messtechnik der Ritz Instrument Transformers GmbH.</p> '
    '<p>Nach 25 Jahren störungsfreien Betriebs steht im Rahmen einer Modernisierung der Austausch der elektronischen Komponenten der DC-Messsysteme an. '
    'Der schwedische Generalunternehmer für Hydro-Québec und National Grid hat RITZ erneut mit der Lieferung von 96 Elektronikeinheiten des Typs EMVI beauftragt. '
    'Dank ihrer langlebigen Qualität bleiben die zugehörigen Sensorköpfe (Stromwandler) in der Anlage – das senkt die Kosten für den Betreiber erheblich.</p> '
    '<p>Das hochgenaue DC- und AC-Messsystem EMVI wird seit 1985 weltweit in nahezu allen großen HGÜ-, SVC- und GKK-Anlagen eingesetzt. '
    'Es erfasst Gleich- und Wechselströme bis 24 kA auf allen Spannungsebenen für Mess-, Schutz- und Abrechnungszwecke.</p>')}
PAVILION_DE = ('Besuchen Sie uns im Deutschen Pavillon in Taschkent', (
    '<p>🌍 Wir freuen uns, ankündigen zu können: RITZ stellt vom 13. bis 15. Mai 2025 während der Energy Week im CAEx – Central Asian Expocenter '
    'in Taschkent, Usbekistan, im Deutschen Pavillon aus!</p> '
    '<p>Als Teil des Deutschen Pavillons zeigen wir unser Portfolio an Messwandlern und weiteren Lösungen für die Elektroindustrie. '
    'Eine gute Gelegenheit, sich zu vernetzen, Ideen auszutauschen und neue Partnerschaften im zentralasiatischen Markt zu erschließen.</p> '
    '<p>📍 Besuchen Sie uns im Deutschen Pavillon – wir freuen uns darauf, Sie in Taschkent zu treffen!</p>'))
NEWS_TRANSLATIONS = {
    'sponsoring-sportclub-lichteneiche': {
        'en': ('Sponsorship: Sportclub Lichteneiche', '<p>Our plant in Kirchaich supports Sportclub Lichteneiche with a sponsorship. '
               'We are delighted that our logos now also appear on the club’s jerseys and wish the team every success.</p>'),
    },
    'ritz-nimmt-an-xxx-vde-zaehlerfachtagung-am-17-18-september-2024-in-gera-teil': {
        'en': ('RITZ at the 30th VDE Metering Conference on 17–18 September 2024 in Gera',
               '<p>Visit our colleagues at the RITZ stand!</p> <p>Your RITZ sales team</p>'),
        'fr': ('RITZ participe à la 30e conférence VDE sur le comptage les 17 et 18 septembre 2024 à Gera',
               '<p>Rendez visite à nos collègues sur le stand RITZ\u202f!</p> <p>Votre équipe commerciale RITZ</p>'),
        'hu': ('A RITZ részt vesz a XXX. VDE mérőtechnikai szakkonferencián 2024. szeptember 17–18-án Gerában',
               '<p>Látogassa meg kollégáinkat a RITZ standján!</p> <p>A RITZ értékesítési csapata</p>'),
        'es': ('RITZ participa en la XXX Jornada Técnica de Contadores de VDE los días 17 y 18 de septiembre de 2024 en Gera',
               '<p>¡Visite a nuestros compañeros en el stand de RITZ!</p> <p>Su equipo de ventas de RITZ</p>'),
    },
}
NEWS_CAT = {
    'kundenmitteilung': 'company', 'ritz-marchtrenk-erreichte': 'company', 'neues-werk-in-waynesboro': 'company', 'ritz-auf-der-gritec': 'events',
    'uebersicht-hvdc': 'products', 'konstruktion-neues-hochspannungswerk': 'company', 'neue-produkte-gbmw': 'products', 'zusatzbuerde': 'products',
    'kombiwandler-platzersparnis': 'products', 'emvi-produktneuheit': 'products', 'giessharzanwendungen': 'products', 'irbt-generatorwandler': 'products',
    'ge-hypact-anlage': 'references', 'ritz-messetermine-2026': 'events', 'erweiterung-des-ritz-standortes': 'company', 'co2-reduktion': 'responsibility',
    'das-neueste-aus-der-alzheimerforschung': 'responsibility', 'ein-voller-erfolg': 'responsibility', 'ritz-instrument-transformers-estara': 'events',
    'visit-us-at-the-german-pavilion': 'events', 'ritz-oeffnet-tueren': 'responsibility', 'ritz-auf-der-eltefa-2025': 'events',
    'ritz-nimmt-an-zahlreichen-fachmessen': 'events', 'ritz-stellt-auf-der-eltefa-aus': 'events', 'sponsoring-sportclub': 'responsibility',
    'ritz-nimmt-an-der-13-hausmesse': 'events', 'ritz-nimmt-an-xxx-vde': 'events', 'auszeichnung-zum-lieferanten': 'references',
    'kundenreferenz-sis': 'references', 'ritz-messetermine-2024': 'events', 'personalmesse-karrierestart': 'events', 'f1-in-schools': 'responsibility',
    'ritz-familienfest': 'company', 'em-power-europe': 'events', 'teamchallenge-in-dresden': 'company', 'ritz-ist-aussteller-auf-der-eltefa': 'events',
    'ritz-ist-zugelassener-wirtschaftsbeteiligter': 'company', '25-jahre-hochgenaue-dc-messung': 'products', 'ritz-mitarbeiterin-zur-besten': 'company',
    'ritz-bietet-neue-dienstleistung': 'products', 'ritz-ungarn-ist-unternehmen-des-jahres': 'company', 'mehr-sicherheit-fuer-mensch-und-anlage': 'products',
}
LANGMAP = {'de-DE': 'de', 'en-US': 'en', 'fr-FR': 'fr', 'hu-HU': 'hu', 'es-ES': 'es'}
TITLE_FIX = {
    'ritz-is-an-exhibitor-at-eltefa-in-stuttgart-be-part-of-it': 'RITZ is exhibiting at eltefa in Stuttgart. Join us!',
}


def clean_post_html(h):
    if not h:
        return ''
    h = re.sub(r'<object[^>]*>.*?</object>|<object[^>]*/?>', '', h, flags=re.S)
    h = re.sub(r'<i>\s*</i>', '', h)
    h = re.sub(r'</?(div|section|span)[^>]*>', '', h)
    h = re.sub(r'<p>\s*(&nbsp;|\s)*</p>', '', h)
    h = re.sub(r'<br>\s*(?=</p>)', '', h)
    h = re.sub(r'\s{2,}', ' ', h).strip()
    return h


news = []
for g, ps in groups.items():
    item = dict(id=None, date=None, v={}, image=None, images=[], docs=[], tags=[])
    for p in sorted(ps, key=lambda x: x['lang']):
        lang = LANGMAP.get(p['lang'], p['lang'][:2])
        seg = last_seg(p['link'])
        title = html.unescape(p.get('title') or '').strip()
        if '$$$' in title:
            audit('inhalt', f'Englischer News-Titel besteht nur aus Platzhaltern („$$$$“): {p["link"]}')
            title = TITLE_FIX.get(seg, title)
        body = clean_post_html(p.get('html') or '')
        # Bild-URLs auf lokale Dateien abbilden
        def repl_img(m):
            k = img_for_url(m.group(1))
            if k and k not in item['images']:
                item['images'].append(k)
            return f'<img data-img="{k}" alt="">' if k else ''
        body = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', repl_img, body)
        # Links auf Dokumente → Dokument-IDs
        def repl_a(m):
            href = m.group(1)
            if re.search(r'\.(pdf|docx?)$', href.split('?')[0], re.I):
                d = add_doc(href, None, None, None, None, None, None, None, 'main')
                d['id'] = did(d['url'])
                if d['id'] not in item['docs']:
                    item['docs'].append(d['id'])
                return f'<a data-doc="{d["id"]}" href="{href}">'
            return f'<a href="{href}" rel="noopener">'
        body = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>', repl_a, body)
        text = TAG_RE.sub(' ', body)
        is_german_copy = lang != 'de' and re.search(r'\b(nimmt|Besuchen Sie|unserem|Ihr RITZ)\b', title + ' ' + text) is not None
        if is_german_copy:
            audit('inhalt', f'Beitrag in „{lang}“ enthält unübersetzten deutschen Text: {p["link"]}')
        if lang == 'de' and seg in NEWS_DE_TITLE:
            audit('inhalt', f'Deutscher Beitrag mit englischem Titel/Slug „{seg}“: {p["link"]}')
            title = NEWS_DE_TITLE[seg]
            if seg in NEWS_DE_BODY:
                body = NEWS_DE_BODY[seg]
                audit('inhalt', f'Deutscher Beitrag enthielt nur englischen Text – für die neue Seite übersetzt (bitte fachlich freigeben): {p["link"]}')
        bad_slug = seg.isdigit() or seg.startswith('lorem-ipsum')
        if seg.startswith('lorem-ipsum'):
            audit('inhalt', f'Platzhalter-Slug in Produktion: {p["link"]}')
        item['v'][lang] = dict(title=title, slug=(slugify(title)[:70].strip('-') if bad_slug else seg), html=body, old=p['link'], untranslated=bool(is_german_copy))
        if seg.isdigit():
            audit('inhalt', f'News-URL besteht nur aus einer Zahl: {p["link"]}')
        if not item['date'] or p['lang'] == 'de-DE':
            item['date'] = p['date'][:10]
        fk = img_for_url(p.get('featured'))
        if fk and not item['image'] and 'cropped-RTZ-LOGO' not in (p.get('featured') or ''):
            item['image'] = fk
    if 'de' in item['v']:
        item['id'] = item['v']['de']['slug']
    else:
        item['id'] = next(iter(item['v'].values()))['slug']
    # Kategorie
    item['cat'] = next((c for k, c in NEWS_CAT.items() if item['id'].startswith(k)), None)
    if not item['cat']:
        audit('build', f'News ohne Kategorie: {item["id"]}')
        item['cat'] = 'company'
    # englischsprachiger Beitrag auf der DE-Seite → Original als EN-Version führen, DE übersetzen
    if item['id'].startswith('visit-us-at-the-german-pavilion') and 'en' not in item['v']:
        item['v']['en'] = dict(item['v']['de'], untranslated=False)
        item['v']['de'] = dict(item['v']['de'], title=PAVILION_DE[0], html=PAVILION_DE[1], untranslated=False)
        audit('inhalt', 'Deutscher Beitrag „Visit us at the German Pavilion“ enthielt nur englischen Text – für die neue Seite übersetzt (bitte fachlich freigeben).')
    # Kopien erkennen: Sprachfassung = deutscher bzw. englischer Text → Inhaltssprache vermerken
    de_v, en_v = item['v'].get('de'), item['v'].get('en')
    for L, v in item['v'].items():
        if L != 'de' and de_v and v['html'] and v['html'] == de_v['html'] and v['title'] == de_v['title']:
            v['untranslated'] = True
        if L in ('fr', 'hu', 'es') and en_v and not v.get('untranslated') and v['html'] and v['html'] == en_v['html'] and v['title'] == en_v['title']:
            v['contentLang'] = 'en'
            audit('inhalt', f'Beitrag in „{L}“ ist eine unveränderte Kopie der englischen Fassung: {v["old"]}')
        if v.get('untranslated'):
            v['contentLang'] = 'de'
    # kurze, nur deutsch vorliegende Beiträge: sinngetreu übersetzt (Freigabe offen)
    for L, (title, body) in NEWS_TRANSLATIONS.get(item['id'], {}).items():
        if L in item['v']:
            item['v'][L].update(title=title, html=body, untranslated=False)
            item['v'][L].pop('contentLang', None)
            audit('inhalt', f'Beitrag „{item["id"]}“ in „{L}“ war unübersetzt – für die neue Seite übersetzt (bitte freigeben).')
    item.pop('tags', None)
    news.append(item)
news.sort(key=lambda x: x['date'], reverse=True)

# --------------------------------------------------------------------------------------
# Jobs (Personio, Stand Abruf)
# --------------------------------------------------------------------------------------
JOBS = [
    ('Ausbildung Fachkraft für Lagerlogistik (m/w/d)', 'Ottendorf-Okrilla', 'training', 2835088),
    ('Ausbildung Mechatroniker (m/w/d)', 'Ottendorf-Okrilla', 'training', 2834291),
    ('Elektroniker (m/w/d) Prüffeld', 'Ottendorf-Okrilla', 'permanent', 2800669),
    ('Specialist Energy (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2775247),
    ('Konstrukteur (m/w/d)', 'Hamburg', 'permanent', 2749868),
    ('Group ERP Manager (m/w/d)', 'Hamburg', 'permanent', 2740479),
    ('Lagerleiter / Manager Warehouse (m/w/d)', 'Kirchaich', 'permanent', 2676193),
    ('HR Specialist (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2573686),
    ('Leitung Prüffeld / Manager Testing (m/w/d)', 'Kirchaich', 'permanent', 2556201),
    ('Leitung Prüffeld / Manager Testing (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2527864),
    ('Mitarbeiter Instandhaltung (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2469114),
    ('Specialist Engineering (m/w/d)', 'Kirchaich', 'permanent', 2455915),
    ('Konstrukteur (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2433976),
    ('Teamleitung Zuschnitt- und Schweißzentrum (m/w/d)', 'Kirchaich', 'permanent', 2415773),
    ('Produktionsmitarbeiter (m/w/d)', 'Ottendorf-Okrilla', 'permanent', 2028868),
]
LOC_ID = {'Ottendorf-Okrilla': 'dresden', 'Hamburg': 'hamburg', 'Kirchaich': 'kirchaich'}
jobs = [dict(id=str(j[3]), title=j[0], city=j[1], location=LOC_ID[j[1]], type=j[2], time='full', url=f'https://ritz.jobs.personio.de/job/{j[3]}')
        for j in JOBS]

# --------------------------------------------------------------------------------------
# Alte URLs (für Weiterleitungen)
# --------------------------------------------------------------------------------------
SM = json.load(open(f'{RAW}/sitemaps.json'))
oldurls = []


def collect_urls(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('loc', 'url') and isinstance(v, str) and v.startswith('http'):
                oldurls.append(v)
            else:
                collect_urls(v)
    elif isinstance(o, list):
        for x in o:
            if isinstance(x, str) and x.startswith('http'):
                oldurls.append(x)
            else:
                collect_urls(x)


collect_urls(SM)
PSM = json.load(open(f'{RAW}/produkte_sitemap.json'))
collect_urls(PSM)
for pr in products:
    for lang in ('de', 'en'):
        if pr['old'].get(lang):
            oldurls.append(pr['old'][lang])
for n in news:
    for lang, v in n['v'].items():
        oldurls.append(v['old'])
oldurls = sorted(set(u.split('#')[0] for u in oldurls if 'ritz-international.com' in u))

# --------------------------------------------------------------------------------------
# Dokumente je Sprachfassung (Hauptseiten-Dokumente)
#   vis   Sprachfassungen der alten Website, die das Dokument verlinkt haben (beliebige Seite)
#   tl    Titel je Sprachfassung aus dem Linktext dieser Fassung; generische Linktexte („Datenblatt“, „Adatlap“ …)
#         und Dateinamen als Linktext („KS_50-02_d“) → Dokumentart + Typcode der Zeile, in der der Link stand
#   alt   Gegenstück je Sprache: das Dokument, das die anderssprachige Fassung derselben Seite an derselben Stelle
#         verlinkt hat – nur wo die Seitenfassungen sicher übereinstimmen (gleiche Linkzahl und Linkart, oder
#         gleiche Dokumente als Anker und dazwischen gleich lange Abschnitte); nur für Sprachen, in denen das Dokument
#         selbst nicht sichtbar ist
#   areaLangs  je Bereich die Sprachen, deren Bereichsseite das Dokument verlinkt hat (Bereiche aus Produkten fehlen hier)
#   same  nur bei byte-gleichen Kopien: ID der Hauptkopie (die von den meisten Sprachfassungen verlinkte)
#   lang  Inhaltssprache aus dem PDF-Text (erste Seiten), sonst aus Hinweisen im Dateinamen
# Produkte mit Datenblatt der Hauptseite bekommen alle Sprachfassungen dieses Datenblatts in docs (Stellen auf den
# Bereichsseiten bzw. in News). Auswertung in den Ansichten: site/src/lib/doclang.js, Prüfung: site/tools/qa/doc-langs.mjs
# --------------------------------------------------------------------------------------
import subprocess  # noqa: E402
from html.parser import HTMLParser  # noqa: E402
from concurrent.futures import ThreadPoolExecutor  # noqa: E402

SITE_LANGS = ['de', 'en', 'fr', 'hu', 'es']

# ---- Inhaltssprache -------------------------------------------------------------------
LANG_STOP = {
    'de': 'der die das und ist mit für von zu den dem des ein eine einer eines einem auf im nicht sich auch bei oder nach wird werden sind wir sie '
          'als aus durch über unter bis zum zur wie kann können nur sowie unsere unser ihre ihr dieser diese dieses wenn alle haben hat sein noch '
          'mehr gemäß bzw vom beim sowohl wurde wurden muss müssen soll sollen keine kein jedoch dass daß ohne gegen zwischen',
    'en': 'the and of to is for with on by are be this that from as at or it which can not all have has our we you your will may these such other '
          'into between up been its any more than their they shall must should used use were was there where when who would also each',
    'fr': 'le la les des du et est une pour dans avec sur par au aux ce cette qui que sont ne pas nous vous leur été être ou à il elle ses son selon '
          'votre notre peut comme',
    'es': 'el los las del y es una por para con al lo se su sus como más este esta entre sobre sin también puede según nuestro nuestra hasta desde '
          'ha han muy',
    'hu': 'az és hogy nem egy van vagy meg mint ez azt ezt csak már kell valamint illetve szerint minden után között által esetén számára továbbá '
          'amely amelyek amelyet ha így ezért pedig még lesz volt vannak akkor mert hanem sem alapján során mellett révén',
}
LANG_STOP = {k: set(v.split()) for k, v in LANG_STOP.items()}
_lw = collections.Counter(w for s in LANG_STOP.values() for w in s)
LANG_STOP = {k: {w for w in s if _lw[w] == 1} for k, s in LANG_STOP.items()}  # Wörter, die in zwei Sprachen vorkommen, zählen nicht
LANG_CHARS = {'de': 'ßä', 'hu': 'őű', 'es': 'ñ', 'fr': 'çèêœ'}
LANG_WORD = re.compile(r"[a-zäöüßàâçéèêëîïôûùÿñáíóúőűœ]+")


def lang_counts(text):
    c = collections.Counter()
    for t in LANG_WORD.findall((text or '').lower()):
        for k, s in LANG_STOP.items():
            if t in s:
                c[k] += 1
        for k, ch in LANG_CHARS.items():
            if any(x in t for x in ch):
                c[k] += 1
    return c


def lang_from_text(text, hint=None):
    """Sprache eines Textes aus Funktionswörtern; „de+en“ bei deutlich zweisprachigen Texten. None = zu wenig Text."""
    c = lang_counts(text)
    tot = sum(c.values())
    if tot < 4:
        return None
    (l1, n1), *rest = sorted(c.items(), key=lambda kv: (-kv[1], SITE_LANGS.index(kv[0])))
    if tot < 8 and n1 < 0.75 * tot:
        return None
    if rest and rest[0][1] >= 8 and rest[0][1] >= 0.3 * n1:
        pair = {l1, rest[0][0]}
        if pair == {'de', 'en'}:
            return 'de+en'
        if hint in pair:  # andere Zweisprachigkeit (z. B. ES/EN-Prospekt): Hinweis im Dateinamen entscheidet
            return hint
    return l1


FN_LANG_TOK = {'de': {'de', 'deu', 'ger', 'german', 'deutsch', 'dtsch'}, 'en': {'en', 'eng', 'engl', 'english', 'englisch'},
               'fr': {'fr', 'fra', 'francais', 'french'}, 'es': {'es', 'esp', 'espanol', 'spanish'}, 'hu': {'hu', 'hun', 'magyar'}}
FN_LANG_WORDS = {
    'de': {'datenblatt', 'spannungswandler', 'stromwandler', 'messwandler', 'katalog', 'sensoren', 'broschuere', 'durchfuehrungen', 'produktwissen',
           'produktinformation', 'kundenmitteilung', 'kundenreferenz', 'hinweisgebersystem', 'verhaltenskodex', 'lieferbedingungen', 'zertifizierungsurkunde',
           'akkreditierung', 'praesentation', 'foerderung', 'beleuchtung', 'reduktion', 'azubis', 'elektroniker', 'mechatroniker', 'instandhaltungstechniker',
           'zusatzvermerk', 'besuch', 'generatorwandler', 'trikotsponsoring', 'produktionsuebersicht', 'harzloesungen', 'spezifikation', 'vorlage', 'messe',
           'elektronik', 'hausmesse', 'verordnung'},
    'en': {'datasheet', 'data', 'sheet', 'brochure', 'warranty', 'statement', 'notice', 'letter', 'customer', 'policy', 'facility', 'announces', 'solution',
           'bushings', 'sensors', 'catalog', 'specification', 'tender', 'knowledge', 'analysis', 'trade', 'fairs', 'conflict', 'supplier', 'conduct',
           'expansion', 'factory', 'regulation', 'additional', 'burden', 'optimized', 'resin'},
}


def file_lang_hint(fn):
    """Sprache aus dem Dateinamen (Kürzel wie _de/_ENG/-GER-ENG, Endung _d/_e, sonst Fachwörter); None = kein klarer Hinweis."""
    toks = [t for t in re.split(r'[^a-z0-9äöüß]+', os.path.splitext(fn)[0].lower()) if t]
    while toks and toks[-1].isdigit():  # Kopien -1, -2 …
        toks.pop()
    found = {k for k, s in FN_LANG_TOK.items() if any(t in s for t in toks)}
    if len(toks) > 1 and toks[-1] in ('d', 'e'):  # KS_50-02_d, KS_50-02_e
        found.add('de' if toks[-1] == 'd' else 'en')
    if toks and re.match(r'^\d+[de]$', toks[-1]):  # td-0023e, im-0006e (Dokumentnummer mit Sprachbuchstabe)
        found.add('de' if toks[-1].endswith('d') else 'en')
    if not found:
        found = {k for k, s in FN_LANG_WORDS.items() if any(t in s for t in toks)}
        if len(found) > 1:
            return None
    if found == {'de', 'en'}:
        return 'de+en'
    loc = found & {'fr', 'es', 'hu'}
    if len(loc) == 1:
        return loc.pop()
    return next(iter(found)) if len(found) == 1 else None


# Gescannte PDFs ohne Textebene, deren Dateiname keinen oder einen unvollständigen Hinweis gibt (Sprache per Texterkennung geprüft)
DOC_LANG_SCAN = {'2420_001-2.pdf': 'de+en', 'Akkreditierung-Ritz-AT_ISO-17025.pdf': 'de+en'}


def pdf_head_text(path, pages=3):
    try:
        r = subprocess.run(['pdftotext', '-l', str(pages), '-enc', 'UTF-8', path, '-'], capture_output=True, timeout=120)
        if r.returncode == 0:
            return r.stdout.decode('utf-8', 'replace')
    except Exception:
        pass
    try:
        from pypdf import PdfReader
        return '\n'.join((pg.extract_text() or '') for pg in PdfReader(path).pages[:pages])
    except Exception:
        return None


def local_doc_path(d):
    return f'{RAW}/docs/' + d['path'][len('/dokumente/'):]


LANG_CHANGES = []
_main_docs = [d for d in docs_list if d['source'] == 'main']
_pdfs = [d for d in _main_docs if d['ext'] == 'pdf' and os.path.exists(local_doc_path(d))]
with ThreadPoolExecutor(4) as _ex:
    _texts = dict(zip([d['id'] for d in _pdfs], _ex.map(lambda d: pdf_head_text(local_doc_path(d)), _pdfs)))
for d in _main_docs:
    hint = file_lang_hint(d['file'])
    new, how = None, None
    if d['file'] in DOC_LANG_SCAN:
        new, how = DOC_LANG_SCAN[d['file']], 'Scan (geprüft)'
    elif _texts.get(d['id']):
        new, how = lang_from_text(_texts[d['id']], hint), 'PDF-Text'
    if not new and hint:
        new, how = hint, ('Dateiname (PDF ohne Text)' if d['id'] in _texts else 'Dateiname')
    if new and new != d['lang']:
        LANG_CHANGES.append((d['file'], d['lang'], new, how))
        d['lang'] = new

# Produktfinder-Dokumente (keine lokalen Dateien): nur offensichtlich falsche Angaben korrigieren
#  a) Kopie eines Hauptseiten-PDFs (gleicher Dateiname, gleiche Größe) → dessen Inhaltssprache
#  b) Titel kennzeichnet die englische Fassung („… (EN) …“, „Produktbeschreibung En …“) → „en“
#  c) zweisprachiger Titel („Maßblatt - Outline Drawing“, „Betriebsanleitung - Operating Instruction“) → „de+en“
#  d) Titel nur mit englischen Dokumentwörtern (auch mit den Tippfehlern des Shops), Angabe „de“ → „en“ (und umgekehrt)
#  e) Dateiname mit Sprachkennung (td-0003e, deu) widerspricht der Angabe de/en
#  (b–e nur, wenn der Dateiname nicht dagegen spricht)
TITLE_EN_DOC = re.compile(r'\b(data[\s\-]*s\w{0,2}e{1,2}t|datasheet|descr?iption|instr\w*ction|install\w*|manual|outl\w*\s*-?\s*dra\w*ing|leaflet|operating|assembly)\b', re.I)
TITLE_DE_DOC = re.compile(r'(datenblatt|ma(ß|ss)b\w*|beipackzettel|benutzerhandbuch|beschreibung|anleitung|anweisung|produktinformation|sicherheit|technische|übersicht|broschüre|aufbau|zeichnung)', re.I)
TITLE_EN_EDITION = re.compile(r'\((?:en|eng|e)\)|\b(?:En|EN|Eng)\b(?!\s*\d)')  # „(EN)“, „Produktbeschreibung En …“: englische Fassung


def norm_fn(fn):
    s = os.path.splitext(fn.lower())[0]
    s = re.sub(r'([_\-]+\d+_?)+$', '', s)
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')


_main_by_fn = collections.defaultdict(list)
for d in _main_docs:
    _main_by_fn[norm_fn(d['file'])].append(d)
for d in docs_list:
    if d['source'] != 'produkte':
        continue
    new, how = None, None
    twins = _main_by_fn.get(norm_fn(d['file'])) or []
    twins = [x for x in twins if d.get('size') and os.path.exists(local_doc_path(x)) and abs(os.path.getsize(local_doc_path(x)) - d['size']) <= 0.01 * d['size']]
    if twins and len({x['lang'] for x in twins}) == 1 and twins[0]['id'] in _texts:
        new, how = twins[0]['lang'], f'Kopie von {twins[0]["file"]}'
    else:
        t = ' '.join(d['title'].values())
        en, de_ = bool(TITLE_EN_DOC.search(t)), bool(TITLE_DE_DOC.search(t))
        hint = file_lang_hint(d['file'])
        if en and TITLE_EN_EDITION.search(t) and d['lang'] != 'en' and hint != 'de':
            new, how = 'en', 'Titel: englische Fassung'
        elif en and de_ and d['lang'] in ('de', 'en') and not TITLE_EN_EDITION.search(t) and hint not in ('de', 'en'):
            new, how = 'de+en', 'Titel zweisprachig'
        elif en and not de_ and d['lang'] == 'de' and hint != 'de':
            new, how = 'en', 'Titel englisch'
        elif de_ and not en and d['lang'] == 'en' and hint != 'en':
            new, how = 'de', 'Titel deutsch'
        elif hint in ('de', 'en') and d['lang'] in ('de', 'en') and hint != d['lang'] and (en if hint == 'en' else de_):
            new, how = hint, 'Dateiname'
    if new and new != d['lang']:
        LANG_CHANGES.append((d['file'], d['lang'], new, how))
        d['lang'] = new

# ---- Links der alten Seiten in Reihenfolge ---------------------------------------------
DOC_HREF = re.compile(r'\.(pdf|docx?)(?:\?|$)', re.I)


class _LinkParser(HTMLParser):
    """Dokumentlinks eines HTML-Abschnitts in Reihenfolge, mit Zeilenkontext:
    letzter Absatz mit Fettschrift und letztes Bild seit dem letzten Bild bzw. der letzten Überschrift."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.a, self.p, self.bold, self.row, self.img, self.h = [], None, None, False, None, None, None

    def handle_starttag(self, tag, attrs):
        at = dict(attrs)
        if tag == 'a':
            self.a = [at.get('href') or '', []]
        elif tag == 'p':
            self.p, self.bold = [], False
        elif tag in ('strong', 'b'):
            self.bold = True
            if self.p is None:
                self.p = []
        elif tag == 'img':
            self.img, self.row = at.get('src'), None
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self.h, self.row, self.img = [], None, None
        elif tag == 'br':
            for x in (self.p, self.a[1] if self.a else None):
                if x is not None:
                    x.append(' ')

    def handle_endtag(self, tag):
        if tag == 'a' and self.a is not None:
            href, t = self.a
            self.a = None
            if DOC_HREF.search(href):
                self.out.append(dict(href=href, t=re.sub(r'\s+', ' ', ''.join(t)).strip(), row=self.row, img=self.img))
        elif tag == 'p' and self.p is not None:
            txt = re.sub(r'\s+', ' ', ''.join(self.p)).strip()
            if self.bold and txt:
                self.row = txt
            self.p = None
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self.h = None

    def handle_data(self, data):
        for x in (self.a[1] if self.a else None, self.p, self.h):
            if x is not None:
                x.append(data)


def html_doc_links(h):
    lp = _LinkParser()
    lp.feed(h or '')
    lp.close()
    return lp.out


def page_doc_links(p):
    """Dokumentlinks einer abgegriffenen Seite in DOM-Reihenfolge. Widgets mit „inside“ sind Kopien von Inhalten eines
    Akkordeons/Templates und werden übersprungen; Templates mit Akkordeon werden über dessen Einträge gelesen."""
    ws = p.get('widgets') or []
    inner = collections.defaultdict(list)
    for w in ws:
        if w.get('inside'):
            inner[w['inside']].append(w)
    out = []

    def add(lst, w, item=None):
        for x in lst:
            out.append(dict(x, w=w['id'], item=item, post=w['w'] == 'theme-post-content'))

    for w in ws:
        if w.get('inside'):
            continue
        k = w['w']
        if k in ('icon-list', 'pp-icon-list'):
            add([dict(href=i.get('href') or '', t=re.sub(r'\s+', ' ', i.get('t') or '').strip(), row=None, img=None)
                 for i in w.get('items') or [] if DOC_HREF.search(i.get('href') or '')], w)
        elif k in ('template', 'jet-accordion'):
            accs = [x for x in inner.get(w['id'], []) if x['w'] == 'jet-accordion'] if k == 'template' else [w]
            if accs:
                for acc in accs:
                    for it in acc.get('items') or []:
                        add(html_doc_links(it.get('html')), w, it.get('title'))
            elif w.get('html'):
                add(html_doc_links(w['html']), w)
            else:
                add([dict(href=h_, t=t_, row=None, img=None) for t_, h_ in w.get('links') or [] if DOC_HREF.search(h_)], w)
        elif k in ('theme-post-content', 'text-editor', 'html'):
            add(html_doc_links(w.get('html')), w)
        elif w.get('href') and DOC_HREF.search(w['href']):
            add([dict(href=w['href'], t=(w.get('alt') or '').strip(), row=None, img=None)], w)
    return out


def nurl(u):
    return re.sub(r'^https?://(www\.)?', 'https://', unquote(u.split('?')[0].strip()))


DOC_BY_URL = {nurl(d['url']): d for d in docs_list}
CONCAT = re.compile(r'(?:%20|\s)+(?=https?://)')


def href_part(href, plang):
    """Verkettete Links (zwei Adressen in einem href): Teil in der Sprache der Seite, sonst der letzte."""
    parts = [x for x in CONCAT.split(href.strip()) if x]
    if len(parts) > 1:
        return next((x for x in parts if file_lang_hint(os.path.basename(urlparse(x).path)) == plang), parts[-1])
    return parts[0] if parts else href


DOC_WARN = []
PAGES = {}
for p in CRAWL:
    pth = upath(p['url'])
    pl = page_lang(pth)
    links = []
    for x in page_doc_links(p):
        d = DOC_BY_URL.get(nurl(href_part(x['href'], pl)))
        if not d:
            DOC_WARN.append(f'Dokumentlink ohne Dokument: {x["href"]} auf {pth}')
            continue
        if x['post'] and links and links[-1]['doc'] is d and links[-1]['w'] == x['w']:
            links[-1]['t'] += x['t']  # ein Link, im HTML in zwei Anker zerteilt („New_facility_RIT“ + „Z_Waynesboro“)
            continue
        links.append(dict(x, doc=d))
    PAGES[pth] = dict(lang=pl, links=links, kind=p.get('kind'), title=re.sub(r'\s+-\s+RITZ\s*$', '', html.unescape(p.get('title') or '')).strip())

# ---- vis: Sprachfassungen mit Link (aus der Linkliste der Hauptseite) --------------------
VIS = collections.defaultdict(set)
AREA_LANGS = collections.defaultdict(lambda: collections.defaultdict(set))  # Dokument → Bereich → Sprachen, deren Bereichsseite es verlinkt
PAGE_DOCS = collections.defaultdict(set)  # Seite → Dokument-IDs (für den Abgleich)
for url, info in MAIN_DOCS.items():
    for pg in info['pages']:
        d = DOC_BY_URL.get(nurl(href_part(url, page_lang(pg))))
        if d:
            VIS[d['id']].add(page_lang(pg))
            PAGE_DOCS[pg].add(d['id'])
            if pg in PAGE_AREA:
                AREA_LANGS[d['id']][PAGE_AREA[pg]].add(page_lang(pg))
for pth, pg in PAGES.items():
    got = {x['doc']['id'] for x in pg['links']}
    if got != PAGE_DOCS.get(pth, set()):
        DOC_WARN.append(f'Linkliste weicht von main_docs.json ab: {pth}')

# ---- Linkarten, Typcodes der Zeilen ---------------------------------------------------
GENERIC_DS = {
    'de': {'datenblatt', 'datenblatt (englisch)', 'technisches datenblatt'},
    'en': {'data sheet', 'datasheet', 'data sheet (english)', 'datasheet (english)'},
    'fr': {'fiche de données', 'fiche technique', 'fiche technique (anglais)', 'fiche de données (anglais)'},
    'hu': {'adatlap', 'adatlap (angol)'},
    'es': {'ficha de datos', 'ficha de datos (inglés)', 'hoja de datos', 'ficha técnica'},
}
GENERIC_BR = {'de': {'produktbroschüre'}, 'en': {'product brochure'}, 'fr': {'brochure produit'}, 'hu': {'termékismertető'}, 'es': {'folleto del producto'}}
GENERIC_OTHER = {'', 'download', 'downloads', 'pdf', 'weiterlesen', 'mehr erfahren', 'hier', 'read more', 'here', 'click here', 'en savoir plus', 'cliquez ici',
                 'lire la suite', 'leer más', 'pulse aquí', 'haga clic aquí', 'tovább', 'bővebben', 'itt', 'kattintson ide'}
# Typwort je Sprache für zusammengesetzte Titel; generischer Linktext der Seite → eigene Formulierung der Seite
DS_TPL = {'de': 'Datenblatt {c}', 'en': 'Data sheet {c}', 'fr': 'Fiche de données {c}', 'hu': '{c} adatlap', 'es': 'Ficha de datos {c}'}
DS_TPL_BY_TEXT = {'fiche technique': 'Fiche technique {c}', 'fiche technique (anglais)': 'Fiche technique {c}'}
BR_TPL = {'de': 'Produktbroschüre {c}', 'en': 'Product brochure {c}', 'fr': 'Brochure produit {c}', 'hu': '{c} termékismertető', 'es': 'Folleto del producto {c}'}
DR_TPL = {'de': 'Maßzeichnung {c}{n}', 'en': 'Dimension drawing {c}{n}', 'fr': 'Plan coté {c}{n}', 'hu': '{c} méretrajz{n}', 'es': 'Plano acotado {c}{n}'}
LABEL_DS = re.compile(r'^([A-Z]{2,}[A-Z0-9]*)_([0-9][0-9\-]*)_([de])$')      # KS_50-02_d, KSO_311_e
LABEL_DR = re.compile(r'^(M\d{6})_?I\d+$')                                     # M005585_I06, M006681I2
CODE_RX = re.compile(r'^[A-Z]{2,}[A-Z0-9]*(?:\([A-Z]\))?(?:-[A-Z0-9]+)*$')
CODE_STOP = {'TYPE', 'TYP', 'TIPO', 'DIN', 'IEC', 'EN', 'DC', 'AC', 'CT', 'VT', 'CCVT', 'PQ', 'GOST', 'RITZ', 'LWL', 'TSI', 'PLC', 'II', 'III', 'IV', 'KV'}
MODEL_RX = re.compile(r'^(?:x?\d+[A-Za-z]{0,2}|\d+xx|\d+/\d+)$')               # 1082, x64, 7xx, 24D, 12/0
NUM_RX = re.compile(r'^\d+(?:[.,]\d+)?$')


def text_norm(t):
    return re.sub(r'\s+', ' ', (t or '').replace('\xa0', ' ')).strip().lower()


def file_like(t):
    """Linktext ist nur ein Dateiname/Kürzel oder eine Adresse (KS_50-02_d, Product_knowledge_compact_HVDC, https://…)."""
    s = (t or '').strip()
    return bool(re.match(r'^https?://', s) or '_' in s)


def same_text(a, b):
    k = lambda t: re.sub(r'[\W_]+', ' ', (t or '').lower()).strip()
    return bool(k(a)) and k(a) == k(b)


def link_class(x, lang, page_title=''):
    """Art eines Links: ds = Datenblatt, br = Produktbroschüre, dr = Maßzeichnung, code = nur ein Typcode („GBMW“),
    gen = generisch/Dateiname/Beitragstitel als Linktext, named = sprechender Titel."""
    t = text_norm(x['t'])
    raw = (x['t'] or '').strip()
    if t in GENERIC_DS.get(lang, ()) or LABEL_DS.match(raw):
        return 'ds'
    if t in GENERIC_BR.get(lang, ()):
        return 'br'
    if LABEL_DR.match(raw):
        return 'dr'
    if t in GENERIC_OTHER or file_like(raw) or (x['post'] and same_text(raw, page_title)):
        return 'gen'
    if CODE_RX.match(raw.split(' ')[0]) and re.match(r'^\S+(?: \S+)?$', raw) and (len(raw.split(' ')) == 1 or MODEL_RX.match(raw.split(' ')[1])):
        return 'code'
    return 'named'


def row_code(text):
    """Typcode aus der fett gesetzten Zeilenbeschriftung: „GSW 12/0 3,6 | 7,2 | 12 Stützerstromwandler …“ → („GSW 12/0“, [3,6 … 12]).
    Spannungslisten („12 | 17,5 | 24“) gehören nicht zum Code, werden aber zur Unterscheidung gleicher Codes mitgeliefert."""
    if not text:
        return None, []
    s = re.sub(r'(?<!\d),|,(?!\d)', ' , ', text.replace('\xa0', ' ').replace('|', ' | '))
    toks = s.split()
    for i, t in enumerate(toks):
        parts = [x for x in t.split('/') if x]
        if not parts or not all(CODE_RX.match(x) and x not in CODE_STOP and len(re.sub(r'[^A-Z]', '', x)) <= 7 for x in parts):
            continue
        codes, j = [], i + 1
        cur = ' / '.join(parts)
        if j < len(toks) and MODEL_RX.match(toks[j]) and not (j + 1 < len(toks) and toks[j + 1] == '|'):
            cur += ' ' + toks[j]
            j += 1
        codes.append(cur)
        while j + 1 < len(toks) and toks[j] in ('/', ',') and CODE_RX.match(toks[j + 1]) and toks[j + 1] not in CODE_STOP:
            cur, j = toks[j + 1], j + 2
            if j < len(toks) and MODEL_RX.match(toks[j]) and not (j + 1 < len(toks) and toks[j + 1] == '|'):
                cur += ' ' + toks[j]
                j += 1
            codes.append(cur)
        volts = []
        while j < len(toks) and NUM_RX.match(toks[j]):
            volts.append(toks[j])
            if j + 2 < len(toks) and toks[j + 1] == '|' and NUM_RX.match(toks[j + 2]):
                j += 2
            else:
                break
        return ' / '.join(codes), volts
    return None, []


PROD_FIRST = collections.Counter(pr['code'].split(' ')[0] for pr in products)
for pth, pg in PAGES.items():
    L = pg['links']
    for x in L:
        x['cls'] = link_class(x, pg['lang'], pg['title'])
        x['code'], x['volts'] = row_code(x['row'])
        m = LABEL_DS.match((x['t'] or '').strip())
        if m:
            x['code'] = f'{m.group(1)} {m.group(2)}'
        m = LABEL_DR.match((x['t'] or '').strip())
        x['drno'] = m.group(1) if m else None
    # Niederspannung: Zeile = Bild + Linkliste; der Datenblatt-Link der Zeile liefert den Code für die Maßzeichnung
    for x in L:
        if x['cls'] == 'dr' and not x['code']:
            x['code'] = next((y['code'] for y in L if y is not x and y['item'] == x['item'] and y['img'] == x['img'] and y['w'] == x['w']
                              and y['code'] and LABEL_DS.match((y['t'] or '').strip())), None)
    # gleiche Codes für verschiedene Dokumente auf einer Seite (VEF 12…36 / VEF 52…72,5) → Spannungsbereich ergänzen
    by_code = collections.defaultdict(set)
    for x in L:
        if x['code'] and x['row']:
            by_code[x['code']].add(x['doc']['id'])
    # ebenso, wenn der Code allein mehrere Produktfamilien bezeichnet (GI 30 / 36 und GI 52 / 72,5)
    for x in L:
        if x['code'] and x['volts'] and (len(by_code.get(x['code'], ())) > 1 or (' ' not in x['code'] and PROD_FIRST[x['code']] > 1)):
            v = x['volts']
            x['code'] = f'{x["code"]} {v[0]}…{v[-1]}' if len(v) > 1 else f'{x["code"]} {v[0]}'

# ---- Sprachfassungen einer Seite (hreflang, News-Gruppen) und Abgleich der Linklisten ------------
_dpar = {}


def _dfind(x):
    _dpar.setdefault(x, x)
    while _dpar[x] != x:
        _dpar[x] = _dpar[_dpar[x]]
        x = _dpar[x]
    return x


def _dunion(a, b):
    ra, rb = _dfind(a), _dfind(b)
    if ra != rb:
        _dpar[rb] = ra


for p in CRAWL:
    _dfind(upath(p['url']))
    for l, u in p.get('hreflang') or []:
        if l != 'x-default' and 'ritz-international.com' in u:
            _dunion(upath(p['url']), upath(u))
for n in news:
    vs = [upath(v['old']) for v in n['v'].values() if v.get('old')]
    for u in vs[1:]:
        _dunion(vs[0], u)
PAGE_GROUPS = collections.defaultdict(list)
for pth in PAGES:
    PAGE_GROUPS[_dfind(pth)].append(pth)

# Rang der Seiten (bei mehreren möglichen Gegenstücken gewinnt die wichtigere Seite): Produktbereiche, Downloads und
# Unternehmensseiten, Katalog-/Newsdownloads, News, Rest
PAGE_PRIO_KEYS = {**{k: 0 for k in PAGE_AREA_DE}, '/downloads/': 1, '/unternehmen/qualitaetsmanagement/': 1, '/unternehmen/verantwortung/': 1,
                  '/karriere/ausbildung/': 1, '/en/career/vacancies/': 1, '/en/latest-news/downloads/': 2, '/produktkataloge/': 2}
GROUP_PRIO = {}
for g, ms in PAGE_GROUPS.items():
    pr_ = [PAGE_PRIO_KEYS[m] for m in ms if m in PAGE_PRIO_KEYS]
    GROUP_PRIO[g] = min(pr_) if pr_ else (3 if any(PAGES[m]['kind'] == 'posts' for m in ms) else 4)


def _kind(x):
    return x['cls'] if x['cls'] in ('ds', 'br', 'dr') else 'x'


def _code_conflict(a, b):
    ca, cb = (a['code'] or '').split(' ')[0], (b['code'] or '').split(' ')[0]
    return bool(ca and cb and ca != cb)


def _lcs(a, b):
    n, m = len(a), len(b)
    T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            T[i][j] = T[i + 1][j + 1] + 1 if a[i] == b[j] else max(T[i + 1][j], T[i][j + 1])
    i = j = 0
    out = []
    while i < n and j < m:
        if a[i] == b[j]:
            out.append((i, j))
            i, j = i + 1, j + 1
        elif T[i + 1][j] >= T[i][j + 1]:
            i += 1
        else:
            j += 1
    return out


def align_links(A, B):
    """Paare (i, j) gleicher Stellen zweier Sprachfassungen einer Seite; leer, wo es nicht sicher ist."""
    if not A or not B:
        return [], 'leer'
    if len(A) == len(B):
        if len(A) == 1:
            return [(0, 0)], 'ein Link'
        if all(_kind(a) == _kind(b) and not _code_conflict(a, b) for a, b in zip(A, B)):
            return [(i, i) for i in range(len(A))], 'Position'
        return [], 'Linkart weicht ab'
    anchors = _lcs([x['doc']['id'] for x in A], [x['doc']['id'] for x in B])
    if not anchors:
        return [], 'Anzahl weicht ab'
    pairs = list(anchors)
    bounds = [(-1, -1)] + anchors + [(len(A), len(B))]
    for (i0, j0), (i1, j1) in zip(bounds, bounds[1:]):
        ga, gb = list(range(i0 + 1, i1)), list(range(j0 + 1, j1))
        if ga and len(ga) == len(gb) and all(_kind(A[i]) == _kind(B[j]) and not _code_conflict(A[i], B[j]) for i, j in zip(ga, gb)):
            pairs.extend(zip(ga, gb))
    return sorted(pairs), 'Anker'


_npar = {}


def _nfind(x):
    _npar.setdefault(x, x)
    while _npar[x] != x:
        _npar[x] = _npar[_npar[x]]
        x = _npar[x]
    return x


ALIGN_LOG = []
for g, ms in PAGE_GROUPS.items():
    ms = sorted(ms, key=lambda m: (SITE_LANGS.index(PAGES[m]['lang']), m))
    for i, a in enumerate(ms):
        for b in ms[i + 1:]:
            A, B = PAGES[a]['links'], PAGES[b]['links']
            if not A or not B:
                continue
            pairs, how = align_links(A, B)
            ALIGN_LOG.append((a, b, len(A), len(B), len(pairs), how))
            for ia, ib in pairs:
                ra, rb = _nfind((a, ia)), _nfind((b, ib))
                if ra != rb:
                    _npar[rb] = ra
SLOTS = collections.defaultdict(list)
for pth, pg in PAGES.items():
    for i in range(len(pg['links'])):
        SLOTS[_nfind((pth, i))].append((pth, i))


def _node(n):
    return PAGES[n[0]]['links'][n[1]]


# Typcode je Stelle: aus der deutschen Fassung (sonst EN, FR, ES, HU), damit alle Sprachen denselben Code verwenden
for nodes in SLOTS.values():
    ref = None
    for l in ('de', 'en', 'fr', 'es', 'hu'):
        ref = next((_node(n)['code'] for n in nodes if PAGES[n[0]]['lang'] == l and _node(n)['code']), None)
        if ref:
            break
    for n in nodes:
        _node(n)['slotcode'] = ref or _node(n)['code']

# ---- alt -------------------------------------------------------------------------------
DOC_SLOTS = collections.defaultdict(list)
for root, nodes in SLOTS.items():
    if len(nodes) > 1:
        for n in nodes:
            DOC_SLOTS[_node(n)['doc']['id']].append(root)
ALT = collections.defaultdict(dict)
for did_, roots in DOC_SLOTS.items():
    cand = collections.defaultdict(list)
    for root in set(roots):
        prio = GROUP_PRIO[_dfind(SLOTS[root][0][0])]
        for n in SLOTS[root]:
            x, l = _node(n), PAGES[n[0]]['lang']
            if l not in VIS[did_] and x['doc']['id'] != did_:
                cand[l].append((prio, n[0], n[1], x['doc']['id']))
    for l, cs in cand.items():
        ALT[did_][l] = min(cs)[3]

# ---- same: byte-gleiche Kopien (mehrfach hochgeladene Dateien) → ID der Kopie, die die meisten Sprachfassungen verlinkt haben ----
SAME = {}
_by_hash = collections.defaultdict(list)
for d in _main_docs:
    if os.path.exists(local_doc_path(d)):
        with open(local_doc_path(d), 'rb') as f:
            _by_hash[hashlib.md5(f.read()).hexdigest()].append(d)
for ds in _by_hash.values():
    if len(ds) > 1:
        canon = sorted(ds, key=lambda x: (-len(VIS[x['id']]), len(x['file']), x['file']))[0]
        for x in ds:
            if x is not canon:
                SAME[x['id']] = canon['id']

# ---- Produkte: alle Sprachfassungen der Datenblätter (Stellen auf Bereichsseiten und in News) -------------
DOCS_BY_ID = {d['id']: d for d in docs_list}


def doc_variants(did_):
    out = []
    for root in DOC_SLOTS.get(did_, ()):
        if GROUP_PRIO[_dfind(SLOTS[root][0][0])] not in (0, 3):
            continue
        for n in SLOTS[root]:
            o = _node(n)['doc']['id']
            if o != did_ and o not in out:
                out.append(o)
    return out


# Datenblätter der Mittelspannungsseite, deren Dateiname einen anderen Typ nennt und die daher in FAMILY_MAIN fehlen.
# Inhalt per Texterkennung geprüft: „De_VES_12_24…“ ist das Datenblatt VEF 12 | 17,5 | 24 | 36, „De_GSE_12_0_12…“ VEF 52 | 72,5,
# „De_VEN_12_72_5…“ VZF 12 | 17,5 | 24 | 36 (die alte Seite verlinkte sie in genau diesen Zeilen; englisch: En_VEF_36_, En_VEF_72.5, En_VZF)
ROW_DATASHEET = {'VEF 12…36': 'De_VES_12_24_Spannungswandler.pdf', 'VEF 52 / 72,5': 'De_GSE_12_0_12_Spannungswandler.pdf',
                 'VZF': 'De_VEN_12_72_5_Spannungswandler.pdf'}
_by_file = {d['file']: d for d in _main_docs}
for pr in products:
    fn = ROW_DATASHEET.get(pr['code'])
    if fn and fn in _by_file and _by_file[fn]['id'] not in pr['docs']:
        d = _by_file[fn]
        pr['docs'].insert(0, d['id'])
        if pr['id'] not in d['products']:
            d['products'].append(pr['id'])
        if pr['area'] not in d['areas']:
            d['areas'].append(pr['area'])

VARIANTS_ADDED = []
for pr in products:
    if not (pr.get('family') or pr['catalog'] or pr['code'] in ROW_DATASHEET):
        continue
    out = []
    for i in pr['docs']:
        out.append(i)
        if DOCS_BY_ID[i]['source'] != 'main':
            continue
        for v in doc_variants(i):
            if v not in pr['docs'] and v not in out:
                out.append(v)
                vd = DOCS_BY_ID[v]
                if pr['id'] not in vd['products']:
                    vd['products'].append(pr['id'])
                if pr['area'] not in vd['areas']:
                    vd['areas'].append(pr['area'])
                VARIANTS_ADDED.append((pr['code'], DOCS_BY_ID[i]['file'], vd['file']))
    pr['docs'] = out

# ---- tl --------------------------------------------------------------------------------
# Fehlplatzierte Links der alten Seiten: ein Dokument steht in einer Sprachfassung an einer Stelle, an der die anderen
# Fassungen ein anderes Dokument zeigen, während es selbst in diesen Fassungen an einer anderen Stelle steht
# (FR „Transformateur de courant à câble en deux parties“ → Mittelspannungskatalog; EN „SIS Flyer“ → SIS-Broschüre).
# Ihr Linktext beschreibt ein anderes Dokument und wird für Titel nicht verwendet.
MISPLACED = []
for g, ms in PAGE_GROUPS.items():
    roots_of = collections.defaultdict(set)
    for m in ms:
        for i, x in enumerate(PAGES[m]['links']):
            roots_of[x['doc']['id']].add(_nfind((m, i)))
    for m in ms:
        for i, x in enumerate(PAGES[m]['links']):
            root = _nfind((m, i))
            here = [n for n in SLOTS[root] if n[0] != m]
            if not here or any(_node(n)['doc'] is x['doc'] for n in here):
                continue
            if any(n[0] != m and _node(n)['doc'] is x['doc'] for r in roots_of[x['doc']['id']] if r != root for n in SLOTS[r]):
                x['misplaced'] = True
                MISPLACED.append((m, x['t'], x['doc']['file']))

ALLCAPS_KEEP = {'RITZ', 'EOSS', 'EU', 'PQ', 'SIS', 'SISD', 'HVDC', 'IRIS', 'USA', 'AEO', 'ISO', 'ZVEI', 'VDMA', 'GE', 'UKE', 'CO2', 'EMVI', 'IRBT'}
TITLE_TYPO = [('Accrediation', 'Accreditation'), ('Erbebensicherheit', 'Erdbebensicherheit')]


def tidy_title(t, caps=False):
    t = re.sub(r'\s+', ' ', (t or '').replace('\xa0', ' ')).strip()
    t = t.rstrip(' :') if '¡' in t else t.rstrip(' !:')  # „¡…!“ (spanisch) vollständig lassen
    for a, b in TITLE_TYPO:
        t = t.replace(a, b)
    if caps and t and not re.search(r'[a-zäöüßáéíóúőű]', t):  # GROSSGESCHRIEBENER Beitragstitel → normale Schreibung
        t = ' '.join(w if w in ALLCAPS_KEEP or not re.search(r'[A-ZÄÖÜÁÉÍÓÚŐŰ]{2,}', w) else w.lower() for w in t.split(' '))
        t = t[0].upper() + t[1:]
    return t


def composed_title(x, lang):
    code = x.get('slotcode') or x.get('code')
    if x['cls'] == 'ds' and code:
        return DS_TPL_BY_TEXT.get(text_norm(x['t']), DS_TPL[lang]).format(c=code)
    if x['cls'] == 'br' and code:
        return BR_TPL[lang].format(c=code)
    if x['cls'] == 'dr' and x['drno']:
        return re.sub(r'\s+', ' ', DR_TPL[lang].format(c=code or x['drno'], n=f' ({x["drno"]})' if code else '')).strip()
    if x['cls'] == 'code':
        return DS_TPL[lang].format(c=x['t'].strip()) if x['doc']['type'] == 'datasheet' else x['t'].strip()
    return None


def product_code_title(d, lang):
    """Generischer Link ohne Zeile (z. B. „DATENBLATT“ auf der DUROMER-Seite, Beitragstitel als Linktext): Code des Produkts."""
    codes = sorted({pr['code'] for pr in products if pr['id'] in d['products']})
    if len(codes) == 1 and d['type'] == 'datasheet':
        return DS_TPL[lang].format(c=codes[0])
    return None


TL = {}
TL_HOW = collections.Counter()
TL_LOG = []
for d in docs_list:
    if d['source'] != 'main':
        continue
    tl = {}
    nodes = [(pth, i) for pth, pg in PAGES.items() for i, x in enumerate(pg['links']) if x['doc'] is d]
    for l in SITE_LANGS:
        if l not in VIS[d['id']]:
            continue
        mine = [n for n in nodes if PAGES[n[0]]['lang'] == l]
        mine.sort(key=lambda n: (GROUP_PRIO[_dfind(n[0])], n[0], n[1]))
        ok = [n for n in mine if not _node(n).get('misplaced')]
        src = TSRC.get((d['url'], l))
        t, how, caps = None, None, False
        if l in ('de', 'en') and src in ('override', 'catalog') and d['title'].get(l) and not (
                src == 'catalog' and re.match(r'^(Datasheet|Datenblatt) ', d['title'][l]) and any(composed_title(_node(n), l) for n in ok)):
            t, how = d['title'][l], 'Titel (gepflegt)'  # „Datasheet X“ aus dem Katalog: Schreibweise der Seite („Data sheet X“) bevorzugen
        if not t:
            named = [_node(n)['t'] for n in ok if _node(n)['cls'] == 'named']
            if named:
                t, how = max(named, key=len), 'Linktext'
        if not t:
            t = next((composed_title(_node(n), l) for n in ok if composed_title(_node(n), l)), None)
            how = 'Typ + Code' if t else None
        if not t:
            t = product_code_title(d, l)
            how = 'Typ + Produktcode' if t else None
        if not t and l in ('de', 'en') and d['title'].get(l) and src not in ('file', 'family', None):
            t, how = d['title'][l], 'Titel'
        if not t:  # Linktext derselben Stelle in dieser Sprachfassung (Dokument an anderer Stelle derselben Seite verlinkt)
            named = [_node(n)['t'] for r in DOC_SLOTS.get(d['id'], ()) for n in SLOTS[r]
                     if PAGES[n[0]]['lang'] == l and _node(n)['cls'] == 'named' and not _node(n).get('misplaced')]
            if named:
                t, how = max(named, key=len), 'Linktext derselben Stelle'
        if not t:
            post = next((n[0] for n in mine if PAGES[n[0]]['kind'] == 'posts' and PAGES[n[0]]['title']), None)
            if post:
                en_title = next((PAGES[m]['title'] for m in PAGE_GROUPS[_dfind(post)] if PAGES[m]['lang'] == 'en' and PAGES[m]['kind'] == 'posts'), None)
                if l != 'en' and tl.get('en') and same_text(PAGES[post]['title'], en_title):
                    t, how = tl['en'], 'Titel EN (Beitrag unübersetzt)'
                else:
                    t, how, caps = PAGES[post]['title'], 'Beitragstitel', True
        if not t:
            t = tl.get('en') or tl.get('de') or d['title'].get('en') or d['title'].get('de')
            how = 'Titel EN/DE' if t else None
        if not t:
            t, how = prettify(d['file']), 'Dateiname'
        tl[l] = tidy_title(t, caps)
        TL_HOW[how] += 1
        TL_LOG.append((d['file'], l, how, tl[l]))
    TL[d['id']] = tl

for d in docs_list:
    if d['source'] == 'main':
        d['vis'] = sorted(VIS[d['id']])
        d['tl'] = TL[d['id']]
        d['alt'] = {l: ALT[d['id']][l] for l in SITE_LANGS if l in ALT[d['id']]}
        d['areaLangs'] = {a: sorted(AREA_LANGS[d['id']][a]) for a in d['areas'] if AREA_LANGS[d['id']].get(a)}
        if d['id'] in SAME:
            d['same'] = SAME[d['id']]

for w in DOC_WARN:
    print('WARNUNG', w)
for m, t, fn in MISPLACED:
    print(f'Fehlplatzierter Link auf der alten Seite (Linktext nicht als Titel verwendet): {m} „{t}“ → {fn}')
_src = {d['file']: d['source'] for d in docs_list}
for _s, _label in (('main', 'Hauptseite'), ('produkte', 'Produktfinder')):
    _ch = sorted((x for x in LANG_CHANGES if _src.get(x[0]) == _s), key=lambda x: x[0].lower())
    print(f'Inhaltssprache geändert – {_label}: {len(_ch)} Dokumente (Datei: alt → neu, Quelle)')
    for fn, a, b, how in _ch:
        print(f'  {fn}: {a} → {b}  ({how})')
print('Dokumente sichtbar je Sprache:', {l: sum(1 for d in docs_list if l in d.get('vis', ())) for l in SITE_LANGS})
print('Titel je Sprache – Herkunft:', dict(TL_HOW))
print('Gegenstücke (alt):', sum(len(d.get('alt') or {}) for d in docs_list), 'in', sum(1 for d in docs_list if d.get('alt')), 'Dokumenten;',
      'Sprachvarianten zu Produkten ergänzt:', len(VARIANTS_ADDED))


# --------------------------------------------------------------------------------------
# Schreiben
# --------------------------------------------------------------------------------------
used_imgs = set()
for pr in products:
    used_imgs.update(pr['images'])
for n in news:
    if n['image']:
        used_imgs.add(n['image'])
    used_imgs.update(n['images'])

# Katalogprodukte (ohne generierte Kurzbezeichnung): Namen auch auf Französisch, Ungarisch, Spanisch
N_ = '\u00a0'
NAME_I18N = {
    'ivo': ('Transformateur de tension pour l’extérieur à isolation papier-huile', 'Olaj-papír szigetelésű kültéri feszültségváltó', 'Transformador de tensión para exterior con aislamiento de papel-aceite'),
    'ico': ('Transformateur de courant pour l’extérieur à isolation papier-huile', 'Olaj-papír szigetelésű kültéri áramváltó', 'Transformador de corriente para exterior con aislamiento de papel-aceite'),
    'cmo': ('Transformateur combiné à isolation papier-huile (TC/TT)', 'Olaj-papír szigetelésű kombinált mérőváltó (áram- és feszültségváltó)', 'Transformador combinado con aislamiento de papel-aceite (TC/TT)'),
    'cvo': ('Transformateur de tension capacitif (CCVT)', 'Kapacitív feszültségváltó (CCVT)', 'Transformador de tensión capacitivo (CCVT)'),
    'sis': (f'Système de jeux de barres entièrement isolé jusqu’à 40,5{N_}kV / 8\u202f000{N_}A', f'Teljesen szigetelt áramvezető sín rendszer 40,5{N_}kV / 8000{N_}A-ig', f'Sistema de barras totalmente aislado hasta 40,5{N_}kV / 8000{N_}A'),
    'sisd': (f'Traversées jusqu’à 72,5{N_}kV / 5\u202f000{N_}A', f'Átvezetők 72,5{N_}kV / 5000{N_}A-ig', f'Pasatapas hasta 72,5{N_}kV / 5000{N_}A'),
    'gbvba': ('Boîte de distribution de câbles protégée contre les contacts', 'Érintésbiztos kábelelosztó doboz', 'Caja de distribución de cables a prueba de contacto'),
    'giessharzsysteme': ('Systèmes de résine coulée, pièces moulées et pièces isolantes', 'Öntött gyanta rendszerek, formadarabok és szigetelő alkatrészek', 'Sistemas de resina colada, piezas moldeadas y piezas aislantes'),
    'egiw-x45': ('Transformateur de tension électronique avec amplificateur d’isolement', 'Elektronikus feszültségváltó leválasztó erősítővel', 'Transformador de tensión electrónico con amplificador de aislamiento'),
    'evba-06': ('Amplificateur tampon (électronique autonome)', 'Pufferelő erősítő (önálló elektronika)', 'Amplificador búfer (electrónica autónoma)'),
    'eoss-122': ('Protection contre la tension en circuit ouvert pour transformateurs de courant', 'Nyitott áramkörű feszültségvédelem áramváltókhoz', 'Protección contra tensión de circuito abierto para transformadores de corriente'),
    'emvi-4005': (f'Transformateur de courant électronique pour courants continus et alternatifs jusqu’à 12\u202f000{N_}A', f'Elektronikus áramváltó egyen- és váltakozó áramhoz 12{N_}000{N_}A-ig', f'Transformador de corriente electrónico para corrientes continuas y alternas hasta 12{N_}000{N_}A'),
    'zusatzbuerde': ('Charge additionnelle pour transformateurs de mesure', 'Kiegészítő terhelés mérőváltókhoz', 'Carga adicional para transformadores de medida'),
    'gbmw': ('Nouveau type de transformateur dans la gamme moyenne tension', 'Új mérőváltótípus a középfeszültségű kínálatban', 'Nuevo tipo de transformador en la gama de media tensión'),
    'gbmei': ('Nouveau type de transformateur dans la gamme moyenne tension', 'Új mérőváltótípus a középfeszültségű kínálatban', 'Nuevo tipo de transformador en la gama de media tensión'),
}
for pr in products:
    if pr['id'] in NAME_I18N:
        fr_, hu_, es_ = NAME_I18N[pr['id']]
        pr['name'].update(fr=fr_, hu=hu_, es=es_)
json.dump(products, open(f'{OUT}/products.json', 'w'), ensure_ascii=False)
json.dump(docs_list, open(f'{OUT}/docs.json', 'w'), ensure_ascii=False)
json.dump(news, open(f'{OUT}/news.json', 'w'), ensure_ascii=False)
json.dump(jobs, open(f'{OUT}/jobs.json', 'w'), ensure_ascii=False)
json.dump(IMG, open(f'{OUT}/images.json', 'w'), ensure_ascii=False)
json.dump(oldurls, open(f'{OUT}/oldurls.json', 'w'), ensure_ascii=False, indent=0)
json.dump(AUDIT, open(f'{OUT}/audit.json', 'w'), ensure_ascii=False, indent=1)

print('products', len(products), 'catalog', sum(p['catalog'] for p in products))
print('docs', len(docs_list), collections.Counter(d['type'] for d in docs_list))
print('docs lang', collections.Counter(d['lang'] for d in docs_list))
print('news', len(news), collections.Counter(len(n['v']) for n in news))
print('jobs', len(jobs), 'oldurls', len(oldurls), 'images', len(IMG), 'used', len(used_imgs))
print('audit', {k: len(v) for k, v in AUDIT.items()})
print('products without image', sum(1 for p in products if not p['images']))
