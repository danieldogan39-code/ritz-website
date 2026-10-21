// Text aus Dateien lesen – vollständig im Browser: TXT/CSV/TSV, E-Mail (.eml), Excel (.xlsx), Word (.docx),
// PDF (pdf.js, bei Bedarf nachgeladen) und GAEB DA XML (.x81/.x83/.x84/.x86). Tabellen werden als Tabulator-Text
// ausgegeben, damit der Spezifikations-Parser Spalten erkennt.
import { unzipSync, strFromU8 } from 'fflate';

export class FileErr extends Error { constructor(code, detail = '') { super(code); this.code = code; this.detail = detail; } }

const ext = (name) => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
const MAX = 25 * 1024 * 1024;

export async function readFile(file, { vendor, maxPages = 80 } = {}) {
  if (file.size > MAX) throw new FileErr('size');
  const e = ext(file.name);
  const buf = new Uint8Array(await file.arrayBuffer());
  if (e === 'xls' || e === 'doc' || e === 'msg') throw new FileErr(e === 'xls' ? 'xls' : 'unsupported');
  if (e === 'xlsx' || e === 'xlsm' || (isZip(buf) && /spreadsheet/.test(file.type))) return { kind: 'xlsx', text: xlsxText(buf) };
  if (e === 'docx' || (isZip(buf) && /wordprocessing/.test(file.type))) return { kind: 'docx', text: docxText(buf) };
  if (e === 'pdf' || isPdf(buf)) return { kind: 'pdf', ...(await pdfText(buf, vendor, maxPages)) };
  if (/^x8[0-9]$/.test(e) || (e === 'xml' && /GAEB/i.test(decode(buf.subarray(0, 2000))))) return { kind: 'gaeb', text: gaebText(decode(buf)) };
  if (isZip(buf)) throw new FileErr('unsupported');
  const text = decode(buf);
  if (/\u0000/.test(text.slice(0, 2000))) throw new FileErr('unsupported');
  if (e === 'eml' || /^(?:received|from|return-path|mime-version|message-id):/im.test(text.slice(0, 600))) return { kind: 'eml', text: emlText(text) };
  if (e === 'csv' || e === 'tsv') return { kind: 'csv', text: csvToTsv(text) };
  return { kind: 'text', text };
}

const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b;
const isPdf = (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;

export function decode(u8) {
  if (u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) return new TextDecoder('utf-8').decode(u8.subarray(3));
  if (u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder('utf-16le').decode(u8);
  if (u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder('utf-16be').decode(u8);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { return new TextDecoder('windows-1252').decode(u8); }
}

// ---------- CSV (Komma oder Semikolon, Anführungszeichen) → Tabulator ----------
export function csvToTsv(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
  if (first.includes('\t')) return text;
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.replace(/[\t\n\r]+/g, ' ').trim()).join('\t')).join('\n');
}

// ---------- Excel (.xlsx) ----------
const dom = (s) => new DOMParser().parseFromString(s, 'application/xml');
const byTag = (el, name) => Array.from(el.getElementsByTagName(name));
function colIndex(ref) { let n = 0; for (const ch of String(ref).replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
const cleanNum = (v) => (/^-?\d+\.\d{9,}$/.test(v) ? String(Math.round(parseFloat(v) * 1e6) / 1e6) : v);

export function xlsxText(u8) {
  const files = unzipSync(u8, { filter: (f) => /^xl\/(sharedStrings|workbook)\.xml$|^xl\/_rels\/workbook\.xml\.rels$|^xl\/worksheets\/[^/]+\.xml$/.test(f.name) });
  const get = (n) => (files[n] ? dom(strFromU8(files[n])) : null);
  const ss = [];
  const sst = get('xl/sharedStrings.xml');
  if (sst) for (const si of byTag(sst, 'si')) ss.push(byTag(si, 't').map((t) => t.textContent).join(''));
  // Reihenfolge der Blätter laut Arbeitsmappe
  const order = [];
  const wb = get('xl/workbook.xml'), rels = get('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const target = Object.fromEntries(byTag(rels, 'Relationship').map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]));
    for (const sh of byTag(wb, 'sheet')) { const t = target[sh.getAttribute('r:id')]; if (t) order.push('xl/' + t.replace(/^\/?xl\//, '').replace(/^\//, '')); }
  }
  const sheets = (order.length ? order : Object.keys(files).filter((n) => n.startsWith('xl/worksheets/')).sort()).filter((n) => files[n]);
  const out = [];
  for (const name of sheets) {
    const doc = get(name);
    const lines = [];
    for (const r of byTag(doc, 'row')) {
      const cells = [];
      for (const c of byTag(r, 'c')) {
        const i = colIndex(c.getAttribute('r') || '');
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        let val = '';
        if (t === 's') val = ss[Number(v)] ?? '';
        else if (t === 'inlineStr') val = byTag(c, 't').map((x) => x.textContent).join('');
        else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
        else val = cleanNum(v);
        cells[i >= 0 ? i : cells.length] = String(val).replace(/[\t\r\n]+/g, ' ').trim();
      }
      const row = Array.from(cells, (x) => x || '');
      while (row.length && !row[row.length - 1]) row.pop();
      if (row.some(Boolean)) lines.push(row.join('\t'));
    }
    if (lines.length) out.push(lines.join('\n'));
  }
  return out.join('\n\n');
}

// ---------- Word (.docx) ----------
export function docxText(u8) {
  const files = unzipSync(u8, { filter: (f) => f.name === 'word/document.xml' });
  if (!files['word/document.xml']) throw new FileErr('unsupported');
  const doc = dom(strFromU8(files['word/document.xml']));
  const body = doc.getElementsByTagName('w:body')[0] || doc.documentElement;
  const lines = [];
  const runText = (el) => {
    let s = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (ln === 't') s += c.textContent;
        else if (ln === 'tab') s += '\t';
        else if (ln === 'br' || ln === 'cr') s += ' ';
        else if (ln !== 'instrText' && ln !== 'delText') walk(c);
      }
    };
    walk(el);
    return s;
  };
  const cellText = (tc) => Array.from(tc.childNodes).filter((n) => n.nodeType === 1).map((n) => (n.localName === 'p' ? runText(n) : n.localName === 'tbl' ? tableLines(n).join(' ') : '')).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  function tableLines(tbl) {
    return Array.from(tbl.childNodes).filter((n) => n.nodeType === 1 && n.localName === 'tr').map((tr) => Array.from(tr.childNodes).filter((n) => n.nodeType === 1 && n.localName === 'tc').map(cellText).join('\t'));
  }
  for (const n of body.childNodes) {
    if (n.nodeType !== 1) continue;
    if (n.localName === 'p') lines.push(runText(n));
    else if (n.localName === 'tbl') lines.push(...tableLines(n), '');
    else if (n.localName === 'sdt') for (const p of byTag(n, 'w:p')) lines.push(runText(p));
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- PDF ----------
async function pdfText(u8, vendor, maxPages) {
  let lib;
  try { lib = await import(/* webpackIgnore: true */ vendor + 'pdf.min.mjs'); } catch (e) { throw new FileErr('load', e.message); }
  lib.GlobalWorkerOptions.workerSrc = vendor + 'pdf.worker.min.mjs';
  const doc = await lib.getDocument({ data: u8, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const n = Math.min(doc.numPages, maxPages);
  const pages = [];
  let chars = 0;
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const items = tc.items.filter((it) => typeof it.str === 'string' && it.str.length).map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      const ln = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, Math.min(l.h, it.h) * 0.45));
      if (ln) { ln.items.push(it); ln.h = Math.max(ln.h, it.h); } else lines.push({ y: it.y, h: it.h, items: [it] });
    }
    lines.sort((a, b) => b.y - a.y);
    const out = lines.map((l) => {
      l.items.sort((a, b) => a.x - b.x);
      let s = '', end = null;
      for (const it of l.items) {
        const cw = it.s.length ? it.w / it.s.length : it.h * 0.5;
        if (end != null) { const gap = it.x - end; s += gap > Math.max(cw * 3, it.h * 1.2) ? '\t' : gap > it.h * 0.12 && !/\s$/.test(s) && !/^\s/.test(it.s) ? ' ' : ''; }
        s += it.s;
        end = it.x + it.w;
      }
      return s.replace(/[  ]+/g, ' ').trimEnd();
    });
    const txt = out.join('\n');
    chars += txt.replace(/\s/g, '').length;
    pages.push(txt);
    page.cleanup?.();
  }
  await doc.destroy?.();
  if (chars < 20) throw new FileErr('scanned');
  return { text: pages.join('\n\n'), pages: doc.numPages, truncated: doc.numPages > n ? n : 0 };
}

// ---------- GAEB DA XML ----------
export function gaebText(str) {
  const doc = dom(str);
  if (doc.getElementsByTagName('parsererror').length) throw new FileErr('unsupported');
  const textOf = (el) => {
    if (!el) return '';
    let s = '';
    const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) s += c.nodeValue; else if (c.nodeType === 1) { if (/^(p|br|div)$/i.test(c.localName)) s += ' '; walk(c); } } };
    walk(el);
    return s.replace(/\s+/g, ' ').trim();
  };
  const first = (el, name) => (el ? el.getElementsByTagNameNS('*', name)[0] || null : null);
  const lines = [];
  const name = textOf(first(doc, 'LblTx')) || textOf(first(first(doc, 'PrjInfo'), 'NamePrj'));
  if (name) lines.push(name);
  for (const it of Array.from(doc.getElementsByTagNameNS('*', 'Item'))) {
    const oz = [];
    for (let el = it; el && el.nodeType === 1; el = el.parentNode) if (el.localName === 'BoQCtgy' || el.localName === 'Item') { const r = el.getAttribute('RNoPart'); if (r) oz.unshift(r.trim()); }
    const desc = first(it, 'Description');
    const short = textOf(first(desc, 'OutlineText') || first(desc, 'OutlTxt'));
    const long = textOf(first(desc, 'DetailTxt'));
    const qty = (first(it, 'Qty')?.textContent || '').trim();
    const qu = (first(it, 'QU')?.textContent || '').trim();
    const body = [short, long && long !== short ? long : ''].filter(Boolean).join(' – ');
    if (!body) continue;
    const q = qty ? ` (Menge: ${String(parseFloat(qty)).replace(/\.0+$/, '')} ${qu})` : '';
    lines.push(`${oz.join('.') || lines.length} ${body}${q}`);
  }
  if (lines.length < 2) throw new FileErr('unsupported');
  return lines.join('\n');
}

// ---------- E-Mail (.eml): Textteil suchen und dekodieren ----------
export function emlText(raw) {
  const unfold = (h) => h.replace(/\r?\n[ \t]+/g, ' ');
  const split = (s) => { const i = s.search(/\r?\n\r?\n/); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i).replace(/^\r?\n\r?\n/, '')]; };
  const hdr = (h, k) => (unfold(h).match(new RegExp(`^${k}:\\s*(.+)$`, 'im')) || [])[1] || '';
  const decodePart = (h, body) => {
    const enc = hdr(h, 'Content-Transfer-Encoding').toLowerCase();
    const cs = (hdr(h, 'Content-Type').match(/charset="?([^";\s]+)/i) || [])[1] || 'utf-8';
    let bytes;
    if (enc.includes('base64')) bytes = Uint8Array.from(atob(body.replace(/\s+/g, '')), (c) => c.charCodeAt(0));
    else if (enc.includes('quoted-printable')) { const s = body.replace(/=\r?\n/g, ''); const arr = []; for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { arr.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else arr.push(s.charCodeAt(i) & 0xff); } bytes = new Uint8Array(arr); }
    else return body;
    try { return new TextDecoder(cs).decode(bytes); } catch (e) { return new TextDecoder('utf-8').decode(bytes); }
  };
  const walk = (h, body) => {
    const ct = hdr(h, 'Content-Type');
    const b = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];
    if (/multipart\//i.test(ct) && b) {
      const parts = body.split('--' + b).slice(1).filter((p) => !p.startsWith('--'));
      let html = null;
      for (const p of parts) {
        const [ph, pb] = split(p.replace(/^\r?\n/, ''));
        const r = walk(ph, pb);
        if (r?.plain) return r;
        if (r?.html && !html) html = r;
      }
      return html;
    }
    if (/text\/html/i.test(ct)) return { html: true, text: decodePart(h, body).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/tr>|<\/div>/gi, '\n').replace(/<\/t[dh]>/gi, '\t').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]{2,}/g, ' ') };
    if (!ct || /text\/plain/i.test(ct)) return { plain: true, text: decodePart(h, body) };
    return null;
  };
  const [h, body] = split(raw);
  const subject = hdr(h, 'Subject');
  const r = walk(h, body);
  return [subject, r?.text || body].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
