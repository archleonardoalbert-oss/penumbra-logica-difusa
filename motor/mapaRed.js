// La red neuronal del cruce: pesos y activaciones reales (una pasada hacia delante de verdad), y la ruta que la recorre.
// Las neuronas de la ruta son los capítulos del amanecer: el camino que vuelas al entrar es el curso.
import { ev } from './tiempo.js';

export const CAPAS = [10, 18, 22, 24, 22, 18, 12];
export const DURA_CRUCE = 43;
export const CENTRO_RED = [0.5, 2.7, 1.55];
const sig = (x) => 1 / (1 + Math.exp(-x));

function azar(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; let x = s; x ^= x >>> 15; x = Math.imul(x, 2654435761) >>> 0; return (x ^ (x >>> 13)) >>> 0 ? ((x ^ (x >>> 13)) >>> 0) / 4294967296 : 0.5; }; }

/** `cimas`: dónde está cada capítulo sobre el terreno; hay tantos como capas ocultas. */
export function crearRed(cimas) {
  const r = azar(20261106), nodos = [], porCapa = [];
  CAPAS.forEach((n, c) => {
    const lista = [];
    for (let k = 0; k < n; k++) {
      // cada capa es un disco en el espacio. Desde dentro parecen estrellas; desde lejos y de lado, las columnas de una red. Nunca se mueven.
      const th = r() * 6.2832, rad = 0.12 + 0.88 * Math.sqrt(r()), altoCapa = 0.95 * Math.sqrt(n / 24);
      const orden = [CENTRO_RED[0] - 1.75 + (3.5 * c) / (CAPAS.length - 1) + (r() - 0.5) * 0.02, CENTRO_RED[1] + 0.3 * altoCapa * rad * Math.cos(th), CENTRO_RED[2] + altoCapa * rad * Math.sin(th)];
      const caos = orden;
      const nodo = { i: nodos.length, capa: c, caos, orden, fin: orden, cima: null, sesgo: (r() - 0.5) * 1.2, activ: c === 0 ? r() : 0, esCapitulo: false, ruta: -1 };
      nodos.push(nodo); lista.push(nodo);
    }
    porCapa.push(lista);
  });
  const todas = [];
  for (let c = 0; c + 1 < CAPAS.length; c++) for (const b of porCapa[c + 1]) for (const a of porCapa[c]) todas.push({ a: a.i, b: b.i, w: (r() - 0.5) * 2.4 / Math.sqrt(CAPAS[c] / 10) });
  // la pasada hacia delante
  for (let c = 1; c < CAPAS.length; c++) for (const b of porCapa[c]) {
    let s = b.sesgo;
    for (const e of todas) if (e.b === b.i) s += e.w * nodos[e.a].activ;
    b.activ = sig(s);
  }
  // la ruta: en cada capa, la neurona a la que más empuja la anterior
  const inicio = porCapa[0].reduce((m, n) => (n.activ > m.activ ? n : m)), ruta = [inicio.i];
  for (let c = 1; c < CAPAS.length; c++) {
    const previa = ruta.at(-1);
    let mejor = null, mv = -Infinity;
    for (const e of todas) if (e.a === previa) { const v = e.w * nodos[previa].activ + nodos[e.b].activ * 0.4; if (v > mv && nodos[e.b].capa === c) { mv = v; mejor = e.b; } }
    ruta.push(mejor);
  }
  ruta.forEach((i, k) => { nodos[i].ruta = k; });
  // los capítulos: las capas ocultas de la ruta
  for (let k = 1; k + 1 < ruta.length; k++) { const n = nodos[ruta[k]]; if (cimas[k - 1]) { n.cima = cimas[k - 1]; n.esCapitulo = true; } }
  // se dibujan las aristas que pesan, y siempre las de la ruta
  const enRutaE = (e) => nodos[e.a].ruta >= 0 && nodos[e.b].ruta === nodos[e.a].ruta + 1;
  const orden = [...todas].sort((x, y) => Math.abs(y.w) - Math.abs(x.w)), corte = Math.abs(orden[Math.floor(orden.length * 0.2)].w);
  const aristas = todas.filter((e) => enRutaE(e) || Math.abs(e.w) >= corte);
  // polvo: luces sueltas, sin conexiones: el fondo de estrellas del viaje. Se apagan al alejarse, y queda solo la red.
  const polvo = Array.from({ length: 1400 }, () => { const az = r() * 6.2832, po = Math.acos(2 * r() - 1), R = 0.5 + 8 * Math.cbrt(r()), p = [CENTRO_RED[0] - 1.2 + R * Math.sin(po) * Math.cos(az), CENTRO_RED[1] + R * Math.sin(po) * Math.sin(az), CENTRO_RED[2] + 0.8 * R * Math.cos(po)]; return { caos: p, activ: r() * r() }; });
  return { nodos, todas, aristas, ruta, porCapa, polvo };
}

/** El vuelo: una sola curva suave, desde lejos, pasando junto a cada neurona de la ruta. x va de 0 a n: x = i + 1 es la neurona i. */
export function puntosVuelo(red) {
  const P = red.ruta.map((i) => red.nodos[i].orden), a = P[0], z = P.at(-1);
  return [[a[0] - 7, a[1] - 0.2, a[2] + 0.15], [a[0] - 2.6, a[1] - 0.1, a[2] + 0.06], ...P, [z[0] + 0.32, z[1] - 0.42, z[2] + 0.1]];
}
export function enVuelo(P, x) {
  const n = P.length - 1, u = Math.min(n - 1e-9, Math.max(0, x)), i = Math.floor(u), f = u - i;
  const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(n, i + 2)];
  return [0, 1, 2].map((k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * f + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f * f + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * f * f * f));
}
export const enRuta = (red, u) => enVuelo(puntosVuelo(red), u * (puntosVuelo(red).length - 1));

/** Avance sin tirones: acelera despacio, va a velocidad casi constante y frena despacio. Su derivada es continua. */
export function avance(t, a, b, r) {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a))), k = r / (b - a), v = 1 / (1 - k);
  if (u < k) return (v * u * u) / (2 * k);
  if (u > 1 - k) return 1 - (v * (1 - u) ** 2) / (2 * k);
  return v * (u - k / 2);
}

export function guionCruce(t) {
  const N = CAPAS.length + 2, s = avance(t, 0, 24.5, 5.5), R = ev(t, 24, 32.2);
  // una leve respiración al pasar junto a cada neurona, para verla; nunca llega a detenerse
  const x = Math.min(N, Math.max(0, s * N + 0.12 * Math.sin(s * N * 6.2832) * Math.min(s * 6, 1) * Math.min((1 - s) * 6, 1)));
  return {
    x, vuelo: Math.min(1, s * 1.0), negro: ev(t, 0, 1.4),
    uVuelo: Math.max(0, x - 2), // en qué neurona vas: 0 es la primera de la ruta
    retro: R, orden: 1, baja: 0, lejos: ev(t, 23.5, 29.5),
    aristas: 0.5 * ev(t, 6.5, 12) + 0.5 * ev(t, 27, 31), polvo: 1 - ev(t, 25.5, 30),
    ola: ev(t, 29.5, 30.5), nombres: ev(t, 33.4, 34.6) * (1 - ev(t, 37.8, 38.6)), oroRuta: ev(t, 32, 34),
    hilos: ev(t, 35.4, 37.8), alba: ev(t, 35.5, 41), suelo: ev(t, 36, 39.5), giro: ev(t, 36.5, 41.5), fuerza: 1 - ev(t, 37.7, 39.9),
    rotulos: ev(t, 40.6, 41.6), camino: ev(t, 39.5, 41.8), ui: ev(t, 41.4, 42.8),
    textos: [
      ['Parecen estrellas.', ev(t, 2.2, 3.2) * (1 - ev(t, 5.2, 6.2))],
      ['Pero están conectadas.', ev(t, 8, 9) * (1 - ev(t, 11.2, 12.2))],
      ['Cada una calcula un grado, y se lo pasa a las siguientes.', ev(t, 14, 15) * (1 - ev(t, 18.6, 19.6))],
      ['Es una red neuronal.', ev(t, 30.2, 31.2) * (1 - ev(t, 32.8, 33.5))],
      ['Y las neuronas que has cruzado son este camino.', ev(t, 33.6, 34.5) * (1 - ev(t, 36.6, 37.4))],
    ],
    titulo: ev(t, 39.2, 40.2) * (1 - ev(t, 41.2, 41.9)),
  };
}
