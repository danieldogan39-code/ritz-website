// Kompakte Links: Objekt → JSON → (deflate-raw, wenn der Browser es kann) → base64url. Präfix: z = komprimiert, j = JSON.
import { b64url, unb64url } from './ctx.js';

const toB64 = (bytes) => { let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function pack(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream === 'function') {
    try { return 'z' + toB64(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))); } catch (e) { /* weiter unkomprimiert */ }
  }
  return 'j' + b64url(json);
}

export async function unpack(str) {
  if (!str || str.length < 2) throw new Error('empty');
  const kind = str[0], body = str.slice(1);
  if (kind === 'j') return JSON.parse(unb64url(body));
  if (kind === 'z') {
    if (typeof DecompressionStream !== 'function') throw new Error('unsupported');
    return JSON.parse(new TextDecoder().decode(await pipe(fromB64(body), new DecompressionStream('deflate-raw'))));
  }
  throw new Error('format');
}

// kurze, synchrone Variante (Konfigurator-Links)
export const packSync = (obj) => b64url(JSON.stringify(obj));
export const unpackSync = (s) => JSON.parse(unb64url(s));
