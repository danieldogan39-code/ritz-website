// Originalbilder übernehmen: node tools/import_originals.mjs <ordner> [--dry]
// <ordner> enthält Bilder unter ihrem WordPress-Pfad (z. B. 2022/11/intro_home_slider_1.webp oder ritz_header-duromer.jpg),
// etwa ein entpackter Export der Mediathek. Für jedes Motiv aus src/data/build/images.json (Ordner mimg) wird die größte
// passende Datei gesucht (genutzte Fassung und Original ohne Größen-Suffix wie -300x200), auf höchstens 2560 px Breite
// gebracht und als hochwertige WebP-Quelle nach raw/img/mimg geschrieben – nur wenn sie breiter ist als die bisherige.
// Die zwischengespeicherten Größen des Motivs in site/.imgcache werden gelöscht, der nächste Build rechnet sie neu.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const [dir, flag] = process.argv.slice(2);
if (!dir) { console.log('Aufruf: node tools/import_originals.mjs <ordner> [--dry]'); process.exit(1); }
const images = JSON.parse(fs.readFileSync(`${ROOT}/site/src/data/build/images.json`, 'utf8'));
const nameOf = (key) => key.replace(/\.(webp|png|jpe?g)$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-');
const CACHE = `${ROOT}/site/.imgcache`;
const MAX = 2560;
let upd = 0, same = 0, none = 0;
const report = [];
for (const [key, m] of Object.entries(images)) {
  if (m.dir !== 'mimg' || !m.src) continue;
  let rel = new URL(m.src).pathname;
  try { rel = decodeURI(rel); } catch { /* bleibt kodiert */ }
  rel = rel.replace(/^\/wp-content\/uploads\/+/, '');
  const cands = [rel];
  const base = rel.replace(/-\d+x\d+(\.\w+)$/, '$1');
  if (base !== rel) cands.push(base);
  let best = null;
  for (const c of cands) {
    for (const v of new Set([c, c.normalize('NFC'), c.normalize('NFD')])) {
      const f = path.join(dir, v);
      if (!fs.existsSync(f)) continue;
      const meta = await sharp(f).metadata();
      const w = (meta.orientation || 1) >= 5 ? meta.height : meta.width;
      if (!best || w > best.w) best = { f, w, fmt: meta.format };
      break;
    }
  }
  if (!best) { none++; report.push(`– ${key}: keine Datei im Ordner`); continue; }
  const cur = `${ROOT}/raw/img/mimg/${m.file}`;
  const cw = fs.existsSync(cur) ? (await sharp(cur).metadata()).width : 0;
  if (best.w <= cw * 1.05) { same++; continue; }
  const w = Math.min(best.w, MAX);
  report.push(`↑ ${key}: ${cw} → ${w} px`);
  if (flag === '--dry') continue;
  const tmp = `${cur}.tmp.webp`;
  await sharp(best.f).rotate().resize({ width: w, withoutEnlargement: true })
    .webp({ quality: best.fmt === 'png' ? 92 : 90, alphaQuality: 100, effort: 5 }).toFile(tmp);
  fs.renameSync(tmp, cur);
  if (fs.existsSync(CACHE)) for (const c of fs.readdirSync(CACHE)) if (c.replace(/-\d+\.webp$/, '') === nameOf(key)) fs.rmSync(`${CACHE}/${c}`);
  upd++;
}
console.log(report.join('\n'));
console.log(`${flag === '--dry' ? '(Probelauf) ' : ''}${upd || report.filter((r) => r.startsWith('↑')).length} Quellen ${flag === '--dry' ? 'würden ersetzt' : 'ersetzt'}, ${same} schon in voller Größe, ${none} ohne Datei`);
