import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRed, guionCruce, DURA_CRUCE, enRuta, CAPAS, puntosVuelo, enVuelo, avance } from '../motor/mapaRed.js';

const cimas = [[0.1, 0.3, 0.2], [0.3, 0.7, 0.2], [0.5, 0.3, 0.2], [0.7, 0.7, 0.2], [0.9, 0.3, 0.2]];
const red = crearRed(cimas);
test('la red es real: cada activación sale de sus pesos', () => {
  for (const n of red.nodos) if (n.capa > 0) {
    const entra = red.todas.filter((a) => a.b === n.i), s = entra.reduce((v, a) => v + a.w * red.nodos[a.a].activ, n.sesgo);
    assert.ok(Math.abs(n.activ - 1 / (1 + Math.exp(-s))) < 1e-9);
  }
  assert.ok(red.nodos.every((n) => n.activ >= 0 && n.activ <= 1));
});
test('la ruta pasa por una neurona de cada capa, en orden', () => {
  assert.equal(red.ruta.length, CAPAS.length);
  red.ruta.forEach((i, k) => assert.equal(red.nodos[i].capa, k));
  for (let k = 1; k < red.ruta.length; k++) assert.ok(red.aristas.some((a) => a.a === red.ruta[k - 1] && a.b === red.ruta[k]), 'la arista de la ruta se dibuja');
});
test('las neuronas de la ruta son los capítulos: cada una mira a su montaña', () => {
  cimas.forEach((c, k) => assert.deepEqual(red.nodos[red.ruta[k + 1]].cima, c));
  assert.equal(red.nodos[red.ruta[0]].esCapitulo, false);
});
test('la red nunca se reordena: cada nodo está siempre en el mismo sitio', () => {
  for (const n of red.nodos) { assert.deepEqual(n.caos, n.orden); assert.deepEqual(n.fin, n.orden); }
});
test('el vuelo no da tirones: posición y velocidad cambian de forma continua', () => {
  const P = puntosVuelo(red), pos = (t) => enVuelo(P, guionCruce(t).x), dt = 1 / 60;
  let vAnt = null, saltoMax = 0;
  for (let t = 0.5; t < 24; t += dt) {
    const a = pos(t), b = pos(t + dt), v = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dt;
    if (vAnt !== null) saltoMax = Math.max(saltoMax, Math.abs(v - vAnt));
    vAnt = v;
  }
  assert.ok(saltoMax < 0.2, `la velocidad salta ${saltoMax} entre dos cuadros`);
});
test('el avance acelera y frena con velocidad continua', () => {
  assert.equal(avance(0, 0, 10, 2), 0); assert.ok(Math.abs(avance(10, 0, 10, 2) - 1) < 1e-12);
  let m = 0; for (let t = 0; t < 10; t += 0.01) m = Math.max(m, Math.abs((avance(t + 0.01, 0, 10, 2) - avance(t, 0, 10, 2)) - (avance(t, 0, 10, 2) - avance(t - 0.01, 0, 10, 2))));
  assert.ok(m < 1e-4);
});
test('es determinista: la misma película cada vez', () => {
  assert.deepEqual(crearRed(cimas).ruta, red.ruta);
});
test('el guion: primero estrellas sin conexiones; luego conexiones; luego la red de lejos; y al final, el amanecer', () => {
  const a = guionCruce(1), b = guionCruce(10), m = guionCruce(31), z = guionCruce(DURA_CRUCE);
  assert.equal(a.aristas, 0); assert.ok(b.aristas > 0.2 && b.aristas <= 0.5);
  assert.equal(m.retro > 0.9, true); assert.equal(m.alba, 0);
  assert.equal(z.alba, 1); assert.equal(z.hilos, 1); assert.equal(z.ui, 1); assert.equal(z.fuerza, 0);
});
