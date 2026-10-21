import fs from 'node:fs';
import { geoEqualEarth, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
const W = 1000, H = 520;
function build(file, q) {
  let topo = JSON.parse(fs.readFileSync(`node_modules/world-atlas/${file}`, 'utf8'));
  topo = presimplify(topo);
  if (q) topo = simplify(topo, quantile(topo, q));
  const countries = topojson.feature(topo, topo.objects.countries);
  // drop Antarctica
  countries.features = countries.features.filter(f => f.id !== '010' && f.properties.name !== 'Antarctica');
  const projection = geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
  // shift up slightly since antarctica removed: fit to land instead
  projection.fitExtent([[8, 8], [W - 8, H - 8]], countries);
  const path = geoPath(projection).digits(1);
  const geomsNoAnt = { type: 'GeometryCollection', geometries: topo.objects.countries.geometries.filter(g => g.id !== '010') };
  const land = path(topojson.merge(topo, geomsNoAnt.geometries));
  const borders = path(topojson.mesh(topo, geomsNoAnt, (a, b) => a !== b));
  const sphere = path({ type: 'Sphere' });
  const graticule = null;
  return { projection, land, borders, sphere, countries };
}
const lo = build('countries-110m.json', 0);
const hi = build('countries-50m.json', +(process.env.Q||0.12));
console.log('110m land', lo.land.length, 'borders', lo.borders.length);
console.log('50m land', hi.land.length, 'borders', hi.borders.length);
// projection params for client-side lat/lng -> x,y: we export scale/translate (EqualEarth needs formula)
const p = hi.projection;
const out = { W, H, scale: p.scale(), translate: p.translate(), land: hi.land, borders: hi.borders };
fs.mkdirSync('src/assets', { recursive: true });
fs.writeFileSync('src/assets/worldmap.json', JSON.stringify(out));
// sanity: project Hamburg
console.log('Hamburg ->', p([9.99, 53.55]), 'Shanghai ->', p([121.47, 31.23]), 'Lavonia ->', p([-83.1, 34.43]));
console.log('size', fs.statSync('src/assets/worldmap.json').size);
