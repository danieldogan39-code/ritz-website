// Social-Media-Logos für den Fuß. Die offiziellen SVG-Dateien der Plattformen liegen in src/assets/social/
// (Dateiname = Kennung aus SOCIAL in src/views/layout.js: linkedin.svg, instagram.svg, xing.svg). Dieses Skript
// bereinigt sie (keine Skripte, keine Editor-Reste, feste viewBox, einfarbige Logos in Textfarbe) und schreibt sie als
// Modul src/lib/social-icons.js, das Server- und Browser-Ansicht gleichermaßen laden. build.mjs ruft es vor jedem Bau
// auf; von Hand: node tools/social-icons.mjs. Fehlt eine Datei, zeigt der Fuß für diese Plattform den Namen als Link.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP = ['none', 'transparent', 'currentcolor', 'inherit'];
const COLOR = /((?:fill|stroke|stop-color)\s*(?:=\s*"|:)\s*)(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|[a-z]+)/gi;

export function cleanSvg(raw, name = 'svg') {
  let s = String(raw)
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(metadata|title|desc|script|foreignObject)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(sodipodi|inkscape):[\w-]+\b[^>]*\/>/gi, '')
    .replace(/<(sodipodi|inkscape):([\w-]+)\b[\s\S]*?<\/\1:\2>/gi, '')
    .replace(/\s(?:on\w+|(?:inkscape|sodipodi|serif):[\w-]+|xmlns:(?:inkscape|sodipodi|serif|dc|cc|rdf|xlink))="[^"]*"/gi, '')
    .replace(/\s(?:xlink:)?href="(?!#)[^"]*"/gi, '') // nur Verweise innerhalb der Datei
    .replace(/>\s+</g, '><')
    .trim();
  const m = s.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error(`${name}: kein <svg>-Element`);
  const open = m[0];
  const attr = (n) => (open.match(new RegExp(`\\s${n}="([^"]*)"`, 'i')) || [])[1];
  let vb = attr('viewBox');
  if (!vb) {
    const w = parseFloat(attr('width')), h = parseFloat(attr('height'));
    if (!(w > 0 && h > 0)) throw new Error(`${name}: weder viewBox noch Breite und Höhe`);
    vb = `0 0 ${w} ${h}`;
  }
  // einfarbig (oder ohne Farbangabe): Logo übernimmt die Textfarbe; mehrfarbige Logos bleiben, wie sie sind
  const colors = new Set([...s.matchAll(COLOR)].map((x) => x[2].toLowerCase()).filter((c) => !KEEP.includes(c)));
  const mono = colors.size <= 1 && !colors.has('url'); // Verläufe (url(#…)) gelten als mehrfarbig
  if (mono) s = s.replace(COLOR, (all, pre, c) => (KEEP.includes(c.toLowerCase()) ? all : `${pre}currentColor`));
  const rest = (s.match(/<svg\b[^>]*>/i)[0].match(/\s(?:fill-rule|clip-rule|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/gi) || []).join('');
  const root = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${rest}${mono && !/\sfill="/i.test(rest) ? ' fill="currentColor"' : ''} aria-hidden="true" focusable="false">`;
  return s.replace(/<svg\b[^>]*>/i, root);
}

export function socialIconsModule(srcDir = 'src') {
  const dir = path.join(srcDir, 'assets/social');
  const icons = {};
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).sort()) {
      if (!/\.svg$/i.test(f)) continue;
      const slug = f.replace(/\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      icons[slug] = cleanSvg(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    }
  }
  return `// Automatisch erzeugt aus src/assets/social/*.svg (tools/social-icons.mjs) – nicht von Hand bearbeiten.\nexport const SOCIAL_ICONS = ${JSON.stringify(icons, null, 2)};\n`;
}

// node tools/social-icons.mjs (aus site/)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = 'src/lib/social-icons.js';
  fs.writeFileSync(out, socialIconsModule('src'));
  console.log('geschrieben:', out);
}
