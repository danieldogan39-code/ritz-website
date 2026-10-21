#!/usr/bin/env python3
"""Build contacts.json: locations, product-area people, representatives (with coordinates)."""
import json, re, collections, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)

RAW = os.path.join(ROOT, 'raw')
OUT = os.path.join(ROOT, 'site', 'src', 'data')
X = json.load(open(f'{RAW}/tplmedia.json'))
T = X['tpls']

# ---- coordinates from map markers (template 1368)
coords = {}
for lang in ['de', 'en']:
    for m in T[f'{lang}:1368']['maps']:
        for mk in json.loads(m['markers'] or '[]'):
            coords[str(mk['id'])] = (round(mk['latLang']['lat'], 5), round(mk['latLang']['lng'], 5))


def lines(s):
    return [l.strip() for l in (s or '').split('\n') if l.strip()]


# ---- locations (Standorte) from nested templates of 1368 + production info 2279
LOC_TPL = {'1436': 'DE', '1450': 'AT', '1453': 'HU', '1456': 'CN', '1459': 'US', '1462': 'AE'}
loc_items = {}
for lang in ['de', 'en']:
    for tpl, cc in LOC_TPL.items():
        for it in T[f'{lang}:{tpl}']['listingItems']:
            f = [x for x in it['fields'] if x]
            route = next((l[1] for l in it['links'] if l[1] and 'goo.gl' in l[1]), None)
            e = loc_items.setdefault(it['postId'], {'cc': cc})
            e[lang] = f
            e['route'] = route or e.get('route')

# production info (functions, employees) from 2279 (de + en)
prod = {}
for lang in ['de', 'en']:
    for it in T[f'{lang}:2279']['listingItems']:
        f = [x for x in it['fields'] if x]
        prod.setdefault(it['postId'], {})[lang] = f

# canonical location list (ids are DE post ids)
LOC_META = {
    '853': dict(key='hamburg', city='Hamburg', type='hq', company='RITZ Instrument Transformers GmbH', country='DE', funcs_from='853'),
    '855': dict(key='kirchaich', city='Oberaurach-Kirchaich', type='production', company='RITZ Instrument Transformers GmbH', country='DE', funcs_from='855'),
    '856': dict(key='dresden', city='Ottendorf-Okrilla (Dresden)', type='production', company='RITZ Instrument Transformers GmbH', country='DE', funcs_from='856'),
    '854': dict(key='wirges', city='Wirges', type='site', company='RITZ Instrument Transformers GmbH', country='DE'),
    '858': dict(key='marchtrenk', city='Marchtrenk', type='production', company='RITZ Messwandler GmbH', country='AT', funcs_from='858'),
    '860': dict(key='kecskemet', city='Kecskemét', type='production', company='RITZ Mérőtranszformátor Kft.', country='HU', funcs_from='860'),
    '862': dict(key='shanghai', city='Shanghai', type='production', company='Ritz (Shanghai) Electrical Engineering Co., Ltd.', country='CN', funcs_from='862'),
    '863': dict(key='lavonia', city='Lavonia (Hartwell), Georgia', type='production', company='RITZ Instrument Transformers Inc.', country='US', funcs_from='863'),
    '2312': dict(key='waynesboro', city='Waynesboro, Georgia', type='production', company='RITZ Instrument Transformers Inc.', country='US', funcs_from='2312'),
    '864': dict(key='dubai', city='Dubai', type='sales', company='RITZ Instruments FZE', country='AE'),
}

locations = []
for pid, meta in LOC_META.items():
    li = loc_items.get(pid, {})
    de = li.get('de', [])
    en = li.get('en', [])
    # fields: [cityLabel, company, address, phone, (email), 'Routenplaner']
    def parse(f):
        out = {'address': [], 'phone': None, 'email': None}
        for x in f[1:]:
            if re.match(r'^\+?[\d\s()/-]{7,}$', x):
                out['phone'] = x
            elif '@' in x:
                out['email'] = x
            elif x in ('Routenplaner', 'Route planner', 'Kontakt', 'Contact'):
                continue
            elif '\n' in x or re.search(r'\d{4,5}|Straße|Road|Avenue|Ring|utca|Ave', x):
                out['address'] = lines(x)
            else:
                out.setdefault('label', x)
        return out
    pde, pen = parse(de), parse(en)
    loc = {
        'id': meta['key'], 'pid': int(pid), 'type': meta['type'], 'country': meta['country'], 'city': meta['city'],
        'company': meta['company'], 'address': pde['address'], 'address_en': pen['address'] or pde['address'],
        'phone': pde['phone'] or pen['phone'], 'email': pde['email'] or pen['email'], 'route': li.get('route'),
        'lat': coords.get(pid, (None, None))[0], 'lng': coords.get(pid, (None, None))[1],
    }
    # production functions and employees
    pf = prod.get(meta.get('funcs_from') or '', {})
    for lang in ['de', 'en']:
        f = pf.get(lang)
        if not f:
            continue
        txt = '\n'.join(f)
        m = re.search(r'(\d+)\s*(?:EMPLOYEES|MITARBEITER|Mitarbeiter)', txt)
        if m:
            loc['employees'] = int(m.group(1))
        # functions block: the element after city label repeated (contains newlines, not address)
        funcs = []
        for x in f:
            if x in ('Routenplaner', 'Route planner', 'Kontakt', 'Contact'):
                continue
            if re.search(r'EMPLOYEES|MITARBEITER', x):
                continue
            if x == f[0]:
                continue
            if '\n' in x and not re.search(r'\b\d{4,5}\b.*\n|Straße|Road|Avenue|utca|Ring \d|Ave\b', x):
                funcs = lines(x)
        if funcs:
            loc['functions_' + lang] = funcs
    locations.append(loc)

# Wirges: phone on site was Hamburg number; production page listed +49 2602 6790
for l in locations:
    if l['id'] == 'wirges':
        l['phone'] = '+49 2602 6790'
        l['note'] = 'Telefonnummer laut Seite „Produktionsstandorte“; Kontaktliste zeigt fälschlich die Hamburger Zentrale.'
    if l['id'] == 'dubai' and not l.get('email'):
        l['email'] = 'nadeem@ritz-instruments.com'

# ---- product-area location assignment (template 1609 nested)
AREA_TPL = {'1465': 'mittelspannung', '1468': 'niederspannung', '1471': 'stromschienen-sis', '1477': 'giessharzteile-duromer', '1480': 'elektronik-sensoren', '1483': 'hochspannung'}
pid2loc = {'853': 'hamburg', '849': 'hamburg', '846': 'hamburg', '855': 'kirchaich', '1548': 'kirchaich', '856': 'dresden', '851': 'dresden', '847': 'dresden',
           '858': 'marchtrenk', '850': 'marchtrenk', '12597': 'marchtrenk', '860': 'kecskemet', '862': 'shanghai', '12599': 'shanghai', '863': 'lavonia', '12600': 'lavonia', '845': 'lavonia', '2312': 'waynesboro', '864': 'dubai'}
area_locations = collections.defaultdict(list)
for tpl, area in AREA_TPL.items():
    for it in T[f'de:{tpl}']['listingItems']:
        lid = pid2loc.get(it['postId'])
        f = [x for x in it['fields'] if x]
        entry = {'location': lid, 'pid': int(it['postId'])}
        if len(f) > 1 and not re.search(r'\d{4,5}', f[1]):
            entry['company'] = f[1]
        area_locations[area].append(entry)

# ---- people (hand-verified from product area pages, DE + EN)
people = [
    {'id': 'kay-leschick', 'name': 'Kay Leschick', 'role': {'de': 'Vertrieb Mittelspannung', 'en': 'Sales Medium Voltage'}, 'areas': ['mittelspannung'], 'location': 'dresden', 'phone': '+49 35205 62-219', 'email': 'kay.leschick@ritz-international.com'},
    {'id': 'karola-walzer', 'name': 'Karola Walzer', 'role': {'de': 'Vertrieb Niederspannung', 'en': 'Sales Low Voltage'}, 'areas': ['niederspannung'], 'location': 'hamburg', 'phone': '+49 40 51123-328', 'email': 'karola.walzer@ritz-international.com'},
    {'id': 'melanie-hille', 'name': 'Melanie Hille', 'role': {'de': 'Vertrieb Niederspannung', 'en': 'Sales Low Voltage'}, 'areas': ['niederspannung'], 'location': 'hamburg', 'phone': '+49 40 51123-248', 'email': 'melanie.hille@ritz-international.com'},
    {'id': 'horst-riedner', 'name': 'Dr. Horst Riedner', 'role': {'de': 'Hochspannung', 'en': 'High Voltage'}, 'areas': ['hochspannung'], 'location': None, 'phone': '+49 172 9538976', 'email': 'horst.riedner@ritz-international.com'},
    {'id': 'ritz-inc-sales', 'name': 'RITZ Instrument Transformers Inc.', 'role': {'de': 'Vertrieb Hochspannung (USA)', 'en': 'High Voltage Sales (USA)'}, 'areas': ['hochspannung'], 'location': 'lavonia', 'phone': '+1 706 356 7180', 'email': 'sales@ritzusa.com', 'org': True},
    {'id': 'gregor-pohl', 'name': 'Gregor Pohl', 'role': {'de': 'Elektronische Messwandler und Sensoren', 'en': 'Electronic instrument transformers and sensors'}, 'areas': ['elektronik-sensoren'], 'location': 'hamburg', 'phone': '+49 40 51123-260', 'email': 'gregor.pohl@ritz-international.com'},
    {'id': 'sis-sales', 'name': 'SIS Vertrieb', 'name_en': 'SIS Sales', 'role': {'de': 'Stromschienen SIS', 'en': 'SIS bus bars'}, 'areas': ['stromschienen-sis'], 'location': 'kirchaich', 'phone': None, 'email': 'sales.sis@ritz-international.com', 'org': True},
    {'id': 'sascha-kensche', 'name': 'Sascha Kensche', 'role': {'de': 'Ansprechpartner SIS', 'en': 'Contact SIS'}, 'areas': ['stromschienen-sis'], 'location': 'kirchaich', 'phone': '+49 172 1922431', 'email': 'sascha.kensche@ritz-international.com', 'langs': ['de', 'en']},
    {'id': 'alexander-kobelt', 'name': 'Alexander Kobelt', 'role': {'de': 'Ansprechpartner SIS', 'en': 'Contact SIS'}, 'areas': ['stromschienen-sis'], 'location': 'kirchaich', 'phone': '+49 151 23494805', 'email': 'alexander.kobelt@ritz-international.com', 'langs': ['de', 'en']},
    {'id': 'daniel-schilling', 'name': 'Daniel Schilling', 'role': {'de': 'Ansprechpartner SIS', 'en': 'Contact SIS'}, 'areas': ['stromschienen-sis'], 'location': 'kirchaich', 'phone': '+49 173 6701824', 'email': 'daniel.schilling@ritz-international.com', 'langs': ['de', 'en']},
    {'id': 'florian-daeumler', 'name': 'Florian Däumler', 'role': {'de': 'Ansprechpartner SISD (Durchführungen)', 'en': 'Contact SISD (bushings)'}, 'areas': ['stromschienen-sis'], 'location': 'kirchaich', 'phone': '+49 151 22310380', 'email': 'florian.daeumler@ritz-international.com', 'langs': ['de', 'en']},
    {'id': 'gottfried-schuster', 'name': 'Gottfried Schuster', 'role': {'de': 'Entwicklung, technisches Engineering, Vertrieb', 'en': 'Development, technical engineering, sales'}, 'areas': ['giessharzteile-duromer'], 'location': 'dresden', 'phone': None, 'email': 'gottfried.schuster@ritz-international.com'},
    {'id': 'frank-karschau', 'name': 'Frank Karschau', 'role': {'de': 'Application Engineer, Sales Manager Osteuropa', 'en': 'Application engineer, sales manager Eastern Europe'}, 'areas': ['giessharzteile-duromer'], 'location': 'dresden', 'phone': '+49 35205 62-212', 'mobile': '+49 173 3971102', 'email': 'frank.karschau@ritz-international.com'},
    {'id': 'duromer', 'name': 'DUROMER', 'role': {'de': 'Gießharzteile und -massen', 'en': 'Cast resin parts and compounds'}, 'areas': ['giessharzteile-duromer'], 'location': 'dresden', 'phone': '+49 35205 62-140', 'email': 'info@duromer.de', 'org': True},
    {'id': 'maria-schunk', 'name': 'Maria Schunk', 'role': {'de': 'Group Director Human Resources', 'en': 'Group Director Human Resources'}, 'areas': ['karriere'], 'location': 'hamburg', 'phone': None, 'email': 'personal.hamburg@ritz-international.com'},
]
for p in people:
    if p['id'] in ('sascha-kensche', 'alexander-kobelt', 'daniel-schilling', 'florian-daeumler'):
        p['teams'] = True

# ---- representatives (visible on contact page: template 1489 DE/EN) + Germany (marker info)
COUNTRY = {
 'Belgien': ('BE', 'Belgium', 'europe'), 'Bulgarien': ('BG', 'Bulgaria', 'europe'), 'Dänemark': ('DK', 'Denmark', 'europe'), 'Estland': ('EE', 'Estonia', 'europe'),
 'Finnland': ('FI', 'Finland', 'europe'), 'Frankreich': ('FR', 'France', 'europe'), 'Griechenland': ('GR', 'Greece', 'europe'), 'Irland': ('IE', 'Ireland', 'europe'),
 'Island': ('IS', 'Iceland', 'europe'), 'Kosovo': ('XK', 'Kosovo', 'europe'), 'Lettland': ('LV', 'Latvia', 'europe'), 'Litauen': ('LT', 'Lithuania', 'europe'),
 'Luxemburg': ('LU', 'Luxembourg', 'europe'), 'Niederlande': ('NL', 'Netherlands', 'europe'), 'Norwegen': ('NO', 'Norway', 'europe'), 'Österreich': ('AT', 'Austria', 'europe'),
 'Polen': ('PL', 'Poland', 'europe'), 'Portugal': ('PT', 'Portugal', 'europe'), 'Rumänien': ('RO', 'Romania', 'europe'), 'Schweden': ('SE', 'Sweden', 'europe'),
 'Slowakei': ('SK', 'Slovakia', 'europe'), 'Spanien': ('ES', 'Spain', 'europe'), 'Tschechien': ('CZ', 'Czech Republic', 'europe'), 'Ukraine': ('UA', 'Ukraine', 'europe'),
 'Vereinigtes Königreich': ('GB', 'United Kingdom', 'europe'), 'Zypern': ('CY', 'Cyprus', 'europe'),
 'Argentinien': ('AR', 'Argentina', 'americas'), 'Belize': ('BZ', 'Belize', 'americas'), 'Bolivien': ('BO', 'Bolivia', 'americas'), 'Brasilien': ('BR', 'Brazil', 'americas'),
 'Chile': ('CL', 'Chile', 'americas'), 'Costa Rica': ('CR', 'Costa Rica', 'americas'), 'Dominikanische Republik': ('DO', 'Dominican Republic', 'americas'), 'Ecuador': ('EC', 'Ecuador', 'americas'),
 'El Salvador': ('SV', 'El Salvador', 'americas'), 'Guatemala': ('GT', 'Guatemala', 'americas'), 'Honduras': ('HN', 'Honduras', 'americas'), 'Jamaica': ('JM', 'Jamaica', 'americas'),
 'Karibik, Rest': ('CARIB', 'Caribbean (other)', 'americas'), 'Kolumbien': ('CO', 'Colombia', 'americas'), 'Latein Amerika': ('LATAM', 'Latin America', 'americas'), 'Mexiko': ('MX', 'Mexico', 'americas'),
 'Nicaragua': ('NI', 'Nicaragua', 'americas'), 'Panama': ('PA', 'Panama', 'americas'), 'Paraguay': ('PY', 'Paraguay', 'americas'), 'Peru': ('PE', 'Peru', 'americas'),
 'Puerto Rico': ('PR', 'Puerto Rico', 'americas'), 'Uruguay': ('UY', 'Uruguay', 'americas'), 'Venezuela': ('VE', 'Venezuela', 'americas'), 'Vereinigte Staaten von Amerika': ('US', 'United States', 'americas'),
 'Australien': ('AU', 'Australia', 'apac'), 'China': ('CN', 'China', 'apac'), 'Dubai': ('AE', 'United Arab Emirates', 'apac'), 'Indien': ('IN', 'India', 'apac'),
 'Korea': ('KR', 'South Korea', 'apac'), 'Malaysia': ('MY', 'Malaysia', 'apac'), 'Singapur': ('SG', 'Singapore', 'apac'), 'Taiwan': ('TW', 'Taiwan', 'apac'),
 'Vietnam': ('VN', 'Vietnam', 'apac'), 'Libyen': ('LY', 'Libya', 'africa'),
}
en_items = {it['postId']: [x for x in it['fields'] if x] for it in T['en:1489']['listingItems']}
reps = []
for it in T['de:1489']['listingItems']:
    f = [x for x in it['fields'] if x]
    country_de = f[0]
    cc, country_en, cont = COUNTRY.get(country_de, (None, country_de, 'other'))
    rest = f[1:]
    company = rest[0] if rest else ''
    addr, phone, email = [], None, None
    for x in rest[1:]:
        if '@' in x and ' ' not in x.strip():
            email = x.strip()
        elif re.match(r'^[+\d][\d\s()/.-]{6,}$', x.strip()):
            phone = x.strip()
        elif x not in ('Routenplaner', 'Route planner'):
            addr = lines(x)
    en = en_items.get(it['postId'])
    addr_en = []
    if en:
        for x in en[2:]:
            if '\n' in x or re.search(r'\d{4}', x):
                if '@' not in x and not re.match(r'^[+\d][\d\s()/.-]{6,}$', x.strip()):
                    addr_en = lines(x)
    lat, lng = coords.get(it['postId'], (None, None))
    reps.append({'pid': int(it['postId']), 'country': cc, 'country_de': country_de, 'country_en': country_en, 'region': cont,
                 'company': company, 'address': addr, 'address_en': addr_en or addr, 'phone': phone, 'email': email, 'lat': lat, 'lng': lng})

reps_de = [
    {'pid': 879, 'country': 'DE', 'country_de': 'Deutschland', 'country_en': 'Germany', 'region': 'germany', 'company': 'Marc Eislechner Industrievertretungen', 'address': ['Krummenäcker 25', '72654 Neckartenzlingen'], 'phone': '+49 7127 925271', 'email': None},
    {'pid': 877, 'country': 'DE', 'country_de': 'Deutschland', 'country_en': 'Germany', 'region': 'germany', 'company': 'Hentges GmbH', 'address': ['Am Meilenstein 4', '53909 Zülpich'], 'phone': '+49 2252 835170', 'email': None},
    {'pid': 876, 'country': 'DE', 'country_de': 'Deutschland', 'country_en': 'Germany', 'region': 'germany', 'company': 'Eidt GmbH', 'address': ['Schulstraße 12', '65604 Elz'], 'phone': '+49 6431 98790', 'email': None},
    {'pid': 878, 'country': 'DE', 'country_de': 'Deutschland', 'country_en': 'Germany', 'region': 'germany', 'company': 'RITZ Instrument Transformers GmbH', 'address': [], 'phone': '+49 172 1922436', 'email': None},
]
for r in reps_de:
    r['lat'], r['lng'] = coords.get(str(r['pid']), (None, None))
    r['address_en'] = r['address']


# ---- manual coordinates (approximate, city level) where the old map had no marker
LOC_COORDS = {'hamburg': (53.5753, 10.0782), 'kirchaich': (49.9617, 10.5547), 'dresden': (51.1830, 13.8270), 'wirges': (50.47207, 7.78647),
              'marchtrenk': (48.19372, 14.1243), 'kecskemet': (46.9062, 19.6913), 'shanghai': (31.01716, 121.27715), 'lavonia': (34.47116, -83.0523),
              'waynesboro': (33.10677, -82.0135), 'dubai': (24.98351, 55.09367)}
for l in locations:
    if l['lat'] is None:
        l['lat'], l['lng'] = LOC_COORDS[l['id']]
REP_COORDS = {888: (51.0896, 4.4932), 896: (42.4258, 25.6345), 900: (55.9267, 12.3109), 901: (55.6761, 12.5683), 912: (59.3592, 27.4211),
  913: (60.1699, 24.9384), 914: (48.8757, 2.3277), 916: (40.6401, 22.9444), 14719: (53.3498, -6.2603), 1345: (64.1426, -21.9010), 1346: (64.1199, -21.7840),
  1392: (42.6629, 21.1655), 1394: (56.9244, 24.0610), 1396: (55.9349, 23.3137), 1397: (49.6461, 5.9564), 1403: (52.0857, 4.8833), 1511: (59.9139, 10.7522),
  1518: (48.20, 14.16), 1524: (53.4285, 14.5528), 1525: (38.6236, -9.0886), 16076: (47.65674, 23.56742), 1530: (59.5140, 15.9926), 1532: (48.7772, 17.6961),
  1533: (43.3260, -3.0090), 1538: (50.0700, 14.4790), 1543: (50.4501, 30.5234), 1542: (50.4570, 30.4100), 1546: (51.5074, -0.1278), 1547: (35.1000, 33.3900),
  885: (-34.5946, -58.5297), 3258: (17.2510, -88.7590), 889: (-16.4897, -68.1193), 895: (-25.5350, -49.2063), 897: (-33.4489, -70.6693), 899: (9.9337, -84.0510),
  902: (18.4861, -69.9312), 910: (-2.1710, -79.9224), 911: (13.6769, -89.2797), 917: (14.5947, -90.5133), 918: (15.5049, -88.0250), 1347: (17.9714, -76.7931),
  3262: (15.0, -61.0), 1391: (4.7166, -74.2117), 1399: (19.4600, -99.0900), 1401: (12.1140, -86.2362), 3286: (8.9824, -79.5199), 1521: (-25.2637, -57.5759),
  1522: (-12.0970, -77.0360), 3288: (18.41535, -66.05936), 1544: (-34.9011, -56.1645), 1545: (10.4910, -66.8040), 3289: (34.40, -83.10), 886: (-37.9670, 145.0540),
  3290: (31.05, 121.35), 3291: (25.03, 55.15), 1343: (19.0176, 72.8562), 3292: (37.52046, 127.05761), 3293: (3.14045, 101.54), 3294: (1.35224, 103.9674),
  1537: (24.8790, 121.0230), 3295: (10.71395, 106.70361), 1395: (32.8872, 13.1913), 879: (48.5890, 9.2350), 877: (50.6913, 6.6505), 876: (50.4180, 8.0410)}
SERVED_FROM = {14719: 'wirges', 1546: 'wirges', 901: 'koeping', 913: 'koeping', 1511: 'koeping', 3258: 'lavonia', 889: 'lavonia', 897: 'lavonia', 1401: 'lavonia', 3286: 'lavonia', 3257: 'lavonia', 1347: 'roswell', 3262: 'roswell'}
PHONE_RX = re.compile(r'^(\+|\(|\d)[\d\s()/.#-]{6,}(ext\.?\s*\d+)?$', re.I)
for r in reps + reps_de:
    if r['pid'] in REP_COORDS:
        r['lat'], r['lng'] = REP_COORDS[r['pid']]
    if r['pid'] in SERVED_FROM:
        r['servedFrom'] = SERVED_FROM[r['pid']]
    # clean phone numbers that ended up in address
    for key in ('address', 'address_en'):
        keep = []
        for line in r.get(key) or []:
            if PHONE_RX.match(line.strip()) or line.strip().upper().startswith('OFFICE:'):
                if not r.get('phone'):
                    m = re.search(r'OFFICE:\s*([\d-]+)', line)
                    r['phone'] = ('+' + m.group(1).replace('-', ' ')) if m else line.strip()
                m2 = re.search(r'CELL:\s*([\d-]+)', line)
                if m2: r['mobile'] = '+' + m2.group(1).replace('-', ' ')
                continue
            if line.strip() in ('-',):
                continue
            keep.append(line)
        r[key] = keep

# ---- Darstellung vereinheitlichen (Telefon im Format der Zentrale, Adresszeilen, Bis-Striche)
for l in locations:
    if l['id'] == 'hamburg':
        l['phone'] = '+49 40 51123-0'
        l['email'] = l.get('email') or 'info@ritz-international.com'
    if l['id'] == 'lavonia' and l.get('phone') == '+1 706 35 67 180':
        l['phone'] = '+1 706 356 7180'
    if l['id'] == 'dresden' and l.get('phone') == '+49 35205 620':
        l['phone'] = '+49 35205 62-0'
    if l['id'] == 'kecskemet':
        for key in ('address', 'address_en'):
            a = l.get(key) or []
            if len(a) >= 2 and re.match(r'^H-\d{4}', a[0]):
                l[key] = [a[1], a[0]] + a[2:]
    if l['id'] == 'lavonia':
        for key in ('address', 'address_en'):
            if l.get(key) and l[key][-1] != 'USA':
                l[key] = l[key] + ['USA']
    if l['id'] == 'waynesboro':
        l['address'] = l['address_en'] = ['Ritz Ave', 'Waynesboro, Georgia 30830', 'USA']
    for key in ('address', 'address_en'):
        l[key] = [re.sub(r'(?<=\d)-(?=\d)', '–', x) if re.search(r'[A-Za-zÄÖÜäöüß]', x) and not re.match(r'^[A-Z]-\d', x) else x for x in (l.get(key) or [])]

# ---- Anschriften ohne Länderzeile: Das Land ergänzt die Website in der Seitensprache (Ländercode `country`).
# Die alte englische Seite hatte zusammengeklebte Adressen ("…92-9822041 HamburgGermany"), daher eine kuratierte Fassung.
LOC_ADDR = {
    'hamburg': ['Wandsbeker Zollstraße 92–98', '22041 Hamburg'],
    'kirchaich': ['Mühlberg 1', '97514 Oberaurach-Kirchaich'],
    'dresden': ['Bergener Ring 65–67', '01458 Ottendorf-Okrilla'],
    'wirges': ['Siemensstraße 2', '56422 Wirges'],
    'marchtrenk': ['Linzer Straße 79', '4614 Marchtrenk'],
    'kecskemet': ['Gábor Dénes utca 1.', '6000 Kecskemét'],
    'shanghai': ['Building 7, No. 889, Kungang Road', 'Xiaokunshan Town, Songjiang District', '201620 Shanghai'],
    'lavonia': ['25 Hamburg Avenue', 'Lavonia, Georgia 30553'],
    'waynesboro': ['Ritz Ave', 'Waynesboro, Georgia 30830'],
    'dubai': ['Office No. 1806, 18th Floor', 'Jafza View 18, Jebel Ali Free Zone', 'P.O. Box 261469', 'Dubai'],
}
# ---- Schwerpunkte je Standort in fünf Sprachen.
# Quelle: Seite „Produktionsstandorte“ (Template 2279). Dort standen die Listen auch auf der deutschen Seite
# überwiegend englisch, Shanghai nur deutsch ("Draft architect" auf EN), und bei Marchtrenk ging die Liste
# beim ersten Import verloren. Übersetzungen folgen der Terminologie der übrigen Seiten; Freigabe durch RITZ offen.
N = ' '  # geschütztes Leerzeichen zwischen Zahl und Einheit
FUNCS = {
    'hamburg': {
        'de': ['Vertrieb', 'Controlling / Rechnungswesen', 'IT', 'Personal', 'Produkte & Betriebsmittel', 'Konstruktion', 'Elektronik'],
        'en': ['Sales', 'Controlling / Accounting', 'IT', 'Human Resources', 'Product & Equipment', 'Design', 'Electronics'],
        'fr': ['Ventes', 'Contrôle de gestion / Comptabilité', 'Informatique', 'Ressources humaines', 'Produits & équipements', 'Conception', 'Électronique'],
        'hu': ['Értékesítés', 'Kontrolling / Számvitel', 'Informatika', 'Humánerőforrás', 'Termékek és berendezések', 'Tervezés', 'Elektronika'],
        'es': ['Ventas', 'Controlling / Contabilidad', 'Informática', 'Recursos humanos', 'Productos y equipos', 'Diseño', 'Electrónica'],
    },
    'kirchaich': {
        'de': ['Vertrieb', 'ATEX-Stromwandler', f'Gießharzisolierte Stromschienen bis 40,5{N}kV und 8.000{N}A', f'Durchführungen bis 72,5{N}kV und 5.000{N}A'],
        'en': ['Sales', 'ATEX current transformers', f'Cast-resin insulated busbars up to 40.5{N}kV and 8,000{N}A', f'Bushings up to 72.5{N}kV and 5,000{N}A'],
        'fr': ['Ventes', 'Transformateurs de courant ATEX', f'Jeux de barres isolés en résine coulée jusqu’à 40,5{N}kV et 8 000{N}A', f'Traversées jusqu’à 72,5{N}kV et 5 000{N}A'],
        'hu': ['Értékesítés', 'ATEX áramváltók', f'Öntött gyanta szigetelésű áramvezető sínek 40,5{N}kV-ig és 8000{N}A-ig', f'Átvezetők 72,5{N}kV-ig és 5000{N}A-ig'],
        'es': ['Ventas', 'Transformadores de corriente ATEX', f'Barras aisladas con resina colada hasta 40,5{N}kV y 8000{N}A', f'Pasatapas hasta 72,5{N}kV y 5000{N}A'],
    },
    'dresden': {
        'de': ['Vertrieb', f'Strom- und Spannungswandler für Innenraum und Freiluft bis 52{N}kV', 'Metallgekapselte und metallisierte Wandler', 'Gießharz: Entwicklung, Rezeptur und Produktion'],
        'en': ['Sales', f'Current and voltage transformers for indoor and outdoor use up to 52{N}kV', 'Metal-clad and metallized units', 'Cast resin development, formulation and production'],
        'fr': ['Ventes', f'Transformateurs de courant et de tension pour l’intérieur et l’extérieur jusqu’à 52{N}kV', 'Transformateurs sous enveloppe métallique et métallisés', f'Résine coulée{N}: développement, formulation et production'],
        'hu': ['Értékesítés', f'Beltéri és kültéri áram- és feszültségváltók 52{N}kV-ig', 'Fémtokozott és fémezett kivitelek', 'Öntött gyanta: fejlesztés, receptúra és gyártás'],
        'es': ['Ventas', f'Transformadores de corriente y de tensión para interior y exterior hasta 52{N}kV', 'Transformadores con envolvente metálica y metalizados', 'Resina colada: desarrollo, formulación y producción'],
    },
    'marchtrenk': {
        'de': ['Vertrieb', 'Niederspannungs-Strom- und -Spannungswandler', f'Durchführungsstromwandler bis 36{N}kV', f'Freiluft-Strom- und -Spannungswandler bis 72,5{N}kV', 'Messwandler für Schienenfahrzeuge (IRIS, ISO 17025)', 'Sensoren'],
        'en': ['Sales', 'Low voltage CTs and VTs', f'Bushing-type CTs up to 36{N}kV', f'Outdoor CTs and VTs up to 72.5{N}kV', 'Instrument transformers for rolling stock (IRIS, ISO 17025)', 'Sensors'],
        'fr': ['Ventes', 'Transformateurs de courant et de tension basse tension', f'Transformateurs de courant de type traversée jusqu’à 36{N}kV', f'Transformateurs de courant et de tension pour l’extérieur jusqu’à 72,5{N}kV', 'Transformateurs de mesure pour le matériel roulant (IRIS, ISO 17025)', 'Capteurs'],
        'hu': ['Értékesítés', 'Kisfeszültségű áram- és feszültségváltók', f'Átvezető áramváltók 36{N}kV-ig', f'Kültéri áram- és feszültségváltók 72,5{N}kV-ig', 'Mérőváltók vasúti járművekhez (IRIS, ISO 17025)', 'Érzékelők'],
        'es': ['Ventas', 'Transformadores de corriente y de tensión de baja tensión', f'Transformadores de corriente tipo pasatapas hasta 36{N}kV', f'Transformadores de corriente y de tensión para exterior hasta 72,5{N}kV', 'Transformadores de medida para material rodante (IRIS, ISO 17025)', 'Sensores'],
    },
    'kecskemet': {
        'de': ['Nieder- und Mittelspannungs-Messwandler für Innenraum', 'Aktivteile und weitere Grundkomponenten für Strom- und Spannungswandler'],
        'en': ['Low and medium voltage instrument transformers (indoor)', 'Active parts and other basic components for current and voltage transformers'],
        'fr': ['Transformateurs de mesure basse et moyenne tension pour l’intérieur', 'Parties actives et autres composants de base pour transformateurs de courant et de tension'],
        'hu': ['Beltéri kis- és középfeszültségű mérőváltók', 'Aktív részek és egyéb alapkomponensek áram- és feszültségváltókhoz'],
        'es': ['Transformadores de medida de baja y media tensión para interior', 'Partes activas y otros componentes básicos para transformadores de corriente y de tensión'],
    },
    'shanghai': {
        'de': ['Konstruktion', 'Zwei Gesellschaften: Vertrieb und Fertigung', f'Mittelspannungs-Strom- und -Spannungswandler bis 40,5{N}kV', 'Metallgekapselte Wandler', 'Niederspannungs-Messwandler'],
        'en': ['Design', 'Two companies: sales and manufacturing', f'Medium voltage current and voltage transformers up to 40.5{N}kV', 'Metal-clad units', 'Low voltage instrument transformers'],
        'fr': ['Conception', f'Deux sociétés{N}: ventes et fabrication', f'Transformateurs de courant et de tension moyenne tension jusqu’à 40,5{N}kV', 'Transformateurs sous enveloppe métallique', 'Transformateurs de mesure basse tension'],
        'hu': ['Tervezés', 'Két vállalat: értékesítés és gyártás', f'Középfeszültségű áram- és feszültségváltók 40,5{N}kV-ig', 'Fémtokozott mérőváltók', 'Kisfeszültségű mérőváltók'],
        'es': ['Diseño', 'Dos sociedades: ventas y fabricación', f'Transformadores de corriente y de tensión de media tensión hasta 40,5{N}kV', 'Transformadores con envolvente metálica', 'Transformadores de medida de baja tensión'],
    },
    'lavonia': {
        'de': ['Vertrieb', 'Niederspannungs-Strom- und -Spannungswandler für Innenraum und Freiluft', 'Mittelspannungs-Strom- und -Spannungswandler für Freiluft', 'Kapazitive Hochspannungs-Spannungswandler'],
        'en': ['Sales', 'Low voltage CTs and VTs for indoor and outdoor use', 'Medium voltage CTs and VTs for outdoor use', 'High voltage capacitive VTs'],
        'fr': ['Ventes', 'Transformateurs de courant et de tension basse tension pour l’intérieur et l’extérieur', 'Transformateurs de courant et de tension moyenne tension pour l’extérieur', 'Transformateurs de tension capacitifs haute tension'],
        'hu': ['Értékesítés', 'Beltéri és kültéri kisfeszültségű áram- és feszültségváltók', 'Kültéri középfeszültségű áram- és feszültségváltók', 'Nagyfeszültségű kapacitív feszültségváltók'],
        'es': ['Ventas', 'Transformadores de corriente y de tensión de baja tensión para interior y exterior', 'Transformadores de corriente y de tensión de media tensión para exterior', 'Transformadores de tensión capacitivos de alta tensión'],
    },
    'waynesboro': {
        'de': ['Fertigung von Hochspannungs-Spannungs- und -Stromwandlern', 'Mittelspannungs-Strom- und -Spannungswandler'],
        'en': ['Production of high voltage instrument transformers (voltage and current transformers)', 'Medium voltage CTs and VTs'],
        'fr': ['Production de transformateurs de tension et de courant haute tension', 'Transformateurs de courant et de tension moyenne tension'],
        'hu': ['Nagyfeszültségű feszültség- és áramváltók gyártása', 'Középfeszültségű áram- és feszültségváltók'],
        'es': ['Fabricación de transformadores de tensión y de corriente de alta tensión', 'Transformadores de corriente y de tensión de media tensión'],
    },
}
for l in locations:
    l['address'] = LOC_ADDR[l['id']]
    l.pop('address_en', None)
    for k in [k for k in l if k.startswith('functions_')]:
        del l[k]
    if l['id'] in FUNCS:
        l['functions'] = FUNCS[l['id']]
# Mitarbeiterzahl Marchtrenk stand nur in der verlorenen Liste: gegenprüfen
assert next(l for l in locations if l['id'] == 'marchtrenk').get('employees') == 138

out = {'locations': locations, 'areaLocations': area_locations, 'people': people, 'reps': reps, 'repsDE': reps_de,
       'meta': {'source': 'ritz-international.com Kontaktseite (Templates 1368/1609/1621/2279), Kartenmarker JetEngine; Stand 21.10.2026',
                'hiddenRepsNote': 'Im CMS existieren 85 internationale Vertretungen, auf der Kontaktseite sind 63 sichtbar. Nicht sichtbare Einträge (u. a. Russland, Saudi-Arabien) wurden nicht übernommen.'}}
json.dump(out, open(f'{OUT}/contacts.json', 'w'), ensure_ascii=False, indent=1)
print('locations', len(locations), [(l['id'], l['lat'], l['lng'], l.get('employees'), (l.get('functions') or {}).get('de', [])[:2]) for l in locations])
print('reps', len(reps), 'without coords', [r['country_de'] for r in reps if r['lat'] is None])
print('regions', collections.Counter(r['region'] for r in reps))
print('area locs', {k: [e['location'] for e in v] for k, v in area_locations.items()})
print('repsDE coords', [(r['company'], r['lat']) for r in reps_de])
print(reps[0]); print(reps[30])
