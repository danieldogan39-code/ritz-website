#!/usr/bin/env python3
"""Save JSON payload from browser tool-result file. Usage: grab.py OUT [SRC] ; handles {data,pad} and {part,pad} wrappers."""
import json, sys, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Projektordner (enthält raw/, site/, tools/)
# Ablage der Browser-Mitschnitte aus der Erfassung (Arbeitsumgebung von Medialyte); per Umgebungsvariable setzen
TR = os.environ.get('TOOL_RESULTS', os.path.join(ROOT, 'raw', 'captures')) + '/'
def latest():
    fs = sorted(glob.glob(TR + 'mcp-remote-devices-Claude_Browser__javascript_tool-*.txt'), key=os.path.getmtime)
    return fs[-1]
def load(src):
    d = json.load(open(src))
    txt = d[0]['text']
    if '…[truncated' in txt[-200:]:
        raise SystemExit('TRUNCATED payload in ' + src)
    try:
        return json.loads(txt)
    except Exception:
        i = txt.rfind('\n\n(captured at origin')
        return json.loads(txt[:i] if i > 0 else txt)
if __name__ == '__main__':
    out = sys.argv[1]
    src = sys.argv[2] if len(sys.argv) > 2 else latest()
    val = load(src)
    if isinstance(val, dict) and 'pad' in val:
        val.pop('pad')
        if 'part' in val:
            # chunk: write raw part to out (append mode handled by caller)
            open(out, 'w').write(val['part'])
            print('chunk', val['i'], 'of', val['n'], 'saved to', out, len(val['part'])); sys.exit(0)
        val = val.get('data', val)
    json.dump(val, open(out, 'w'), ensure_ascii=False, indent=1)
    print('saved', out, 'from', os.path.basename(src), 'size', os.path.getsize(out))
