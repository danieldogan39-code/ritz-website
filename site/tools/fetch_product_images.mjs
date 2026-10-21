// Produktbilder vom bisherigen Produktfinder holen (produkte.ritz-international.com)
// Aufruf (Projektwurzel/site): node tools/fetch_product_images.mjs
// Danach: python3 ../tools/normalize_products.py && python3 ../tools/prepare.py && node build.mjs
// Lädt höflich nacheinander (1,2 s Pause), wandelt nach WebP und schreibt raw/img/pimg/_index.json.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd(), '..');
const RAW = path.join(ROOT, 'raw');
const OUT = path.join(RAW, 'img', 'pimg');
const BASE = 'https://produkte.ritz-international.com/media/catalog/product/';
fs.mkdirSync(OUT, { recursive: true });
const products = JSON.parse(fs.readFileSync(path.join(RAW, 'products.json'), 'utf8'));
const urls = [...new Set(products.flatMap((p) => p.images || []).filter((u) => typeof u === 'string' && u.startsWith(BASE)))];
const idxFile = path.join(OUT, '_index.json');
const idx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0;
for (const url of urls) {
  const key = url.slice(BASE.length);
  if (idx[key]) { ok++; continue; }
  const file = key.replace(/[^a-z0-9._-]+/gi, '_').replace(/\.(jpe?g|png|gif|webp)$/i, '') + '.webp';
  let done = false;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'RITZ-Website-Migration/1.0' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const img = sharp(buf, { animated: false }).flatten({ background: '#ffffff' });
      const meta = await img.metadata();
      await img.webp({ quality: 86 }).toFile(path.join(OUT, file));
      idx[key] = { file, w: meta.width, h: meta.height, url };
      fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
      ok++; done = true;
      console.log('ok  ', key);
    } catch (e) {
      console.log('fail', key, e.message, attempt < 3 ? '– neuer Versuch' : '');
      await sleep(4000 * attempt);
    }
  }
  if (!done) fail++;
  await sleep(1200);
}
console.log(`Fertig: ${ok} Bilder vorhanden, ${fail} fehlgeschlagen. Index: ${idxFile}`);
