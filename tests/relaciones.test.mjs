import test from 'node:test';
import assert from 'node:assert/strict';
import { componer, proyeccion, esReflexiva, esSimetrica, esTransitiva, grupos, extender, sumaDiscreta, sumaTri, restaTri, cortesTri } from '../nucleo/relaciones.js';

test('composición máx-mín', () => {
  const R = [[0.7, 0.2], [0.4, 0.9]], S = [[0.5, 1], [0.8, 0.3]];
  assert.deepEqual(componer(R, S), [[0.5, 0.7], [0.8, 0.4]]);
});
test('la composición es asociativa', () => {
  const A = [[0.2, 0.9], [0.6, 0.1]], B = [[0.3, 0.7], [1, 0.4]], C = [[0.8, 0.5], [0.2, 0.6]];
  assert.deepEqual(componer(componer(A, B), C), componer(A, componer(B, C)));
});
test('proyecciones', () => {
  const R = [[0.1, 0.8, 0.3], [0.5, 0.2, 0.9]];
  assert.deepEqual(proyeccion(R, 'filas'), [0.8, 0.9]);
  assert.deepEqual(proyeccion(R, 'columnas'), [0.5, 0.8, 0.9]);
});
const SIM = [[1, 0.8, 0.4, 0.4, 0.4], [0.8, 1, 0.4, 0.4, 0.4], [0.4, 0.4, 1, 0.9, 0.6], [0.4, 0.4, 0.9, 1, 0.6], [0.4, 0.4, 0.6, 0.6, 1]];
test('una similitud es reflexiva, simétrica y transitiva', () => {
  assert.ok(esReflexiva(SIM) && esSimetrica(SIM) && esTransitiva(SIM));
  assert.equal(esTransitiva([[1, 0.9, 0], [0.9, 1, 0.9], [0, 0.9, 1]]), false);
});
test('sus cortes dan particiones que se refinan', () => {
  assert.deepEqual(grupos(SIM, 0.95), [[0], [1], [2], [3], [4]]);
  assert.deepEqual(grupos(SIM, 0.85), [[0], [1], [2, 3], [4]]);
  assert.deepEqual(grupos(SIM, 0.7), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(grupos(SIM, 0.5), [[0, 1], [2, 3, 4]]);
  assert.deepEqual(grupos(SIM, 0.3), [[0, 1, 2, 3, 4]]);
});
test('principio de extensión: con dos orígenes, el mayor', () => {
  const B = extender([[-1, 0.5], [0, 1], [1, 0.7]], (x) => x * x);
  assert.deepEqual(B, [[0, 1], [1, 0.7]]);
});
test('suma discreta', () => {
  const C = sumaDiscreta([[1, 0.5], [2, 1]], [[1, 0.6], [2, 0.8]]);
  assert.deepEqual(C, [[2, 0.5], [3, 0.6], [4, 0.8]]);
});
test('números triangulares', () => {
  assert.deepEqual(sumaTri([1, 2, 3], [2, 4, 5]), [3, 6, 8]);
  assert.deepEqual(restaTri([1, 2, 3], [1, 2, 3]), [-2, 0, 2]);
  assert.deepEqual(cortesTri([0, 5, 10], 0.6), [3, 7]);
});
