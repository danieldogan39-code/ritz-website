// Dateiimport des Spezifikations-Checks prüfen: erzeugt XLSX, DOCX, PDF, GAEB, CSV und EML und lädt sie hoch.
// node tools/qa/files-probe.mjs <outdir>
import { chromium } from 'playwright-core';
import { zipSync, strToU8 } from 'fflate';
import fs from 'node:fs';
import path from 'node:path';
const out = process.argv[2] || '/tmp/files-probe';
fs.mkdirSync(out, { recursive: true });
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });

// ---- Dateien erzeugen ----
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// XLSX: Tabelle mit Kopfzeile (gemeinsame Zeichenketten + Zahl)
{
  const rows = [['Pos', 'Menge', 'Bezeichnung', 'Übersetzung', 'Klasse', 'Bürde', 'Um'], ['1.1', 3, 'Stromwandler Innenraum', '600/1', '0,2S FS5', '10 VA', '12 kV'], ['1.2', 6, 'Stromwandler Innenraum', '1000/1', '5P20', '15 VA', '12 kV']];
  const ss = [];
  const si = (v) => { let i = ss.indexOf(v); if (i < 0) { ss.push(v); i = ss.length - 1; } return i; };
  const col = (i) => String.fromCharCode(65 + i);
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === 'number' ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="s"><v>${si(v)}</v></c>`)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="LV" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
    'xl/sharedStrings.xml': strToU8(`<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${ss.map((v) => `<si><t>${xmlEsc(v)}</t></si>`).join('')}</sst>`),
  };
  fs.writeFileSync(path.join(out, 'liste.xlsx'), zipSync(files));
}
// DOCX: Absätze + Tabelle
{
  const p = (t) => `<w:p><w:r><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r></w:p>`;
  const tr = (cells) => `<w:tr>${cells.map((c) => `<w:tc>${p(c)}</w:tc>`).join('')}</w:tr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('Anfrage Umspannwerk Süd – Innenraum, 50 Hz, IEC 61869')}${p('Bitte bieten Sie folgende Wandler an:')}<w:tbl>${tr(['Pos', 'Menge', 'Beschreibung'])}${tr(['1', '3', 'Stromwandler 24 kV 300/5/5 A, 0,5 FS5 15 VA, 5P20 10 VA, Ith 20 kA 1 s'])}${tr(['2', '3', 'Spannungswandler einpolig 20000/√3 / 100/√3 / 100/3 V, 0,5 30 VA'])}</w:tbl>${p('Mit freundlichen Grüßen')}</w:body></w:document>`;
  fs.writeFileSync(path.join(out, 'anfrage.docx'), zipSync({ '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'), 'word/document.xml': strToU8(doc) }));
}
// GAEB DA XML (X83)
{
  const item = (rno, qty, short, long) => `<Item RNoPart="${rno}"><Qty>${qty}</Qty><QU>St</QU><Description><CompleteText><DetailTxt><Text><p><span>${xmlEsc(long)}</span></p></Text></DetailTxt><OutlineText><OutlTxt><TextOutlTxt><p><span>${xmlEsc(short)}</span></p></TextOutlTxt></OutlTxt></OutlineText></CompleteText></Description></Item>`;
  const x = `<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2"><PrjInfo><NamePrj>Schaltanlage West</NamePrj></PrjInfo><Award><BoQ><BoQBody><BoQCtgy RNoPart="01"><LblTx><p><span>Messwandler</span></p></LblTx><BoQBody><Itemlist>${item('0010', '6.000', 'Stromwandler Stützerbauform', 'Um 12 kV, Übersetzung 400/5/5 A, Kern 1: 0,5 FS5 10 VA, Kern 2: 5P20 15 VA, Ith 25 kA 1 s, Innenraum, 50 Hz')}${item('0020', '3.000', 'Spannungswandler einpolig', 'Um 12 kV, 10000/√3 / 100/√3 / 100/3 V, Klasse 0,5 30 VA, Spannungsfaktor 1,9 Un 8 h')}</Itemlist></BoQBody></BoQCtgy></BoQBody></BoQ></Award></GAEB>`;
  fs.writeFileSync(path.join(out, 'lv.x83'), x);
}
// CSV mit Kommas und Anführungszeichen (englisches Excel)
fs.writeFileSync(path.join(out, 'list.csv'), 'Item,Qty,Description,Ratio,Class,Burden\n1,4,"Current transformer, indoor, 24 kV",800/5,0.5 FS5,15 VA\n2,4,"Current transformer, indoor, 24 kV",800/1,5P20,10 VA\n');
// E-Mail (quoted-printable)
fs.writeFileSync(path.join(out, 'anfrage.eml'), 'From: einkauf@example.com\r\nTo: info@example.com\r\nSubject: =?UTF-8?Q?Anfrage_Wandler?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nGuten Tag,\r\n\r\nwir ben=C3=B6tigen 8 St=C3=BCck Niederspannungs-Aufsteckstromwandler 2000/5 A =\r\nKl. 0,5 10 VA f=C3=BCr Schiene 100x10.\r\n\r\nGr=C3=BC=C3=9Fe\r\n');
// PDF aus HTML
{
  const pg = await browser.newPage();
  await pg.setContent(`<html><body style="font:12pt Arial"><h1>Leistungsverzeichnis</h1><p>Allgemein: Innenraum, 20-kV-Netz, 50 Hz, IEC 61869.</p><p>1.10 Stromwandler 400/5/5 A, Kern 1: Kl. 0,5 FS5 15 VA, Kern 2: 5P20 10 VA, Ith 25 kA / 1 s. Menge: 6 Stück</p><p>1.20 Stromwandler 200/5 A, Kl. 0,5 FS5 10 VA, Ith 16 kA / 1 s. Menge: 3 Stück</p><table border="1" cellpadding="4"><tr><td>1.30</td><td>Spannungswandler 20000/√3 / 100/√3 / 100/3 V, 0,5 30 VA</td><td>3 Stück</td></tr></table></body></html>`);
  await pg.pdf({ path: path.join(out, 'lv.pdf'), format: 'A4' });
  await pg.close();
}

// ---- Hochladen ----
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const logs = [];
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
await page.goto('http://localhost:8080/de/werkzeuge/spezifikations-check/', { waitUntil: 'networkidle' });
for (const f of ['liste.xlsx', 'anfrage.docx', 'lv.x83', 'list.csv', 'anfrage.eml', 'lv.pdf']) {
  await page.setInputFiles('[data-sc-file]', path.join(out, f));
  await page.waitForFunction(() => /gelesen|nicht|Datei/.test(document.querySelector('[data-sc-status]').textContent), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const status = await page.textContent('[data-sc-status]');
  const cards = await page.$$eval('.scp:not(.scp--pre)', (els) => els.map((e) => `${e.querySelector('.scp__ref')?.textContent} ×${e.querySelector('[data-sc-qty]')?.value} → ${e.querySelector('.scp__name b')?.textContent || '–'} ${e.querySelector('.scp__score b')?.textContent || ''}`));
  console.log(`■ ${f}: ${status}\n   ${cards.join('\n   ')}`);
  if (f === 'lv.pdf') await page.screenshot({ path: path.join(out, 'pdf-result.png'), fullPage: true });
}
console.log(logs.join('\n') || 'keine Konsolenfehler');
await browser.close();
