// Verursacher horizontaler Überläufe finden: node tools/qa/overflow.mjs 390 /de/datenschutz/ ...
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const width = Number(process.argv[2] || 390);
const paths = process.argv.slice(3);
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768 });
for (const p of paths) {
  await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const W = document.documentElement.clientWidth; const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.ownerSVGElement) continue;
      const b = el.getBoundingClientRect();
      if (b.right > W + 1 && b.width > 0) {
        // nur das innerste Element melden
        const kids = [...el.children].some((c) => c.getBoundingClientRect().right > W + 1);
        if (!kids) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} r=${Math.round(b.right)} "${(el.textContent || '').trim().slice(0, 50)}"`);
      }
      if (out.length > 6) break;
    }
    const sw = document.documentElement.scrollWidth;
    // Text, der über seine Box hinausläuft (lange Wörter)
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; const rng = document.createRange();
    while ((n = tw.nextNode()) && out.length < 8) {
      if (!n.textContent.trim()) continue;
      rng.selectNodeContents(n);
      const rr = rng.getBoundingClientRect();
      if (rr.right > W + 1 && rr.width > 0) out.push(`TEXT in ${n.parentElement.tagName.toLowerCase()}.${[...n.parentElement.classList].join('.')} r=${Math.round(rr.right)} "${n.textContent.trim().slice(0, 60)}"`);
    }
    // auch Elemente mit Kindern melden, wenn nichts Inneres gefunden wurde
    if (!out.length && sw > W + 1) for (const el of document.querySelectorAll('body *')) { const b = el.getBoundingClientRect(); if (b.right > W + 1 && !el.ownerSVGElement) out.push(`(${el.tagName.toLowerCase()}.${[...el.classList].join('.')} r=${Math.round(b.right)} pos=${getComputedStyle(el).position})`); if (out.length > 8) break; }
    return { sw, W, out };
  });
  console.log(p, r.sw, r.W, '\n  ' + r.out.join('\n  '));
}
await browser.close();
