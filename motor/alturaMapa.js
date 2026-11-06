// La altura del terreno de la portada: una colina por región, que crece con su grado de dominio.
const BASE = 0.04, MIN = 0.16, EXTRA = 0.62, SIGMA = 0.085;

export function alturaMapa(x, y, grados, regiones, sube = 1) {
  let h = BASE;
  regiones.forEach((r, i) => {
    const d2 = (x - r.posicion[0]) ** 2 + (y - r.posicion[1]) ** 2;
    h += (MIN + EXTRA * (grados[i] ?? 0)) * Math.exp(-d2 / (2 * SIGMA * SIGMA));
  });
  return sube * Math.min(1, Math.max(0, h));
}

/** El mismo cálculo en GLSL, con un uniforme g0, g1… por región y `sube`. */
export function glslMapa(regiones) {
  const f = (v) => v.toFixed(3);
  const sumas = regiones.map((r, i) => `h+=(${f(MIN)}+${f(EXTRA)}*g${i})*exp(-((x-${f(r.posicion[0])})*(x-${f(r.posicion[0])})+(y-${f(r.posicion[1])})*(y-${f(r.posicion[1])}))/${(2 * SIGMA * SIGMA).toFixed(6)});`).join('');
  return `float h=${f(BASE)};${sumas}return sube*clamp(h,0.,1.);`;
}

/** Índice del centro más cercano a `p` dentro del radio, o -1. */
export function regionEn(p, centros, radio) {
  let mejor = -1, md = radio;
  centros.forEach((c, i) => {
    const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
    if (d < md) { md = d; mejor = i; }
  });
  return mejor;
}
