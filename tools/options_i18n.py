"""Konfigurator-Optionen aus dem Produktfinder sprachlich bereinigen.

Im Magento-Shop waren viele Optionstexte der englischen Store-View deutsch geblieben
(„4 Wochen“, „andere Leistung im Feld Sonderwünsche angeben“), teils zusammengeklebt
(„… Special Requestsünsche angeben“). Umgekehrt standen in der deutschen Store-View
einzelne englische Texte. Da die englischen Daten auch für FR/HU/ES dienen, wird hier
jede Option über ihre ID mit der anderen Sprache abgeglichen und – wo nötig – aus
einem festen Phrasenwörterbuch übersetzt. Unbekannte Fälle bleiben unverändert und
landen im Audit.
"""
import re

GERMAN = re.compile(r'[äöüßÄÖÜ]|\b(und|oder|im|Feld|Fels|bitte|Bitte|andere[rsn]?|ander|weitere?|weiter|mehr|Kerne?|Wochen|Leistung(en)?|Frequenz|Klassen?|Werte|keine|ohne|dauernd|angeben|eintragen|Anfrage|Faktoren|Spannungen|Normen|Wicklung(en)?|Anzahl|Isolationsniveau|Isolationspegel|Spannungsreihe|Kurzzeitstrom|Werk|Ausführung(en)?|variabel|Gewicht|Kabel|Drossel|Sonderwünsche|Bemessungsfaktor|Genauigkeitsklassen?|Sekundärspannung|Nennleistung|Primärspannung|Primärstrom|Sekundärstrom|Kern|Typ|Spannungsfaktor)\b|\w*keit\w*|\w+ungen\b|\w{3,}ung\b|\w*(?:langzeitstrom|schild)\b')
ENGLISH = re.compile(r'\b(the|please|specify|field|Requests?|Core|Class|Accuracy|Acuracy|Overcurrent|Factor|Burden|Weeks?|Current|Voltage|Rated|Insulation|Level|Other|depends|Frequency|Secondary|Primary|Winding|Number|cores?|without|none|Thermal)\b')


def has_german(s):
    return bool(GERMAN.search(s.replace('ÖVE', '')))

SR_EN = 'please specify under Special Requests'
SR_DE = 'im Feld Sonderwünsche angeben'


def dec_en(s):
    return re.sub(r'(?<=\d),(?=\d)', '.', s)


def dec_de(s):
    return re.sub(r'(?<=\d)\.(?=\d)', ',', s)


# ---------------------------------------------------------------- Deutsch → Englisch
NOUN_EN = {
    'klasse': 'accuracy classes', 'klassen': 'accuracy classes', 'genauigkeitsklassen': 'accuracy classes',
    'leistung': 'burdens', 'leistungen': 'burdens', 'spannungen': 'voltages', 'primärspannungen': 'primary voltages',
    'frequenz': 'frequencies', 'faktoren': 'factors', 'normen': 'standards', 'norm': 'standards',
    'primärströme': 'primary currents', 'primärstrom': 'primary currents', 'ströme': 'currents',
    'sekundärstrom': 'secondary currents', 'sekundärströme': 'secondary currents', 'werte': 'values', '': 'values',
    'isolationsniveau': 'insulation levels', 'isolationsniveau (1,2 kv)': 'insulation level (1.2 kV)',
}
EXACT_EN = {
    'Sonderwünsche': 'Special Requests', 'Sonderwünsche / Extras': 'Special Requests', 'Extras / Sonderwünsche': 'Special Requests',
    'Sonderwünsche/Extras': 'Special Requests', 'Frequenz (Hz)': 'Frequency (Hz)',
    'Wunschlieferzeit ab Werk': 'Requested delivery time ex works', 'Wunschliefertermin ab Werk': 'Requested delivery date ex works',
    'Sekundärstrom (A)': 'Secondary Current (A)', 'Primärstrom (A)': 'Primary Current (A)', 'Primärspannung (V)': 'Primary Voltage (V)',
    'Sonderausführungen': 'Special versions', 'Therm. Kurzzeitstrom': 'Thermal Short-Time Current',
    'Isolationsniveau (kV)': 'Insulation Level (kV)', 'Spannungsreihe/Isolationspegel (kV)': 'Voltage Series / Insulation Level (kV)',
    'Anzahl Kerne': 'Number of Cores', 'Anzahl Sekundärwicklungen': 'Number of Secondary Windings',
    'Kurzschlussdauer (sec)': 'Short-Circuit Duration (s)', 'Dämpfungsleistung DE': 'Damping Power DE',
    'Dämpfungsleistung Drossel': 'Damping Power, Choke', 'Dämpfungsleistung Widerstandsgruppe': 'Damping Power, Resistor Group',
    'keine': 'none', 'ohne Klasse': 'without class', 'Konformitätserklärung': 'Declaration of conformity',
    'silikonfreie Ausführung': 'silicone-free version', 'primär Umschaltung': 'Primary reconnection',
    'Bitte im Feld Sonderwünsche eintragen': 'Please specify under Special Requests',
    'PQ Oberschwingungsmessung bis 20 kHz': 'PQ harmonics measurement up to 20 kHz',
    'Spannungsfaktor': 'Voltage Factor', 'Nenn-Langzeitstrom Ie': 'Rated Long-Time Current Ie',
}
TERMS_EN = [  # Bausteine in Titeln
    (r'^(?:Kern|Core) (\d) Genauigkeitsklasse\s*/\s*Überstrom-Bemessungsfaktor (FS\w*)$', r'Core \1 Accuracy Class / Overcurrent Factor \2'),
    (r'^(?:Kern|Core) (\d) (?:Leistung|Nennleistung) \(VA\)$', r'Core \1 Rated Burden (VA)'),
    (r'^Wi (\d) ', r'Winding \1 '), (r'^da-dn Wicklung ', 'da-dn Winding '),
    (r'Sekundärspannung', 'Secondary Voltage'), (r'Genauigkeitsklasse', 'Accuracy Class'), (r'Nennleistung', 'Rated Burden'),
    (r'\bTyp\b', 'Type'),
]


def de2en(s):
    s = s.strip()
    if s in EXACT_EN:
        return EXACT_EN[s]
    m = re.match(r'^(?:andere[rsn]?|ander|weitere?|weiter|mehr)\s*(.*?)\s*(?:bitte\s+)?im\s+(?:Feld|Fels)\s+(?:Sonderwünsche|Extras)\s+(?:angeben|eintragen)\w*$', s, re.I)
    if m:
        noun = m.group(1).strip().lower()
        if noun in ('kerne', 'kern'):
            return f'Additional cores: {SR_EN}'
        if noun.startswith('bitte'):
            noun = ''
        if noun in NOUN_EN:
            return f'Other {NOUN_EN[noun]}: {SR_EN}'
        return s
    m = re.match(r'^andere (\w+) auf Anfrage$', s, re.I)
    if m and m.group(1).lower() in NOUN_EN:
        return f'Other {NOUN_EN[m.group(1).lower()]} on request'
    m = re.match(r'^(\d+) Wochen$', s)
    if m:
        return f'{m.group(1)} weeks'
    m = re.match(r'^(\d+) (Kern|Kerne|Wicklung|Wicklungen)$', s)
    if m:
        n = int(m.group(1)); w = 'core' if m.group(2).startswith('Kern') else 'winding'
        return f'{n} {w}{"" if n == 1 else "s"}'
    m = re.match(r'^([\d,.]+) x Un / dauernd$', s)
    if m:
        return f'{dec_en(m.group(1))} x Un / continuous'
    m = re.match(r'^(.*?)\s*[Bb]ürdenabhängig$', s)
    if m and 'FS' in m.group(1):
        return f'{dec_en(m.group(1))} (depends on burden)'
    m = re.match(r'^(\d)\. Leistungsschild$', s)
    if m:
        return f'{m.group(1)}. Rating Plate'
    if 'Bürdenbereich' in s:
        return s.replace('Bürdenbereich', 'Burden Range')
    out = s
    for a, b in TERMS_EN:
        out = re.sub(a, b, out)
    return out


# ---------------------------------------------------------------- Englisch → Deutsch
NOUN_DE = {
    'currents': 'andere Ströme', 'classes': 'andere Klassen', 'class': 'andere Klassen', 'standard': 'andere Normen',
    'standards': 'andere Normen', 'burden': 'andere Leistungen', 'burdens': 'andere Leistungen',
    'secondary currents': 'andere Sekundärströme', 'primary currents': 'andere Primärströme', 'insulation level': 'anderes Isolationsniveau',
    'frequency': 'andere Frequenz', 'factor': 'andere Faktoren', 'factors': 'andere Faktoren',
}
EXACT_DE = {
    'Insulation Level (kV)': 'Isolationsniveau (kV)', 'Primary Current (A)': 'Primärstrom (A)', 'Secondary Current (A)': 'Sekundärstrom (A)',
    'Number of Cores': 'Anzahl Kerne', 'Thermal Short-Time Current': 'Therm. Kurzzeitstrom', 'Frequency (Hz)': 'Frequenz (Hz)',
    'none': 'keine', '1 Core': '1 Kern',
}


def en2de(s):
    s = s.strip()
    if s in EXACT_DE:
        return EXACT_DE[s]
    m = re.match(r'^(?:Core|Kern) (\d) (?:Acc?uracy Class / Overcurrent Factor) (FS\w*)$', s)
    if m:
        return f'Kern {m.group(1)} Genauigkeitsklasse/Überstrom-Bemessungsfaktor {m.group(2)}'
    m = re.match(r'^(?:Core|Kern) (\d) (?:Leistung|Rated Burden) \(VA\)$', s)
    if m:
        return f'Kern {m.group(1)} Leistung (VA)'
    m = re.match(r'^(?:Other\s*)+(.+?)\s*please\s+spec.*$', s, re.I)
    if m and m.group(1).strip().lower() in NOUN_DE:
        return f'{NOUN_DE[m.group(1).strip().lower()]} {SR_DE}'
    m = re.match(r'^(\d+) Weeks?\b.*$', s)
    if m:
        return f'{m.group(1)} Wochen'
    m = re.match(r'^(.*?FS.*?)\s*\(depends on burden\)$', s)
    if m:
        return f'{dec_de(m.group(1))} bürdenabhängig'
    return s


# ---------------------------------------------------------------- Englisch vereinheitlichen
OTHER_EN = {
    '': 'values', 'classes': 'accuracy classes', 'class': 'accuracy classes', 'accuracy classes': 'accuracy classes',
    'burden': 'burdens', 'burdens': 'burdens', 'optins': 'options', 'option': 'options', 'options': 'options',
    'secondary voltage': 'secondary voltages', 'secondary voltag': 'secondary voltages', 'secondary voltages': 'secondary voltages',
    'secondary current': 'secondary currents', 'secondary currents': 'secondary currents', 'primary current': 'primary currents',
    'primary currents': 'primary currents', 'primary voltage': 'primary voltages', 'current': 'currents', 'currents': 'currents',
    'voltages': 'voltages', 'factor': 'factors', 'factors': 'factors', 'ratio': 'ratios', 'frequency': 'frequencies',
    'standard': 'standards', 'standards': 'standards', 'reconnection': 'reconnections', 'values': 'values',
    'insulation leve': 'insulation levels', 'insulation level': 'insulation levels', 'insulation levelcurrents': 'insulation levels',
    'diameter / types': 'diameters / types', 'types / diameter': 'types / diameters',
}
OTHER_RX = re.compile(r'^\s*(?:[Aa]n?\s*)?[Oo]thers?(?:\b|(?=[A-Z]))\s*(.*?)\s*[Pp]?lease\s+(?:spec\w*|indicate|mention)\b.*$')


def other_noun(n):
    n = re.sub(r'^(?:other\s*)+', '', n.strip().rstrip(':').strip(), flags=re.I)
    n = re.sub(r'(?<=\w)\(', ' (', n)
    n = re.sub(r'(?<=\d),(?=\d)', '.', n)
    n = re.sub(r'\b([A-Z][a-z]+)\b', lambda m: m.group(1).lower(), n)
    return OTHER_EN.get(n.lower(), n)


def norm_en(s):
    s = s.strip().replace('Acuracy', 'Accuracy')
    s = re.sub(r'^Wi (\d) ', r'Winding \1 ', s)
    s = re.sub(r'^(Winding \d) Burden\s*\(VA\)', r'\1 Rated Burden (VA)', s)
    if s.count(')') > s.count('('):
        s = re.sub(r'\)\s*\)', ')', s, count=1)
    m = OTHER_RX.match(s)
    if m:
        return f'Other {other_noun(m.group(1))}: {SR_EN}'
    m = re.match(r'^(>\s*[\d.,]+ x In)\s*please\b.*$', s, re.I)
    if m:
        return f'{m.group(1)}: {SR_EN}'
    if re.match(r'^Additional cores\b', s, re.I):
        return f'Additional cores: {SR_EN}'
    if re.match(r'^Please specify in the field Special Requests', s, re.I):
        return 'Please specify under Special Requests'
    if s == 'please indicate Primary- and Secondary Current (A)':
        return 'Primary and secondary current (A)'
    if s == 'Rating (Primary current and Secondary Current) please indicate':
        return 'Rating (primary and secondary current)'
    m = re.match(r'^(\d+)\s*Weeks?\b.*$', s, re.I)
    if m and not has_german(s):
        return f'{m.group(1)} weeks'
    return s


def norm_de(s):
    s = re.sub(r'\bander\b(?= )', 'andere', s)
    s = re.sub(r'\banderer (Klasse|Primärströme)\b', r'andere \1', s)
    s = re.sub(r'^andere im Feld', 'andere Werte im Feld', s)
    s = re.sub(r'^weiter Kerne', 'weitere Kerne', s)
    s = s.replace(' im Fels ', ' im Feld ').replace('angebenin', 'angeben').replace('Bürdenabhängig', 'bürdenabhängig')
    return s


# Genauigkeitsklassen: Tippfehler im Shop, aus der Reihe derselben Option erschlossen (Audit)
CLASS_GUESS = [
    (re.compile(r'^\.2 '), '0.2 '), (re.compile(r'^05 '), '0.5 '), (re.compile(r'^0\.S5\b'), '0.5S'), (re.compile(r'^0\.FS'), '0.5S FS'),
]
CLASS_FMT = [
    (re.compile(r'^(\d(?:[.,]\d+)?S?)FS'), r'\1 FS'),               # „0.2FS5“ → „0.2 FS5“
    (re.compile(r'\(depends on burden$'), '(depends on burden)'), (re.compile(r'\(depends on burden\)v$'), '(depends on burden)'),
    (re.compile(r'\s*\.\s*\(depends'), ' (depends'), (re.compile(r'(?<=\d)\(depends'), ' (depends'),
]
CLASSLIKE = re.compile(r'^\d[.,]\d+S?(?=\s+FS|\s*$|\s+x Un)')


def fix_class(v, lang, notes):
    for rx, b in CLASS_GUESS:
        if rx.search(v):
            nv = rx.sub(b, v)
            notes.append(f'„{v}“ → „{nv}“')
            v = nv
    for rx, b in CLASS_FMT:
        v = rx.sub(b, v)
    if lang == 'en' and re.fullmatch(r'\d+,\d{1,2}', v.strip()):   # „17,5“ → „17.5“ (englische Zahlschreibweise)
        v = v.strip().replace(',', '.')
    m = CLASSLIKE.match(v)
    if m:
        num = m.group(0)
        v = (num.replace('.', ',') if lang == 'de' else num.replace(',', '.')) + v[len(num):]
    return v


STATS = {'de2en': 0, 'products': set()}


def harmonize(options, audit_fn, code, pid):
    """options = {'de': [...], 'en': [...]}; ändert in place, gibt Anzahl Änderungen zurück."""
    de = {o['id']: o for o in options.get('de') or []}
    en = {o['id']: o for o in options.get('en') or []}
    changes, unresolved, notes = 0, set(), []
    for lang, opts in (('de', de), ('en', en)):
        for o in opts.values():
            for pair in o.get('v') or []:
                nv = fix_class(pair[1], lang, notes)
                if nv != pair[1]:
                    pair[1] = nv; changes += 1
    for n in sorted(set(notes)):
        audit_fn('produktdaten', f'{code}: Genauigkeitsklasse im Shop vertippt, aus der Reihe ergänzt: {n} – bitte bestätigen.', pid=pid, code=code)

    def fix_en(txt, de_txt):
        r = _fix_en(txt, de_txt)
        if has_german(txt) and not has_german(r):
            STATS['de2en'] += 1
            STATS['products'].add(code)
        return r

    def _fix_en(txt, de_txt):
        e = norm_en(txt)
        if not has_german(e):
            return e
        for cand in ([de2en(norm_de(de_txt))] if de_txt else []) + [de2en(norm_de(txt))]:
            cand = norm_en(cand)
            if not has_german(cand):
                return cand
        unresolved.add(txt)
        return e

    def fix_de(txt, en_txt):
        d = norm_de(txt)
        if not ENGLISH.search(d) or re.fullmatch(r'(Standard\s*/\s*Norm|Norm\s*/\s*Standard|Standard)', d):
            return d
        for cand in [en2de(d)] + ([en2de(en_txt)] if en_txt else []):
            if not ENGLISH.search(cand):
                return cand
        unresolved.add(txt)
        return d

    for oid, o in en.items():
        d = de.get(oid)
        nt = fix_en(o['t'], d['t'] if d else None)
        if nt != o['t']:
            o['t'] = nt; changes += 1
        dv = dict(d['v']) if d else {}
        for pair in o.get('v') or []:
            nv = fix_en(pair[1], dv.get(pair[0]))
            if nv != pair[1]:
                pair[1] = nv; changes += 1
    for oid, o in de.items():
        e = en.get(oid)
        nt = fix_de(o['t'], e['t'] if e else None)
        if nt != o['t']:
            o['t'] = nt; changes += 1
        ev = dict(e['v']) if e else {}
        for pair in o.get('v') or []:
            nv = fix_de(pair[1], ev.get(pair[0]))
            if nv != pair[1]:
                pair[1] = nv; changes += 1
    for u in sorted(unresolved):
        audit_fn('produktdaten', f'{code}: Optionstext nicht eindeutig übersetzbar, unverändert übernommen („{u}“).', pid=pid, code=code)
    return changes
