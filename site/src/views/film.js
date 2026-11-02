// Firmenfilm „RITZ in 90 Sekunden“ (Startseite und Unternehmen)
// Bisher nur auf Deutsch: Für eine Sprache ohne Eintrag in FILM entfällt der Block (und der Bühnenlink).
// Dateien: raw/film/<datei>-1080.mp4 und -720.mp4 (Build kopiert sie nach /film/), Standbild raw/img/misc/<poster>.jpg.
// Kapitel: Sekunde, an der das Kapitel im Film beginnt (kurz vor dem ersten Wort des Sprechers).
import { esc, icon, imgTag, imgUrl } from '../lib/util.js';

export const FILM = {
  de: {
    file: 'ritz-film-de',
    poster: 'misc/film-poster-de',
    dur: 90,
    mb: 47,
    title: 'RITZ in 90 Sekunden.',
    lead: 'Vom Wickeln über den Gießharzverguss bis zur Hochspannungsprüfung, von Hamburg bis zu Kunden auf der ganzen Welt: wie RITZ Messwandler baut und wo sie arbeiten.',
    play: 'Film abspielen',
    playLabel: 'Film „RITZ in 90 Sekunden“ mit Ton abspielen',
    hero: 'Film ansehen',
    meta: 'mit Sprecher und Untertiteln',
    chaptersLabel: 'Kapitel des Films',
    chapterAt: 'Kapitel {label} ab {time}',
    text: 'Text des Films',
    download: 'Film herunterladen',
    chapters: [
      [0, 'Strom messen'],
      [14, 'Seit 1945'],
      [26.2, 'Fertigung'],
      [39.8, 'Produkte'],
      [50.1, 'Anwendungen'],
      [55.9, 'Auszeichnungen'],
      [61.9, 'Weltweit'],
      [75.1, 'Gemeinsam'],
    ],
    transcript: [
      'Strom ist überall. Er treibt unsere Städte, unsere Industrie, unseren Alltag. Doch jede Kilowattstunde muss gemessen, geschützt und sicher verteilt werden.',
      'Genau dafür baut RITZ seit 1945 Messwandler – die Präzisionsinstrumente des Stromnetzes. Was in Hamburg begann, ist heute eine internationale Firmengruppe.',
      'Von der Wicklung über den Gießharzverguss bis zur Hochspannungsprüfung: Jedes Gerät entsteht in unseren eigenen Werken. Sogar das Gießharz stellen wir selbst her. Und kein Wandler verlässt das Werk ungeprüft.',
      'Nieder-, Mittel- und Hochspannung bis 550 Kilovolt, elektronische Sensoren, Stromschienen und Gießharzteile – alles aus einer Hand. Im Windpark, im Bahnnetz, in Hochspannungs-Gleichstrom-Trassen und in der Industrie.',
      'Mehrfach ausgezeichnet, zertifiziert und amtlich anerkannt.',
      'Über 1.500 Menschen an zehn Standorten in Europa, China und den USA arbeiten jeden Tag daran – und Vertretungen in über 60 Ländern bringen RITZ zu Kunden auf der ganzen Welt.',
      'Gemeinsam mit unseren Kunden. Für ein stärkeres, nachhaltiges Netz. RITZ. Empowering Our Electrical Future.',
    ],
  },
};

export const filmFor = (ctx) => (ctx.mode === 'static' ? FILM[ctx.lang] || null : null);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const filmUrl = (ctx, F, h) => `${ctx.base}film/${F.file}-${h}.mp4`;

// Link auf der Bühne der Startseite: springt zum Film und startet ihn (ohne Skript nur der Sprung)
export function filmHeroLink(ctx) {
  const F = filmFor(ctx);
  if (!F) return '';
  return `<a class="link link--light st__film" href="#film" data-film-go>${icon('play')}<span>${esc(F.hero)}</span><small>${mmss(F.dur)}</small></a>`;
}

export function filmBlock(ctx, { cls = '' } = {}) {
  const F = filmFor(ctx);
  if (!F) return '';
  const pm = ctx.img[F.poster];
  const poster = pm ? imgTag(ctx, F.poster, { alt: '', sizes: '(max-width: 1440px) 100vw, 1360px', max: 1920 }) : '';
  const posterAttr = pm ? ` poster="${imgUrl(ctx, F.poster, 1280)}"` : '';
  const ch = F.chapters;
  return `<section class="film${cls ? ` ${cls}` : ''}" id="film" aria-labelledby="film-title" data-film data-dur="${F.dur}" data-src="${filmUrl(ctx, F, 1080)}" data-src-s="${filmUrl(ctx, F, 720)}">
  <div class="wrap">
    <div class="film__head" data-reveal="head">
      <h2 class="ch__title" id="film-title">${esc(F.title)}</h2>
      <p class="ch__lead">${esc(F.lead)}</p>
    </div>
    <div class="film__stage" data-reveal="img">
      <video class="film__video" controls playsinline preload="none"${posterAttr}><source src="${filmUrl(ctx, F, 1080)}" type="video/mp4"></video>
      <button class="film__cover" type="button" data-film-play aria-label="${esc(F.playLabel)}" hidden>
        ${poster}
        <span class="film__cta"><span class="film__btn">${icon('play')}</span><span class="film__cta-t"><b>${esc(F.play)}</b><small>${mmss(F.dur)} min, ${esc(F.meta)}</small></span></span>
      </button>
    </div>
    <ol class="film__rail" aria-label="${esc(F.chaptersLabel)}">${ch.map(([s, label], i) => {
      const e = i + 1 < ch.length ? ch[i + 1][0] : F.dur;
      return `<li><button class="film__ch" type="button" data-film-ch="${s}" data-film-end="${e}" aria-label="${esc(F.chapterAt.replace('{label}', label).replace('{time}', mmss(s)))}"><span class="film__track" aria-hidden="true"><i></i></span><time>${mmss(s)}</time><b>${esc(label)}</b></button></li>`;
    }).join('')}</ol>
    <div class="film__foot">
      <details class="film__text"><summary>${esc(F.text)}</summary><div class="film__script">${F.transcript.map((p) => `<p>${esc(p)}</p>`).join('')}</div></details>
      <a class="link film__dl" href="${filmUrl(ctx, F, 1080)}" download="RITZ-Film-${ctx.lang.toUpperCase()}.mp4" data-no-prefetch>${icon('download')}<span>${esc(F.download)}</span><small>MP4, ${F.mb} MB</small></a>
    </div>
  </div>
</section>`;
}
