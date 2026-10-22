import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const page = await browser.newPage({ viewport: { width: 390, height: 744 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
await page.goto('http://localhost:8080/de/', { waitUntil: 'networkidle' });
await page.locator('[data-drawer-open]').first().click();
await page.waitForTimeout(900);
console.log(await page.evaluate(async () => {
  const sm = document.querySelectorAll('.mnav details > summary')[0];
  const d = sm.parentElement, ul = d.querySelector(':scope > ul');
  const out = [];
  const t0 = performance.now();
  const click = () => sm.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  click();
  let flipped = 0;
  await new Promise((res) => { const f = () => { const t = performance.now() - t0; if (!flipped && t > 150) { flipped = 1; out.push('[zu]'); click(); } if (flipped === 1 && t > 300) { flipped = 2; out.push('[auf]'); click(); } out.push(`${Math.round(t)}:${Math.round(ul.getBoundingClientRect().height)}${d.open ? '' : 'c'}`); if (t < 800) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return out.join(' ');
}));
await browser.close();
