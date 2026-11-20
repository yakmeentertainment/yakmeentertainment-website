// Ring geometry: every level is drawn as nested superellipse rings (approximate feet, north up).
// The shape and the reference ring come from the arena's building.json.
export function createGeometry({ shapeExp, refRing }) {
  const e = 2 / shapeExp;
  function pt(a, b, t) {
    const th = -Math.PI / 2 + 2 * Math.PI * t, c = Math.cos(th), s = Math.sin(th);
    return [a * Math.sign(c) * Math.pow(Math.abs(c), e), b * Math.sign(s) * Math.pow(Math.abs(s), e)];
  }
  // Arc-length parameterisation from a reference ring, so equal fractions = equal walking distance.
  const M = 1440, cum = [0];
  let prev = pt(refRing[0], refRing[1], 0);
  for (let i = 1; i <= M; i++) { const p = pt(refRing[0], refRing[1], i / M); cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
  const TOT = cum[M];
  function tOf(f) {
    const w = Math.floor(f); f -= w; const target = f * TOT; let lo = 0, hi = M;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m + 1; else hi = m; }
    if (lo === 0) return w;
    const seg = cum[lo] - cum[lo - 1];
    return w + (lo - 1 + (seg ? (target - cum[lo - 1]) / seg : 0)) / M;
  }
  const P = (r, f) => pt(r[0], r[1], tOf(f));
  function arcPts(r, f0, f1, n) { const o = []; for (let i = 0; i <= n; i++) o.push(P(r, f0 + (f1 - f0) * i / n)); return o; }
  function arcLen(r, f0, f1) { const p = arcPts(r, f0, f1, 24); let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  return { pt, tOf, P, arcPts, arcLen };
}
export const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
