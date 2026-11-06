import test from 'node:test';
import assert from 'node:assert/strict';
import { MARIPOSA, fcmPertenencias, fcmCentros, fcmCoste, fcm, anfisSalida, anfisEntrena, DATOS_ANFIS, INICIO_ANFIS, kmIntervalo } from '../nucleo/aprender.js';

const cerca = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);

test('c-medias: el ejemplo de las distancias 1 y 3', () => {
  const U = fcmPertenencias([[1, 0]], [[0, 0], [4, 0]], 2);
  cerca(U[0][0], 0.9); cerca(U[0][1], 0.1);
});
test('c-medias: las pertenencias de cada punto suman 1, y un punto sobre un centro es suyo', () => {
  const U = fcmPertenencias(MARIPOSA, [[0.5, 3.5], [2, 0.5]], 1.7);
  for (const u of U) cerca(u[0] + u[1], 1);
  assert.deepEqual(fcmPertenencias([[1, 1]], [[1, 1], [3, 3]], 2)[0], [1, 0]);
});
test('c-medias: el centro es la media pesada', () => {
  const v = fcmCentros([[0, 0], [10, 0]], [[1, 0], [0.5, 0.5]], 2);
  cerca(v[0][0], (0.25 * 10) / 1.25); cerca(v[1][0], 10);
});
test('c-medias: el coste nunca sube, y la mariposa se parte por el puente', () => {
  const h = fcm(MARIPOSA, [[0.5, 3.5], [2, 0.5]], 2, 15);
  for (let i = 1; i < h.length; i++) assert.ok(h[i].coste <= h[i - 1].coste + 1e-9);
  const fin = h.at(-1), puente = MARIPOSA.findIndex(([x, y]) => x === 3 && y === 2);
  cerca(fin.U[puente][0], 0.5, 0.02);
  cerca(fcmCoste(MARIPOSA, fin.centros, fin.U, 2), fin.coste);
});
test('ANFIS: la salida es una media pesada', () => {
  const p = { c: [0, 1], s: [0.5, 0.5], z: [2, 4] };
  cerca(anfisSalida(p, 0.5), 3);
});
test('ANFIS: aprender reduce mucho el error', () => {
  const h = anfisEntrena(INICIO_ANFIS, DATOS_ANFIS, { epocas: 600, eta: 0.25, cada: 10 });
  assert.ok(h.at(-1).error < h[0].error / 8, `${h[0].error} → ${h.at(-1).error}`);
  assert.ok(h.at(-1).error < 0.02);
});
test('tipo 2: intervalo de dos reglas, con la fórmula cerrada', () => {
  const [a, b] = kmIntervalo([2, 8], [0.2, 0.4], [0.6, 0.9]);
  cerca(a, (0.6 * 2 + 0.4 * 8) / (0.6 + 0.4)); cerca(b, (0.2 * 2 + 0.9 * 8) / (0.2 + 0.9));
});
test('tipo 2: sin incertidumbre, el intervalo es un punto', () => {
  const [a, b] = kmIntervalo([1, 5, 9], [0.2, 0.5, 0.3], [0.2, 0.5, 0.3]);
  cerca(a, b); cerca(a, (0.2 + 2.5 + 2.7) / 1);
});
test('tipo 2: el intervalo contiene cualquier elección de pesos', () => {
  const z = [1, 4, 6, 9], lo = [0.1, 0.3, 0.2, 0.1], up = [0.5, 0.8, 0.6, 0.4], [a, b] = kmIntervalo(z, lo, up);
  for (let i = 0; i < 300; i++) {
    const w = lo.map((l, k) => l + ((Math.sin(i * (k + 1.3)) + 1) / 2) * (up[k] - l)), y = w.reduce((s, v, k) => s + v * z[k], 0) / w.reduce((s, v) => s + v, 0);
    assert.ok(y >= a - 1e-9 && y <= b + 1e-9);
  }
});
