// Lokaler Server wie in Produktion: liefert dist/ mit Brotli bzw. gzip für Textdateien und denselben Cache-Angaben wie
// die .htaccess aus. Für Leistungsmessungen (tools/qa/perf.mjs) – python3 -m http.server komprimiert nicht.
// Aufruf: node tools/serve.mjs [ordner=dist] [port=8080]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] || 'dist');
const port = +(process.argv[3] || 8080);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const TEXT = /^(text\/|application\/(json|manifest\+json|xml)|image\/(svg\+xml|x-icon))/;
const packed = new Map(); // komprimierte Fassungen (je Datei, Verfahren und Änderungszeit)

http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, u);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch { res.writeHead(404); return res.end('404'); }
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  const ext = path.extname(f), type = TYPES[ext] || 'application/octet-stream';
  const immutable = /^\/(assets|img)\//.test(u) && !/\.mjs$/.test(u);
  const hdr = { 'Content-Type': type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=600, must-revalidate', Vary: 'Accept-Encoding' };
  let body = fs.readFileSync(f);
  const ae = req.headers['accept-encoding'] || '';
  const enc = TEXT.test(type) ? (/\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : '') : '';
  if (enc) {
    const k = `${enc}:${f}:${fs.statSync(f).mtimeMs}`;
    if (!packed.has(k)) packed.set(k, enc === 'br' ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) : zlib.gzipSync(body, { level: 6 }));
    body = packed.get(k);
    hdr['Content-Encoding'] = enc;
  }
  hdr['Content-Length'] = body.length;
  res.writeHead(200, hdr);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(port, () => console.log(`${root} unter http://localhost:${port}`));
