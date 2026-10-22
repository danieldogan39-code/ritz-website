// Flaggen für die Sprachauswahl als kleine Inline-SVGs (Flaggen-Emojis zeigt Windows nur als Buchstaben).
// Einheitliches Feld 3:2; Englisch mit dem Union Jack (Sprachfassung en-GB), Spanien ohne Wappen (Handelsflagge).
const S = (inner, vb = '0 0 30 20') => `<svg class="flag" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg>`;
const FLAGS = {
  de: S('<path fill="#000" d="M0 0h30v6.7H0z"/><path fill="#dd0000" d="M0 6.7h30v6.6H0z"/><path fill="#ffce00" d="M0 13.3h30V20H0z"/>'),
  en: S('<path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#fff" stroke-width="6" d="m0 0 60 30m0-30L0 30"/><path stroke="#c8102e" stroke-width="2" d="m0 0 60 30m0-30L0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/>', '0 0 60 30'),
  fr: S('<path fill="#0055a4" d="M0 0h10v20H0z"/><path fill="#fff" d="M10 0h10v20H10z"/><path fill="#ef4135" d="M20 0h10v20H20z"/>'),
  hu: S('<path fill="#cd2a3e" d="M0 0h30v6.7H0z"/><path fill="#fff" d="M0 6.7h30v6.6H0z"/><path fill="#436f4d" d="M0 13.3h30V20H0z"/>'),
  es: S('<path fill="#aa151b" d="M0 0h30v20H0z"/><path fill="#f1bf00" d="M0 5h30v10H0z"/>'),
};
export const flag = (l) => FLAGS[l] || '';
