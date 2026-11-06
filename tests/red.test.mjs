import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRed, guionCruce, DURA_CRUCE, enRuta, CAPAS } from '../motor/mapaRed.js';

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
test('las neuronas de la ruta son los capítulos: acaban sobre su montaña', () => {
  cimas.forEach((c, k) => assert.deepEqual(red.nodos[red.ruta[k + 1]].fin, c));
  assert.equal(red.nodos[red.ruta[0]].esCapitulo, false);
});
test('es determinista: la misma película cada vez', () => {
  assert.deepEqual(crearRed(cimas).ruta, red.ruta);
});
test('el guion va del vuelo a la red ordenada, y de ahí al amanecer', () => {
  const a = guionCruce(0), m = guionCruce(14.5), z = guionCruce(DURA_CRUCE);
  assert.equal(a.orden, 0); assert.equal(a.alba, 0); assert.equal(a.vuelo, 0);
  assert.equal(m.vuelo, 1); assert.equal(m.orden, 1); assert.equal(m.alba, 0);
  assert.equal(z.alba, 1); assert.equal(z.baja, 1); assert.equal(z.ui, 1);
});
test('enRuta recorre las neuronas en orden', () => {
  const p = (u) => enRuta(red, u);
  assert.deepEqual(p(0), red.nodos[red.ruta[0]].caos);
  assert.deepEqual(p(1), red.nodos[red.ruta.at(-1)].caos);
});
