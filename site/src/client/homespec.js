// Startseite: Live-Vorschau des Spezifikations-Checks (nur Produktindex, ohne Konfiguratordaten)
import { $, getT, getX, getIndex, clientCtx, debounce, handoff } from './core.js';
import { parsePosition, setProductCodes } from '../lib/spec.js';
import { matchProducts } from '../lib/match.js';
import { reqChipsHtml, markedText, homeHitsHtml } from '../lib/reqfmt.js';
import { esc } from '../lib/util.js';

export async function initHomeSpec(root) {
  const box = $('[data-home-spec]', root);
  if (!box || box.__init) return;
  box.__init = true;
  const ta = $('[data-hs-text]', box), marked = $('[data-hs-marked]', box), reqEl = $('[data-hs-req]', box), res = $('[data-hs-res]', box);
  let ready = null;
  const load = () => (ready ||= Promise.all([getT(), getX(), getIndex(), clientCtx()]).then(([t, X, idx, ctx]) => { setProductCodes(idx.products); return { t, X, idx, ctx }; }));
  const update = debounce(async () => {
    const { t, X, idx, ctx } = await load();
    const text = ta.value;
    const p = parsePosition(text);
    marked.innerHTML = markedText(text, p.marks, X.assist);
    reqEl.innerHTML = `<span class="scp__lbl">${esc(X.home.result)}</span>${reqChipsHtml(p.req, t, X.assist, ctx.lang)}`;
    const best = text.trim() ? matchProducts(p.req, idx.products, null, { limit: 3 }).best : [];
    res.innerHTML = homeHitsHtml(ctx, best, X);
  }, 160);
  ta.addEventListener('input', update);
  ta.addEventListener('focus', load, { once: true });
  // Übergabe an den vollständigen Check
  for (const a of box.querySelectorAll('[data-hs-go]')) a.addEventListener('click', () => handoff.put('spec', { text: ta.value }));
}
