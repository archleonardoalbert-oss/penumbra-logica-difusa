// El relieve de la portada: una montaña por región, que crece con su grado de dominio, sobre un terreno con rocas y valles.
// La altura se calcula solo aquí; la GPU la recibe como textura, así que lo dibujado y lo calculado no pueden separarse.
const BASE = 0.05, MIN = 0.32, EXTRA = 0.17, SIGMA = 0.07;
const gauss = (d2, s) => Math.exp(-d2 / (2 * s * s));

const hash = (i, j) => {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const suave = (t) => t * t * (3 - 2 * t);
function valor(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = suave(x - i), v = suave(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Crestas: ruido plegado, que da aristas en vez de bultos redondos. Entre 0 y 1. */
export function crestas(x, y) {
  let s = 0, a = 0.5, f = 7, peso = 1, X = x, Y = y;
  for (let k = 0; k < 5; k++) {
    const n = 1 - Math.abs(2 * valor(X * f + 11.3 * k, Y * f - 7.1 * k) - 1), v = n * n * peso;
    s += v * a; peso = Math.min(1, v * 2.2); a *= 0.5; f *= 2.03;
    const X2 = X * 0.86 - Y * 0.5; Y = X * 0.5 + Y * 0.86; X = X2;
  }
  return s;
}

function montanas(x, y, grados, regiones) {
  let m = 0, cerca = 0, dominio = 0;
  regiones.forEach((r, i) => {
    const d2 = (x - r.posicion[0]) ** 2 + (y - r.posicion[1]) ** 2, g = grados[i] ?? 0;
    const k = gauss(d2, SIGMA);
    m += (MIN + EXTRA * g) * k;
    cerca = Math.max(cerca, gauss(d2, 0.016));
    dominio = Math.max(dominio, g * gauss(d2, SIGMA * 1.7));
  });
  return { m, cerca, dominio };
}
const lejos = (x, y) => { const r = Math.hypot(x - 0.5, y - 0.5), t = Math.min(1, Math.max(0, (r - 0.7) / 0.5)); return t * t * (3 - 2 * t); };
/** Lo que no depende del progreso: la roca y la cordillera lejana. */
const relieve = (x, y) => { const c = crestas(x, y); return { c, fondo: lejos(x, y) * (0.08 + 0.5 * c) }; };
const mezclar = (m, cerca, c, fondo) => Math.min(1, Math.max(0, BASE + m + fondo + (1 - cerca) * c * (0.04 + 0.5 * Math.min(1, m * 2))));

export function alturaMapa(x, y, grados, regiones, sube = 1) {
  const { m, cerca } = montanas(x, y, grados, regiones), { c, fondo } = relieve(x, y);
  return sube * mezclar(m, cerca, c, fondo);
}

/** La altura en la cima de una región: la roca no la toca, así que se puede calcular sin ruido. */
export const alturaCima = (r, grados, regiones, sube = 1) => alturaMapa(r.posicion[0], r.posicion[1], grados, regiones, sube);

export const DOMINIO = [-1, 2];
let cache = null;
/** Textura N×N de parejas (altura, dominio). La roca se calcula una sola vez: es lo caro. */
export function campoMapa(regiones, grados, N = 640) {
  const [a, b] = DOMINIO, paso = (b - a) / (N - 1);
  if (!cache || cache.N !== N) {
    const C = new Float32Array(N * N), L = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const { c, fondo } = relieve(a + i * paso, a + j * paso); C[j * N + i] = c; L[j * N + i] = fondo; }
    cache = { N, C, L };
  }
  const out = new Float32Array(N * N * 2);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const { m, cerca, dominio } = montanas(a + i * paso, a + j * paso, grados, regiones), k = j * N + i;
    out[2 * k] = mezclar(m, cerca, cache.C[k], cache.L[k]);
    out[2 * k + 1] = Math.min(1, dominio);
  }
  return out;
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
