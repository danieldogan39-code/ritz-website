// Landmaske der Netzkarte außerhalb des Hauptthreads: Landfläche (SVG-Pfad) in eine OffscreenCanvas füllen und als
// 0/1-Raster zurückgeben (netmap.js; ohne Worker oder OffscreenCanvas rechnet netmap.js dasselbe selbst).
// Wird beim Build unverändert (nur verkleinert) nach vendor/nm-raster.js kopiert – klassischer Worker, kein Modul.
onmessage = (e) => {
  try {
    const { d, jobs } = e.data;
    const path = new Path2D(d);
    const out = jobs.map(([box, R]) => {
      const w = Math.ceil((box[2] - box[0]) * R), h = Math.ceil((box[3] - box[1]) * R);
      const x = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
      x.setTransform(R, 0, 0, R, -box[0] * R, -box[1] * R);
      x.fillStyle = '#fff';
      x.fill(path);
      const u = new Uint32Array(x.getImageData(0, 0, w, h).data.buffer);
      const m = new Uint8Array(w * h);
      for (let i = 0; i < m.length; i++) m[i] = (u[i] >>> 24) > 110 ? 1 : 0;
      return { box, R, w, h, m };
    });
    postMessage({ ok: true, out }, out.map((o) => o.m.buffer));
  } catch (err) {
    postMessage({ ok: false });
  }
};
