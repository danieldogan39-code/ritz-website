#!/usr/bin/env python3
"""Save a dumpChunk payload from latest (or given) tool-result into raw/parts/NAME.NNN ; when all parts present, assemble NAME.json"""
import json, sys, glob, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grab import load, latest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
src = sys.argv[1] if len(sys.argv) > 1 else latest()
val = load(src)
assert isinstance(val, dict) and 'part' in val, 'not a chunk payload'
name, i, n = val['name'], val['i'], val['n']
d = os.path.join(ROOT, 'raw', 'parts'); os.makedirs(d, exist_ok=True)
open(f'{d}/{name}.{i:03d}', 'w').write(val['part'])
have = sorted(glob.glob(f'{d}/{name}.[0-9][0-9][0-9]'))
print(f'{name}: part {i+1}/{n} saved; have {len(have)}')
if len(have) == n:
    s = ''.join(open(f).read() for f in have)
    obj = json.loads(s)
    out = f'{ROOT}/raw/{name}.json'
    json.dump(obj, open(out, 'w'), ensure_ascii=False)
    print('ASSEMBLED', out, os.path.getsize(out))
