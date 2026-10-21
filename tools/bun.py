#!/usr/bin/env python3
"""Decode a bundleChunk payload (b14-encoded image bundle) and write individual image files."""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grab import load, latest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
def unb14(s, nbytes):
    out = bytearray(); acc = 0; n = 0
    for ch in s:
        v = ord(ch) - 0x4E00
        if not (0 <= v < 16384): raise ValueError('bad char %r' % ch)
        acc = (acc << 14) | v; n += 14
        while n >= 8:
            n -= 8; out.append((acc >> n) & 0xFF)
        acc &= (1 << n) - 1
    return bytes(out[:nbytes])
if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else latest()
    outdir = sys.argv[2] if len(sys.argv) > 2 else None
    val = load(src)
    name, k, n, size = val['bun'], val['k'], val['n'], val['size']
    data = unb14(val['enc'], size)
    assert len(data) == size, (len(data), size)
    base = outdir or f'{ROOT}/raw/img/{name}'
    os.makedirs(base, exist_ok=True)
    idx_path = f'{base}/_index.json'
    idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    for it in val['items']:
        fn = it['id'].replace('/', '__')
        fn = os.path.splitext(fn)[0] + '.webp'
        b = data[it['off']: it['off'] + it['len']]
        assert b[:4] == b'RIFF' and b[8:12] == b'WEBP', ('not webp', it['id'])
        open(f'{base}/{fn}', 'wb').write(b)
        meta = {k2: it[k2] for k2 in ('url', 'w', 'h', 'ow', 'oh', 'srcBytes', 'type')}
        meta['file'] = fn; meta['bytes'] = it['len']
        idx[it['id']] = meta
    json.dump(idx, open(idx_path, 'w'), ensure_ascii=False, indent=0)
    print(f'{name} bundle {k+1}/{n}: {len(val["items"])} images, {size} bytes; index now {len(idx)}')
