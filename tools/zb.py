#!/usr/bin/env python3
"""Save zChunk payload (gzip + b14) ; assemble NAME.json when complete."""
import json, sys, glob, os, gzip
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grab import load, latest
from bun import unb14
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
src = sys.argv[1] if len(sys.argv) > 1 else latest()
val = load(src)
assert 'zb' in val
name, i, n, size = val['zb'], val['i'], val['n'], val['size']
d = os.path.join(ROOT, 'raw', 'zbparts'); os.makedirs(d, exist_ok=True)
open(f'{d}/{name}.{i:03d}', 'w', encoding='utf-8').write(val['part'])
have = sorted(glob.glob(f'{d}/{name}.[0-9][0-9][0-9]'))
print(f'{name}: part {i+1}/{n}; have {len(have)}')
if len(have) == n:
    s = ''.join(open(f, encoding='utf-8').read() for f in have)
    raw = gzip.decompress(unb14(s, size)).decode('utf-8')
    obj = json.loads(raw)
    out = f'{ROOT}/raw/{name}.json'
    json.dump(obj, open(out, 'w'), ensure_ascii=False)
    print('ASSEMBLED', out, os.path.getsize(out))
    for f in have: os.remove(f)
