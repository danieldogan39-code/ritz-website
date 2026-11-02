// Firmenfilm „RITZ in 90 Sekunden“ (Startseite und Unternehmen)
// Deutsch: deutscher Film. EN, FR, HU, ES: englischer Sprecher mit Texten und Untertiteln in der Sprache der Seite.
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

// Internationale Fassungen: englischer Sprecher, Texte im Bild und Untertitel in der Sprache der Seite
// (Quelle der Texte: social/ritz-video/v2/sprachen.py). Kapitel nach den Zeiten des englischen Sprechers.
const CH_EN = [0, 14.5, 27.5, 40.4, 50.8, 55.9, 61.9, 75.1];
const intl = (lang, o) => ({ file: `ritz-film-${lang}`, poster: 'misc/film-poster-de', dur: 90, ...o, chapters: CH_EN.map((s, i) => [s, o.chapters[i]]) });
FILM.en = intl('en', {
  mb: 47,
  title: 'RITZ in 90 seconds.',
  lead: 'From winding and resin casting to high-voltage testing, from Hamburg to customers around the world: how RITZ builds instrument transformers and where they are at work.',
  play: 'Play film', playLabel: 'Play the film “RITZ in 90 seconds” with sound', hero: 'Watch film', meta: 'with narration and subtitles',
  chaptersLabel: 'Film chapters', chapterAt: 'Chapter {label} from {time}', text: 'Film transcript', download: 'Download film',
  chapters: ['Measuring power', 'Since 1945', 'Production', 'Products', 'Applications', 'Awards', 'Worldwide', 'Together'],
  transcript: [
    'Electricity is everywhere. It powers our cities, our industry, our everyday lives. But every kilowatt-hour has to be measured, protected and safely distributed.',
    'That is exactly why RITZ has been building instrument transformers since 1945 – the precision instruments of the power grid. What began in Hamburg is now an international group of companies.',
    'From winding and resin casting to high-voltage testing: every device is made in our own plants. We even produce the cast resin ourselves. And no transformer leaves the plant untested.',
    'Low, medium and high voltage up to 550 kilovolts, electronic sensors, busbars and cast resin parts – all from a single source. In wind farms, rail networks, high-voltage DC links and industry.',
    'Award-winning, certified and officially recognised.',
    'More than 1,500 people at ten sites in Europe, China and the USA work on this every day – and representatives in over 60 countries bring RITZ to customers around the world.',
    'Together with our customers. For a stronger, more sustainable grid. RITZ. Empowering Our Electrical Future.',
  ],
});
FILM.fr = intl('fr', {
  mb: 47,
  title: 'RITZ en 90 secondes.',
  lead: 'Du bobinage et de la coulée de résine aux essais haute tension, de Hambourg aux clients du monde entier : comment RITZ fabrique ses transformateurs de mesure et où ils sont utilisés.',
  play: 'Lire le film', playLabel: 'Lire le film « RITZ en 90 secondes » avec le son', hero: 'Voir le film', meta: 'en anglais, sous-titré en français',
  chaptersLabel: 'Chapitres du film', chapterAt: 'Chapitre {label} à partir de {time}', text: 'Texte du film', download: 'Télécharger le film',
  chapters: ['Mesurer le courant', 'Depuis 1945', 'Fabrication', 'Produits', 'Applications', 'Distinctions', 'Dans le monde', 'Ensemble'],
  transcript: [
    'L’électricité est partout. Elle alimente nos villes, notre industrie, notre quotidien. Mais chaque kilowattheure doit être mesuré, protégé et distribué en toute sécurité.',
    'C’est précisément pour cela que RITZ fabrique des transformateurs de mesure depuis 1945 – les instruments de précision du réseau électrique. Née à Hambourg, RITZ est aujourd’hui un groupe international.',
    'Bobinage, coulée de résine, essais haute tension : chaque appareil est fabriqué dans nos propres usines. Nous produisons même notre résine. Et aucun transformateur ne quitte l’usine sans essai.',
    'Basse, moyenne et haute tension jusqu’à 550 kilovolts, capteurs électroniques, jeux de barres, pièces en résine – tout d’un seul fournisseur. Dans les parcs éoliens, les réseaux ferroviaires, les liaisons CCHT et l’industrie.',
    'Primée, certifiée et officiellement reconnue.',
    'Plus de 1 500 personnes sur dix sites en Europe, en Chine et aux États-Unis y travaillent chaque jour – et nos représentations dans plus de 60 pays rapprochent RITZ des clients du monde entier.',
    'Ensemble avec nos clients. Pour un réseau plus fort et plus durable. RITZ. Empowering Our Electrical Future.',
  ],
});
FILM.hu = intl('hu', {
  mb: 47,
  title: 'A RITZ 90 másodpercben.',
  lead: 'A tekercseléstől és a gyantaöntéstől a nagyfeszültségű vizsgálatig, Hamburgtól az ügyfelekig szerte a világon: így készülnek a RITZ mérőváltói, és itt dolgoznak.',
  play: 'Film lejátszása', playLabel: 'A „RITZ 90 másodpercben” film lejátszása hanggal', hero: 'Film megtekintése', meta: 'angolul, magyar felirattal',
  chaptersLabel: 'A film fejezetei', chapterAt: '{label} fejezet ({time})', text: 'A film szövege', download: 'Film letöltése',
  chapters: ['Árammérés', '1945 óta', 'Gyártás', 'Termékek', 'Alkalmazások', 'Díjak', 'Világszerte', 'Együtt'],
  transcript: [
    'Az áram mindenütt jelen van. Városainkat, iparunkat, mindennapjainkat működteti. De minden kilowattórát mérni, védeni és biztonságosan elosztani kell.',
    'A RITZ éppen ezért gyárt 1945 óta mérőváltókat – az elektromos hálózat precíziós műszereit. Ami Hamburgban kezdődött, ma nemzetközi vállalatcsoport.',
    'Tekercselés, gyantaöntés, nagyfeszültségű vizsgálat: minden készülék saját gyárainkban készül. Még az öntőgyantát is magunk állítjuk elő. És egyetlen váltó sem hagyja el vizsgálat nélkül a gyárat.',
    'Kis-, közép- és nagyfeszültség 550 kilovoltig, elektronikus érzékelők, sínek, öntött gyanta alkatrészek – minden egy kézből. Szélparkokban, vasúti hálózatokban, HVDC-összeköttetésekben és az iparban.',
    'Díjazott, tanúsított és hatóságilag elismert.',
    'Több mint 1500 ember tíz telephelyen, Európában, Kínában és az USA-ban dolgozik ezen nap mint nap – és több mint 60 ország képviseletei viszik el a RITZ-et az ügyfelekhez szerte a világon.',
    'Együtt ügyfeleinkkel. Egy erősebb, fenntarthatóbb hálózatért. RITZ. Empowering Our Electrical Future.',
  ],
});
FILM.es = intl('es', {
  mb: 47,
  title: 'RITZ en 90 segundos.',
  lead: 'Del bobinado y el colado de resina al ensayo de alta tensión, de Hamburgo a clientes de todo el mundo: cómo fabrica RITZ sus transformadores de medida y dónde trabajan.',
  play: 'Reproducir vídeo', playLabel: 'Reproducir el vídeo «RITZ en 90 segundos» con sonido', hero: 'Ver vídeo', meta: 'en inglés, con subtítulos en español',
  chaptersLabel: 'Capítulos del vídeo', chapterAt: 'Capítulo {label} desde {time}', text: 'Texto del vídeo', download: 'Descargar vídeo',
  chapters: ['Medir la energía', 'Desde 1945', 'Fabricación', 'Productos', 'Aplicaciones', 'Premios', 'En el mundo', 'Juntos'],
  transcript: [
    'La electricidad está en todas partes. Impulsa nuestras ciudades, nuestra industria, nuestra vida diaria. Pero cada kilovatio hora debe medirse, protegerse y distribuirse de forma segura.',
    'Por eso RITZ fabrica transformadores de medida desde 1945: los instrumentos de precisión de la red eléctrica. Lo que empezó en Hamburgo es hoy un grupo empresarial internacional.',
    'Del bobinado y el colado de resina al ensayo de alta tensión: cada equipo se fabrica en nuestras propias plantas. Incluso producimos nosotros mismos la resina. Y ningún transformador sale de fábrica sin ensayar.',
    'Baja, media y alta tensión hasta 550 kilovoltios, sensores electrónicos, barras y piezas de resina colada: todo de un mismo proveedor. En parques eólicos, redes ferroviarias, enlaces HVDC y la industria.',
    'Premiada, certificada y reconocida oficialmente.',
    'Más de 1500 personas en diez sedes de Europa, China y EE. UU. trabajan en ello cada día, y representantes en más de 60 países acercan RITZ a clientes de todo el mundo.',
    'Junto a nuestros clientes. Por una red más fuerte y sostenible. RITZ. Empowering Our Electrical Future.',
  ],
});

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
