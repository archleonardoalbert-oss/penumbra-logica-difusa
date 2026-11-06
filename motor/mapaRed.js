// La red neuronal del cruce: pesos y activaciones reales (una pasada hacia delante de verdad), y la ruta que la recorre.
// Las neuronas de la ruta son los capítulos del amanecer: el camino que vuelas al entrar es el curso.
import { ev } from './tiempo.js';

export const CAPAS = [10, 18, 22, 24, 22, 18, 12];
export const DURA_CRUCE = 25;
const sig = (x) => 1 / (1 + Math.exp(-x));

function azar(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; let x = s; x ^= x >>> 15; x = Math.imul(x, 2654435761) >>> 0; return (x ^ (x >>> 13)) >>> 0 ? ((x ^ (x >>> 13)) >>> 0) / 4294967296 : 0.5; }; }

/** `cimas`: dónde está cada capítulo sobre el terreno; hay tantos como capas ocultas. */
export function crearRed(cimas) {
  const r = azar(20261106), nodos = [], porCapa = [];
  CAPAS.forEach((n, c) => {
    const lista = [];
    for (let k = 0; k < n; k++) {
      // en orden, cada capa es una columna, como en los diagramas: así se reconoce de un vistazo
      const altoCapa = 0.46 * Math.sqrt(n / 24), orden = [-0.3 + (1.6 * c) / (CAPAS.length - 1), 0.62 + 0.05 * Math.sin(k * 2.4 + c), 0.9 + altoCapa * (n > 1 ? (2 * k) / (n - 1) - 1 : 0)];
      // el caos es una nube: lo que se ve antes de entender nada
      const az = r() * 6.2832, po = Math.acos(2 * r() - 1), R = 0.55 + 1.5 * Math.cbrt(r());
      const caos = [0.5 + R * Math.sin(po) * Math.cos(az), 0.6 + R * Math.sin(po) * Math.sin(az), 0.85 + 0.8 * R * Math.cos(po)];
      const nodo = { i: nodos.length, capa: c, caos, orden, fin: [orden[0], orden[1] + 0.2, orden[2] + 1.6], sesgo: (r() - 0.5) * 1.2, activ: c === 0 ? r() : 0, esCapitulo: false, ruta: -1 };
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
  for (let k = 1; k + 1 < ruta.length; k++) { const n = nodos[ruta[k]]; if (cimas[k - 1]) { n.fin = cimas[k - 1]; n.esCapitulo = true; } }
  // se dibujan las aristas que pesan, y siempre las de la ruta
  const enRutaE = (e) => nodos[e.a].ruta >= 0 && nodos[e.b].ruta === nodos[e.a].ruta + 1;
  const orden = [...todas].sort((x, y) => Math.abs(y.w) - Math.abs(x.w)), corte = Math.abs(orden[Math.floor(orden.length * 0.2)].w);
  const aristas = todas.filter((e) => enRutaE(e) || Math.abs(e.w) >= corte);
  // polvo: luces sueltas, sin conexiones, que dan profundidad al vuelo y se apagan al ordenarse la red
  const polvo = Array.from({ length: 700 }, () => { const az = r() * 6.2832, po = Math.acos(2 * r() - 1), R = 0.3 + 3 * Math.cbrt(r()), p = [0.5 + R * Math.sin(po) * Math.cos(az), 0.6 + R * Math.sin(po) * Math.sin(az), 0.85 + 0.8 * R * Math.cos(po)]; return { caos: p, activ: r() * r() }; });
  return { nodos, todas, aristas, ruta, porCapa, polvo };
}

/** La posición del vuelo: una curva suave por las neuronas de la ruta, en su caos. u ∈ [0, 1]. */
export function enRuta(red, u) {
  const P = red.ruta.map((i) => red.nodos[i].caos), n = P.length - 1, x = Math.min(n - 1e-9, Math.max(0, u * n)), i = Math.floor(x), f = x - i;
  const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(n, i + 2)];
  if (u <= 0) return [...P[0]]; if (u >= 1) return [...P[n]];
  return [0, 1, 2].map((k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * f + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f * f + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * f * f * f));
}

/** Se avanza rápido entre neuronas y se frena al llegar a cada una, para verla disparar. */
const avanceVuelo = (v, n) => { const x = v * n, i = Math.min(n - 1, Math.floor(x)), f = x - i; return (i + (0.82 * f + 0.18 * (f * f * (3 - 2 * f)) * 1)) / n * 0 + (i + f * f * (3 - 2 * f)) / n; };

export function guionCruce(t) {
  const vuelo = ev(t, 0.9, 10.2);
  return {
    negro: ev(t, 0, 1), vuelo, uVuelo: avanceVuelo(Math.min(1, Math.max(0, (t - 0.9) / 9.3)), CAPAS.length - 1),
    retro: ev(t, 10, 14), orden: ev(t, 10.3, 14.2), aristas: ev(t, 0.8, 4) * 0.35 + 0.65 * ev(t, 11, 14),
    ola: ev(t, 12.6, 13.4), nombres: ev(t, 16, 17.2) * (1 - ev(t, 23.4, 24)), oroRuta: ev(t, 15.2, 17),
    baja: ev(t, 18.4, 23.2), alba: ev(t, 17.6, 23.4), suelo: ev(t, 18, 21.6), giro: ev(t, 18, 23.6), restoSube: ev(t, 18, 21.5), rotulos: ev(t, 23.2, 24.2), camino: ev(t, 21.5, 24), ui: ev(t, 23.4, 24.8),
    textos: [
      ['Cada luz calcula un grado, entre 0 y 1.', ev(t, 2.2, 3) * (1 - ev(t, 5.2, 5.9))],
      ['Y le pasa lo que sabe a las siguientes.', ev(t, 6, 6.8) * (1 - ev(t, 9, 9.7))],
      ['Todas a la vez…', ev(t, 10.6, 11.3) * (1 - ev(t, 12.2, 12.8))],
      ['son una red neuronal, calculando.', ev(t, 13, 13.8) * (1 - ev(t, 15.1, 15.7))],
      ['Y las neuronas que has cruzado son este camino.', ev(t, 15.8, 16.6) * (1 - ev(t, 18.2, 18.9))],
    ],
    titulo: ev(t, 20.4, 21.4) * (1 - ev(t, 23.2, 23.9)),
  };
}
