#!/usr/bin/env python3
"""Normalize scraped Magento products (DE/EN) into the new RITZ product data model.

Input : raw/products.json, raw/pextra.json (categories), raw/img/pimg/_index.json (optional)
Output: site/src/data/products.json, site/src/data/product_categories.json
"""
import json, re, html, collections, os, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)

RAW = os.path.join(ROOT, 'raw')
OUT = os.path.join(ROOT, 'site', 'src', 'data')
os.makedirs(OUT, exist_ok=True)

P = json.load(open(f'{RAW}/products.json'))
X = json.load(open(f'{RAW}/pextra.json'))
CATS = X['cats']
IMGIDX = {}
if os.path.exists(f'{RAW}/img/pimg/_index.json'):
    IMGIDX = json.load(open(f'{RAW}/img/pimg/_index.json'))

by = collections.defaultdict(dict)
for p in P:
    by[p['pid']][p['lang']] = p


def clean_text(h):
    if not h:
        return ''
    h = re.sub(r'<h2>\s*Details\s*</h2>', ' ', h, flags=re.I)
    h = re.sub(r'<br\s*/?>', '\n', h)
    h = re.sub(r'</(p|li|div|h\d)>', '\n', h)
    t = re.sub(r'<[^>]+>', ' ', h)
    t = html.unescape(t)
    t = re.sub(r'[ \t\xa0]+', ' ', t)
    t = re.sub(r' *\n *', '\n', t)
    t = re.sub(r'\n{2,}', '\n', t)
    return t.strip()


def slugify(s):
    s = s.replace('ß', 'ss').replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return re.sub(r'-{2,}', '-', s)


def num(s):
    """parse first decimal number (German comma)"""
    m = re.search(r'(\d+(?:[.,]\d+)?)', s.replace(' ', '').replace(' ', ''))
    if not m:
        return None
    return float(m.group(1).replace(',', '.'))


# ---------------------------------------------------------------- type code extraction
DESC_WORDS = r'(Innenraum|Inneraum|Indoor|Freiluft|Outdoor|Elektronischer|Electronic|Spannungssensor|Stromsensor|Rohrstab|metallgekapselt|Metal|explosions|Kippschwingungs|Wirkleistungsdrossel|Passiver|Zweipoliger|Low|Voltage|Current|Tube|Ring|Summen|Zwischen|BasicLine|berstsicherer|Blockkombi|Kombi)'

CODE_OVERRIDES = {
    '98': 'KS…', '102': 'KSW…', '100': 'KSO 311 / KSS 382', '101': 'KSO 52 / KSS 52',
    '301': 'DE (Innenraum)', '302': 'DE (Freiluft)', '303': 'ZGSWD 250', '338': 'GBEA 72,5 VT',
    '86': 'GBEI(N) / GBEA(N)', '80': 'KGBEI / KGBEA', '79': 'KGBEA / KGBEI PQ', '92': 'TGBZI / TGBZA',
    '304': 'TGBZA 24W / 36W', '313': 'GSES 12D / 24D F', '56': 'GSES 12D / 24D', '82': 'GSES 12D / 24D PQ',
    '63': 'GSWS 12 / 24', '108': 'GSWS 12D / 24D', '81': 'GSWS 24 PQ', '36': 'IGE 0,5', '45': 'eA10A',
    '25': 'RBLCT 12 / 17,5 / 24', '93': 'GSZ 10 / 20 E', '76': 'GSZ 10 / 20', '73': 'GSZ 12/0', '57': 'GSE 10 / 20 / 30',
    '58': 'GSE 12/0', '94': 'GSZS 24 E', '77': 'GSZS 12 / 24', '95': 'GZ 24 E', '96': 'GZ 36 E', '74': 'GZ 12 / 24 / 36',
    '89': 'GSW 45 / 72,5', '88': 'GSWF 10…72,5', '87': 'GSWFK 10…72,5', '22': 'GSW 3,6 / 12/0', '19': 'GSW 10 / 20 / 30',
    '114': 'ZKSW 60…300', '220': 'ZKSW 60', '224': 'ZKSW 800', '221': 'SKSW 100', '222': 'SKSW 100s',
    '223': 'SKSW 300', '225': 'SKSW 800', '91': 'UGSS 704 / 710', '106': 'UGSSF(B) 704 / 710', '227': 'KSR 60 / 62',
    '105': 'GSEFB 15…25', '84': 'GSEFBC 15…25', '107': 'GSOFB', '104': 'GSE 45 Bahn', '61': 'GSEF 10…45',
    '316': 'VEF 52 / 72,5', '318': 'VEF 12…36', '314': 'GIF 12…72,5', '41': 'GIFK', '42': 'GIFS', '21': 'ASS',
    '28': 'ASN', '67': 'ASX', '29': 'GI 52 / 72,5', '68': 'GI 30 / 36', '32': 'GIS 12 / 24', '27': 'GS 12 / 24 / 36',
    '66': 'GE 12 / 24 / 36', '17': 'GBW', '34': 'GDS 10…36', '33': 'GDW 12 / 24', '35': 'IGD 36', '31': 'GSS 10 / 20',
    '30': 'GSSO 12 / 17,5 / 24', '38': 'GTDS(O)', '39': 'GTDS(O)F', '40': 'GTDS(O)FI', '51': 'IRB', '53': 'IRBT',
    '52': 'LGSO 10…30', '109': 'KGSF', '83': 'KIVF', '55': 'VEN', '319': 'VES', '70': 'VZF', '71': 'VZN', '72': 'VZS',
    '78': 'GSZF 10 / 20 / 30', '335': 'TGZ 20', '324': 'ABS', '310': 'GBERA 12…36', '320': 'GSR 27 / 38',
    '307': 'GSER 3', '309': 'GSER(F) 16', '311': 'GSER(F) 52', '113': 'MGTK 12 / 24', '331': 'MGTK-V',
    '312': 'EGIW x64', '321': 'EGIW x85', '323': 'EMWI 7xx', '322': 'EVBA x06', '288': 'KSER 100',
    '299': 'MKSER 200', '300': 'MKSZR 200', '284': 'KSW 300', '285': 'LKS 104', '99': 'KSW 52',
    '110': 'KSOH 1555', '111': 'KSOH 2212', '112': 'KSOHO 3411', '327': 'KSOH-S 1082', '328': 'MKSOH-S 1082',
    '336': 'KSR-S 60', '330': 'RKU-S 2012', '329': 'UGSS-S 104', '231': 'KSO 100', '230': 'KSO 70',
}


def extract_code(pid, name):
    if pid in CODE_OVERRIDES:
        return CODE_OVERRIDES[pid]
    m = re.match(r'^(.*?)\s+' + DESC_WORDS, name)
    code = m.group(1) if m else name.split(' ')[0]
    code = code.replace('...', '…').strip(' ,|')
    code = re.sub(r'\s*\|\s*', ' / ', code)
    return code


# ---------------------------------------------------------------- classification helpers
def has(text, *words):
    t = text.lower()
    return any(w.lower() in t for w in words)


def classify(de, en, cats_de):
    n = de['name']
    nl = n.lower()
    attrs = {a[0]: a[1] for a in de['attrs']}
    catstr = ' | '.join(cats_de).lower()
    # area
    if 'elektronik und sensoren' in catstr or has(n, 'Sensor', 'Elektronischer'):
        area = 'elektronik-sensoren'
    elif 'mittelspannung' in catstr:
        area = 'mittelspannung'
    elif 'niederspannung' in catstr:
        area = 'niederspannung'
    elif has(n, 'Niederspannung', 'Kippschwingung', 'Wirkleistungsdrossel'):
        area = 'niederspannung'
    else:
        area = 'mittelspannung'
    # kind
    if has(n, 'Kippschwingungs', 'Wirkleistungsdrossel'):
        kind = 'damping'
    elif has(n, 'Blockkombi-Sensor', 'Kombisensor'):
        kind = 'combi-sensor'
    elif has(n, 'Stromsensor'):
        kind = 'current-sensor'
    elif has(n, 'Spannungssensor', 'Kleinsignal-Spannungswandler'):
        kind = 'voltage-sensor'
    elif has(n, 'Elektronischer Stromwandler'):
        kind = 'electronic-ct'
    elif has(n, 'Elektronischer Spannungswandler'):
        kind = 'electronic-vt'
    elif has(n, 'Kombiwandler', 'Kombi-Wandler') or nl.startswith('kgb') or nl.startswith('kgsf') or nl.startswith('kivf'):
        kind = 'combined'
    elif has(n, 'Spannungswandler', 'voltage transformer', 'VT (conv'):
        kind = 'vt'
    else:
        kind = 'ct'
    # installation
    inst = []
    if has(n, 'Freiluft', 'Outdoor') or attrs.get('Freiluft') == 'Ja' or 'freiluft' in catstr:
        inst.append('outdoor')
    if has(n, 'Innenraum', 'Inneraum', 'Indoor') or attrs.get('Innenraum') == 'Ja' or 'innenraum' in catstr:
        inst.append('indoor')
    if not inst:
        inst = ['indoor']
    # forms
    form = set()
    F = [
        ('support', ['Stützer', 'Stuetzer']), ('block', ['Blockwandler', 'Blockausführung', 'Block']),
        ('bushing', ['Durchführung', 'Duchrchführung']), ('bar', ['Stabstromwandler', 'Stab-Strom']),
        ('window', ['Aufsteck']), ('split-core', ['Kabelumbau', 'zweiteilig', 'teilbar', 'Split-Core']),
        ('wound', ['Wickel']), ('ring-core', ['Ringkern']), ('tube-bar', ['Rohrstab']), ('busbar', ['Schienen-Stromwandler', 'Schienen-']),
        ('summation', ['Summen']), ('interposing', ['Zwischen-Strom']), ('threading', ['Fädel']), ('frame', ['Rahmen']),
        ('cascade', ['Kaskaden']), ('head', ['Kopfbauform', 'Kopf-Bauform']), ('metal-clad', ['metallgekapselt']),
        ('laboratory', ['Labor', 'Vielfach']), ('high-current', ['Hochstrom']), ('tur', ['TuR', 'TUR']),
        ('three-phase', ['3-Phasen']), ('two-pole', ['zweipolig']), ('single-pole', ['einpolig']),
        ('narrow', ['schmale Bauform', 'schmal']), ('large', ['große Bauform', 'große Bau']), ('small', ['kleine Bauform']),
    ]
    for key, words in F:
        if has(n, *words) or any(w.lower() in catstr for w in words if len(w) > 5):
            form.add(key)
    if attrs.get('zweipolig isoliert') == 'Ja':
        form.add('two-pole')
    if attrs.get('metallgekapselt') == 'Ja':
        form.add('metal-clad')
    # applications / special features
    app = set()
    if has(n, 'Bahn', 'rolling') or 'bahnwandler' in catstr or attrs.get('rolling stock') == 'Ja':
        app.add('rail')
    if has(n, 'Generator') or 'generatorwandler' in catstr or attrs.get('für Einsatz am Generator') == 'Ja':
        app.add('generator')
    if has(n, 'PQ', '9 kHz', 'Breitband') or 'speziell für pq' in catstr or attrs.get('PQ-Messung') == 'Ja':
        app.add('power-quality')
    if has(n, 'explosionsgeschützt', 'eA10A') or attrs.get('exgeschützt') == 'Ja' or 'atex' in catstr:
        app.add('ex-protection')
    if attrs.get('im Bergwerkseinsatz') == 'Ja':
        app.add('mining')
    if has(n, 'Eigenversorgung') or 'eigenversorgung' in catstr:
        app.add('auxiliary-supply')
    if attrs.get('Erdschlußerfassung') == 'Ja' or has(n, 'Erdschluss'):
        app.add('earth-fault')
    if attrs.get('berührungssicher') == 'Ja' or has(n, 'berührungssicher'):
        app.add('touch-proof')
    if attrs.get('Konformitätserkl./Beglaubigungsfähig') == 'Ja':
        app.add('verifiable')
    if has(n, 'Labor') or 'labor' in catstr:
        app.add('laboratory')
    if kind in ('current-sensor', 'voltage-sensor', 'combi-sensor'):
        app.add('lpit')
    if kind in ('electronic-ct', 'electronic-vt'):
        app.add('dc-measurement')
    if attrs.get('NS Mess-Wandler') == 'Ja' or attrs.get('MS Mess-Wandler') == 'Ja':
        app.add('metering')
    if attrs.get('NS Schutz-Wandler') == 'Ja' or attrs.get('MS-Schutz-Wandler') == 'Ja':
        app.add('protection')
    return area, kind, inst, sorted(form), sorted(app)


def made_in(attrs):
    v = attrs.get('Herstellungsort', '')
    for c, k in [('Germany', 'DE'), ('Austria', 'AT'), ('Hungary', 'HU'), ('China', 'CN'), ('USA', 'US')]:
        if c.lower() in v.lower():
            return k
    if attrs.get('Made in Austria') == 'Ja':
        return 'AT'
    if attrs.get('Made in Germany') == 'Ja':
        return 'DE'
    return None


CLASS_RX = re.compile(r'(0[.,]1|0[.,]2S|0[.,]2|0[.,]5S|0[.,]5|1|3|5P|10P|3P|6P|PX|PR|TPY|TPX|TPZ|5|10)', re.I)


def norm_class(v):
    v = v.replace(',', '.').upper().replace(' ', '')
    out = set()
    for tok in re.split(r'[/;+&]|UND|AND', v):
        m = re.match(r'^(0\.1|0\.2S|0\.2|0\.5S|0\.5|1|3|5P|10P|3P|6P|PX|PR|TPY|TPX|TPZ)', tok)
        if m:
            out.add(m.group(1))
    return out


def parse_options(de):
    """derive technical facets from configurator options (DE titles)"""
    f = {'um': set(), 'ipr': [], 'isr': set(), 'upr': [], 'cls': set(), 'ith': [], 'freq': set(), 'std': set(), 'weeks': [], 'cores': [], 'burden': [], 'usr': set()}
    for o in de['options']:
        t = o['title'].lower()
        vals = [re.sub(r"\s*\$\(\s*'options_.*$", '', v[1], flags=re.S).strip() for v in o['values']]  # mitgelesenes Inline-Skript entfernen
        if any(k in t for k in ['isolationsniveau', 'isolationspegel', 'spannungsreihe', 'isolationslevel', 'bemessungs-isoionspegel', 'spannungsebene', 'isolationsniveau (kv)']) and 'sekundär' not in t:
            for v in vals:
                x = num(v)
                if x is not None and 0.1 <= x <= 600:
                    f['um'].add(x)
            m = re.search(r'um\s*(\d+[.,]?\d*)\s*kv', t)
            if m:
                f['um'].add(float(m.group(1).replace(',', '.')))
        elif ('primärstrom' in t or 'primary current' in t or 'bem.-primärstrom' in t or 'bemessungs-primärstrom' in t) and 'faktor' not in t:
            for v in vals:
                if re.search(r'andere|sonder|eintragen|bitte', v, re.I):
                    continue
                x = num(v)
                if x is not None:
                    f['ipr'].append(x)
        elif 'sekundärstrom' in t:
            for v in vals:
                x = num(v)
                if x in (1.0, 5.0, 2.0, 0.5):
                    f['isr'].add(x)
        elif 'primärspannung' in t:
            for v in vals:
                if re.search(r'andere|sonder', v, re.I):
                    continue
                x = num(v.replace('.', ''))
                m = re.search(r'(\d[\d.]*)\s*(?:/|:)', v)
                if m:
                    x = float(m.group(1).replace('.', ''))
                if x:
                    f['upr'].append(x)
        elif 'sekundärspannung' in t:
            for v in vals:
                if re.search(r'andere|sonder', v, re.I):
                    continue
                f['usr'].add(v.replace(' ', ''))
        elif 'genauigkeit' in t or 'genauigkeitskalsse' in t:
            for v in vals:
                f['cls'] |= norm_class(v)
        elif 'kurzzeitstrom' in t or 'kurtzzeitstrom' in t or 'icth' in t:
            for v in vals:
                if 'x' in v.lower() and 'in' in v.lower():
                    continue
                x = num(v)
                if x is not None and x <= 200:
                    f['ith'].append(x)
        elif 'frequenz' in t:
            for v in vals:
                for x in re.findall(r'(\d+[.,]?\d*)', v):
                    f['freq'].add(float(x.replace(',', '.')))
        elif 'norm' in t or 'standard' in t:
            for v in vals:
                for s in ['IEC', 'IEEE', 'ANSI', 'AS', 'GOST', 'VDE', 'DIN', 'BS', 'CSA', 'EN', 'GB', 'NBR']:
                    if re.search(r'\b' + s + r'\b', v):
                        f['std'].add(s)
        elif 'liefer' in t:
            for v in vals:
                x = num(v)
                if x:
                    f['weeks'].append(x)
        elif 'anzahl kerne' in t or 'anzahl der kerne' in t or 'anzahl sekundärwicklungen' in t:
            for v in vals:
                x = num(v)
                if x:
                    f['cores'].append(x)
        elif 'leistung (va)' in t or 'nennleistung' in t or 'bürde' in t:
            for v in vals:
                x = num(v)
                if x is not None and x < 2000:
                    f['burden'].append(x)
    return f


def doc_type(title, href):
    t = (title + ' ' + href).lower()
    if re.search(r'maßblatt|massblatt|outline|dimension|zeichnung|drawing|mm\d{4,}|m00\d{4}', t):
        return 'drawing'
    if re.search(r'konformit|declaration|zertifikat|certificate|bescheinig', t):
        return 'certificate'
    if re.search(r'katalog|catalog|catalogue|prospekt|brochure|broschüre|flyer|infomaterial', t):
        return 'catalog'
    if re.search(r'anleitung|manual|instruction|montage|installation|betrieb', t):
        return 'manual'
    if re.search(r'daten|data ?sheet|datasheet|technische|tdb\d', t):
        return 'datasheet'
    if re.search(r'prüf|test ?report|type test', t):
        return 'test-report'
    return 'document'


def doc_lang(title, href):
    t = title.lower()
    h = href.lower().rsplit('/', 1)[-1]
    de = bool(re.search(r'datenblatt|maßblatt|deutsch|katalog\b|ger\b|_ger|-ger|_de\b|_de[_.-]|^de[_-]|_d\.pdf|-d\.pdf', t + ' ' + h))
    en = bool(re.search(r'data ?sheet|outline|english|englisch|catalog\b|_en\b|_en[_.-]|^en[_-]|eng\b|-eng|_e\.pdf', t + ' ' + h))
    if 'ger-eng' in h or 'de_en' in h or 'de-en' in h:
        return 'de+en'
    if de and en:
        return 'de+en'
    if de:
        return 'de'
    if en:
        return 'en'
    return ''


def size_bytes(meta):
    m = re.search(r'\(([\d.,]+)\s*(KB|MB|B)\)', meta or '')
    if not m:
        return None
    v = float(m.group(1).replace(',', ''))
    return int(v * {'B': 1, 'KB': 1024, 'MB': 1024 * 1024}[m.group(2)])


def ukey(u):
    k = u.rsplit('/', 1)[-1].replace('.html', '')
    return re.sub(r'-\d+$', '', k)


# product -> categories (DE)
cat_of = collections.defaultdict(list)
cat_nodes = {}
for c in CATS:
    if c['lang'] != 'de':
        continue
    path = c.get('crumbs', [])[1:] or [c.get('title')]
    key = ' > '.join(path)
    cat_nodes[key] = {'path': path, 'url': c['url'], 'count': len(c['products'])}
    for u in c['products']:
        cat_of[ukey(u)].append(key)

# EN category paths (by matching url structure order) -> map de path to en title via same product sets
en_cat = {}
for c in CATS:
    if c['lang'] == 'en':
        en_cat[tuple(sorted(c['products']))] = c

products = []
used_slugs = set()
for pid, d in sorted(by.items(), key=lambda kv: int(kv[0])):
    de, en = d['de'], d['en']
    cats_de = sorted(set(cat_of.get(ukey(de['url']), [])))
    area, kind, inst, form, app = classify(de, en, cats_de)
    attrs_de = {a[0]: a[1] for a in de['attrs']}
    code = extract_code(pid, de['name'])
    slug = slugify(code.replace('…', '-').replace('/', ' '))
    if slug in used_slugs:
        slug = slug + '-' + pid
    used_slugs.add(slug)
    f = parse_options(de)
    um = sorted(f['um'])
    if not um and area == 'niederspannung':
        um = [0.72]
    ipr = [min(f['ipr']), max(f['ipr'])] if f['ipr'] else None
    upr = [min(f['upr']), max(f['upr'])] if f['upr'] else None
    ith = [min(f['ith']), max(f['ith'])] if f['ith'] else None
    weeks = [min(f['weeks']), max(f['weeks'])] if f['weeks'] else None
    burden = [min(f['burden']), max(f['burden'])] if f['burden'] else None
    cores = int(max(f['cores'])) if f['cores'] else None
    # docs
    docs = []
    for a in de['attachments']:
        docs.append({'title': a['title'].strip(), 'url': a['href'], 'type': doc_type(a['title'], a['href']), 'lang': doc_lang(a['title'], a['href']), 'size': size_bytes(a['meta'])})
    # images
    imgs = []
    for u in de['images']:
        key = u.replace('https://produkte.ritz-international.com/media/catalog/product/', '')
        meta = IMGIDX.get(key)
        imgs.append({'src': u, 'key': key, 'file': meta['file'] if meta else None, 'w': meta['w'] if meta else None, 'h': meta['h'] if meta else None})
    # options per language (same structure, ids)
    def opts(p):
        return [{'id': re.search(r'\[(\d+)\]', o['name']).group(1) if o['name'] and re.search(r'\[(\d+)\]', o['name']) else None,
                 'title': re.sub(r'\s+', ' ', o['title']).strip(), 'type': o['type'], 'required': o['required'],
                 'values': [[v[0], v[1]] for v in o['values']]} for o in p['options']]
    conf = de.get('optConf') or {}
    product = {
        'pid': int(pid), 'slug': slug, 'code': code, 'area': area, 'kind': kind, 'install': inst, 'form': form, 'apps': app,
        'um': um, 'ipr': ipr, 'isr': sorted(f['isr']), 'upr': upr, 'usr': sorted(f['usr']), 'classes': sorted(f['cls']),
        'ith': ith, 'freq': sorted(f['freq']), 'std': sorted(f['std']), 'weeks': weeks, 'cores': cores, 'burden': burden,
        'made': made_in(attrs_de), 'cats': cats_de,
        'images': imgs, 'docs': docs,
        'deps': {k: conf.get(k) for k in ['sortedOIds', 'isRequired', 'notDepVIdsByOId', 'cOIdsByVId', 'cVIdsByVId', 'cOIdsByOId'] if conf.get(k) is not None},
        'notes': {k: conf.get(k) for k in ['note', 'description'] if conf.get(k)},
        'i18n': {},
        'source': {'de': de['url'], 'en': en['url']},
    }
    for lang, p in (('de', de), ('en', en)):
        product['i18n'][lang] = {
            'name': p['name'].strip(),
            'title': p['title'],
            'metaDesc': p.get('metaDesc') or '',
            'short': clean_text(p['shortHtml']),
            'desc': clean_text(p['descHtml']),
            'attrs': [[a[0].strip(), a[1].strip()] for a in p['attrs']],
            'options': opts(p),
        }
    products.append(product)

json.dump(products, open(f'{OUT}/products_raw.json', 'w'), ensure_ascii=False, indent=1)
print('products', len(products))
print('areas', collections.Counter(p['area'] for p in products))
print('kinds', collections.Counter(p['kind'] for p in products))
print('made', collections.Counter(p['made'] for p in products))
print('no um', [p['code'] for p in products if not p['um']][:40])
print('forms', collections.Counter(f for p in products for f in p['form']).most_common())
print('apps', collections.Counter(f for p in products for f in p['apps']).most_common())
print('classes', collections.Counter(c for p in products for c in p['classes']).most_common())
print('std', collections.Counter(c for p in products for c in p['std']).most_common())
print('freq', collections.Counter(c for p in products for c in p['freq']).most_common())
print('doc types', collections.Counter(d['type'] for p in products for d in p['docs']).most_common())
print('doc langs', collections.Counter(d['lang'] for p in products for d in p['docs']).most_common())
