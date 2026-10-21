import json, re, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
C = json.load(open(os.path.join(ROOT, 'raw', 'crawl.json')))
def strip(h):
    h = re.sub(r'<br\s*/?>', '\n', h or '')
    h = re.sub(r'</(p|li|h\d|tr|div)>', '\n', h)
    t = re.sub(r'<[^>]+>', ' ', h)
    t = html.unescape(t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n', t)
    return t.strip()
def digest(p):
    out = [f"# {p.get('title')}\nURL: {p['url']}  status={p.get('status')} lang={p.get('lang')} kind={p.get('kind')}\nmeta: {json.dumps(p.get('meta',{}), ensure_ascii=False)[:600]}\ncanonical: {p.get('canonical')}\nhreflang: {p.get('hreflang')}\n"]
    skip_inside = set()
    for w in p.get('widgets', []):
        t = w['w']
        ins = ' (in '+w['inside']+')' if w.get('inside') else ''
        if t == 'heading': out.append(f"[H {w.get('tag')}]{ins} {w.get('t')}" + (f"  -> {w['href']}" if w.get('href') else ''))
        elif t == 'text-editor': out.append(f"[TEXT]{ins} " + strip(w.get('html')))
        elif t == 'image': out.append(f"[IMG]{ins} {w.get('src')} alt={w.get('alt')!r}" + (f" -> {w['href']}" if w.get('href') else '') + (f" cap={w['cap']!r}" if w.get('cap') else ''))
        elif t == 'button': out.append(f"[BTN]{ins} {w.get('t')} -> {w.get('href')}")
        elif t == 'icon-list': out.append(f"[LIST]{ins} " + ' | '.join(f"{i['t']}" + (f" <{i['href']}>" if i.get('href') else '') for i in w.get('items', [])))
        elif t in ('jet-tabs',): out.append(f"[TABS]{ins} " + ' | '.join(f"{x['label']}#{x['tpl']}" for x in w.get('tabs', [])) + ' contents: ' + ' || '.join(strip(c['html'])[:3000] for c in w.get('contents', []) if c.get('html')))
        elif t == 'jet-accordion' or 'accordion' in t or 'toggle' in t: out.append(f"[ACC]{ins} " + ' || '.join(f"<{i.get('title')}> tpl={i.get('tpl')} {strip(i.get('html'))[:4000]}" for i in w.get('items', [])))
        elif t in ('divider', 'spacer', 'pp-breadcrumbs', 'icon', 'post-info'): continue
        elif t == 'theme-post-content': out.append(f"[POSTCONTENT]{ins} " + strip(w.get('html') or w.get('text','')) + ' IMGS=' + ' '.join(i[0] for i in w.get('imgs', [])) + ' LINKS=' + ' '.join(f"{l[0]}<{l[1]}>" for l in w.get('links', [])))
        elif t == 'theme-post-featured-image': out.append(f"[FEATURED]{ins} " + ' '.join(i[0] for i in w.get('imgs', [])))
        elif t == 'theme-post-title': out.append(f"[POSTTITLE]{ins} {w.get('text')}")
        else:
            txt = w.get('text') or strip(w.get('html', ''))
            if 'jet-mobile-menu' in (txt or '') or 'itemDataObject' in (txt or ''): continue
            out.append(f"[{t}]{ins} " + (txt or '')[:3000] + (' IMGS=' + ' '.join(str(i[0]) for i in w.get('imgs', [])) if w.get('imgs') else '') + (' LINKS=' + ' '.join(f"{l[0]}<{l[1]}>" for l in w.get('links', [])[:60]) if w.get('links') else '') + (' SETTINGS=' + w['settings'][:1500] if w.get('settings') else ''))
    if p.get('sections'): out.append('[SECTIONS-BG] ' + json.dumps(p['sections'], ensure_ascii=False)[:3000])
    if p.get('mainHtml'): out.append('[MAINHTML] ' + strip(p['mainHtml'])[:8000])
    if p.get('mapData'): out.append('[MAPDATA] ' + json.dumps(p['mapData'], ensure_ascii=False)[:3000])
    if p.get('pdfs'): out.append('[PDFS] ' + ' '.join(p['pdfs']))
    if p.get('templateIds'): out.append('[TEMPLATES] ' + ' '.join(p['templateIds']))
    return '\n'.join(out)
os.makedirs(os.path.join(ROOT, 'digest', 'pages'), exist_ok=True)
index = []
for p in C:
    if not p or 'url' not in p: continue
    slug = re.sub(r'[^a-z0-9]+', '-', p['url'].replace('https://ritz-international.com', '').lower()).strip('-') or 'home'
    fn = f"{ROOT}/digest/pages/{p.get('lang') or 'xx'}__{slug}.txt"
    d = digest(p)
    open(fn, 'w').write(d)
    index.append((p.get('lang'), p.get('kind'), p['url'], p.get('title'), len(d), fn))
index.sort()
with open(os.path.join(ROOT, 'digest', 'index.txt'), 'w') as f:
    for i in index: f.write('\t'.join(map(str, i)) + '\n')
print(len(index))
