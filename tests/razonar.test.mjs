import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPLICACIONES, muy, algo, mpMamdani, cerrar, alfaOp, componerAlfa } from '../nucleo/razonar.js';
import { componer } from '../nucleo/relaciones.js';

for (const [n, I] of Object.entries(IMPLICACIONES)) {
  test(`${n} coincide con la implicación clásica en las esquinas`, () => {
    assert.equal(I(0, 0), 1); assert.equal(I(0, 1), 1); assert.equal(I(1, 1), 1); assert.equal(I(1, 0), 0);
  });
}
test('valores conocidos', () => {
  assert.ok(Math.abs(IMPLICACIONES.kleene(0.7, 0.4) - 0.4) < 1e-9);
  assert.ok(Math.abs(IMPLICACIONES.lukasiewicz(0.7, 0.4) - 0.7) < 1e-9);
  assert.equal(IMPLICACIONES.godel(0.7, 0.4), 0.4);
  assert.equal(IMPLICACIONES.godel(0.4, 0.7), 1);
});
test('modificadores', () => {
  assert.ok(Math.abs(muy(0.7) - 0.49) < 1e-9);
  assert.ok(Math.abs(algo(0.49) - 0.7) < 1e-9);
});
test('modus ponens de Mamdani: recorta B a la altura del solape', () => {
  const dom = Array.from({ length: 101 }, (_, i) => i / 10);
  const A = (x) => Math.max(0, 1 - Math.abs(x - 3) / 2), Ap = (x) => Math.max(0, 1 - Math.abs(x - 5) / 2), B = (y) => Math.max(0, 1 - Math.abs(y - 6) / 3);
  const { altura, salida } = mpMamdani(Ap, A, B, dom);
  assert.ok(Math.abs(altura - 0.5) < 1e-9);
  assert.ok(Math.abs(salida(6) - 0.5) < 1e-9);
  assert.ok(Math.abs(salida(4) - Math.min(0.5, B(4))) < 1e-9);
});
test('el operador alfa: el mayor c con mín(a, c) ≤ b', () => {
  assert.equal(alfaOp(0.3, 0.7), 1);
  assert.equal(alfaOp(0.7, 0.3), 0.3);
  for (const a of [0.2, 0.6]) for (const b of [0.1, 0.5]) assert.ok(Math.min(a, alfaOp(a, b)) <= b);
});
test('ecuaciones relacionales: la solución mayor', () => {
  const P = [[0.8, 0.3], [0.5, 1]], Q = [[0.4, 0.9], [0.6, 0.2]], R = componer(P, Q);
  const G = componerAlfa(P, R);
  assert.deepEqual(componer(P, G), R);
  G.forEach((f, i) => f.forEach((v, j) => assert.ok(v >= Q[i][j] - 1e-9)));
});
test('cerrar es idempotente', () => { assert.equal(cerrar(1.2), 1); assert.equal(cerrar(-1), 0); });
