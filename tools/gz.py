#!/usr/bin/env python3
"""Save a gzChunk payload from latest (or given) tool-result; assemble NAME.json when complete."""
import json, sys, glob, os, base64, gzip
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grab import load, latest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
src = sys.argv[1] if len(sys.argv) > 1 else latest()
val = load(src)
assert isinstance(val, dict) and 'gz' in val, 'not a gz payload: ' + str(list(val)[:5] if isinstance(val, dict) else type(val))
name, i, n = val['gz'], val['i'], val['n']
d = os.path.join(ROOT, 'raw', 'gzparts'); os.makedirs(d, exist_ok=True)
open(f'{d}/{name}.{i:03d}', 'w').write(val['part'])
have = sorted(glob.glob(f'{d}/{name}.[0-9][0-9][0-9]'))
print(f'{name}: part {i+1}/{n} ({len(val["part"])} chars); have {len(have)}')
if len(have) == n:
    b = ''.join(open(f).read() for f in have)
    raw = gzip.decompress(base64.b64decode(b)).decode('utf-8')
    out = f'{ROOT}/raw/{name}.json'
    obj = json.loads(raw)
    json.dump(obj, open(out, 'w'), ensure_ascii=False)
    print('ASSEMBLED', out, os.path.getsize(out))
    for f in have: os.remove(f)
