import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGICAS, NILPOTENTE, neg, inf, sup, AXIOMAS_BL, EXTRA, FORMULAS, rejilla, peorValor, sumaOrdinal, cadena } from '../nucleo/logicas.js';

const G = rejilla(11), todas = Object.entries(LOGICAS);
const cerca = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);

for (const [n, L] of [...todas, ['nilpotente', NILPOTENTE]]) {
  test(`${n}: residuo: T(a, z) ≤ b si y solo si z ≤ a → b`, () => {
    for (const a of G) for (const b of G) for (const z of G) assert.equal(L.t(a, z) <= b + 1e-9, z <= L.r(a, b) + 1e-9, `${a} ${b} ${z}`);
  });
  test(`${n}: a → b vale 1 si y solo si a ≤ b`, () => {
    for (const a of G) for (const b of G) assert.equal(L.r(a, b) >= 1 - 1e-9, a <= b + 1e-9);
  });
}
for (const [n, L] of todas) {
  test(`${n}: los siete axiomas de BL valen siempre 1`, () => {
    for (const ax of AXIOMAS_BL) for (const a of G) for (const b of G) for (const c of G) cerca(ax.f(L, a, b, c), 1, 1e-9);
  });
  test(`${n}: el «y» débil sale del fuerte, y el «o» sale de la implicación`, () => {
    for (const a of G) for (const b of G) { cerca(inf(L, a, b), Math.min(a, b)); cerca(sup(L, a, b), Math.max(a, b)); }
  });
}
test('el axioma extra de cada lógica vale en la suya, y no en otra', () => {
  cerca(peorValor(EXTRA.lukasiewicz, LOGICAS.lukasiewicz), 1);
  assert.ok(peorValor(EXTRA.lukasiewicz, LOGICAS.godel) < 0.5);
  cerca(peorValor(EXTRA.godel, LOGICAS.godel), 1);
  assert.ok(peorValor(EXTRA.godel, LOGICAS.lukasiewicz) < 0.8);
  cerca(peorValor(EXTRA.producto, LOGICAS.producto), 1);
  assert.ok(peorValor(EXTRA.producto, LOGICAS.godel) < 0.9);
});
test('negaciones: Łukasiewicz es 1 − a; las otras, 1 solo en 0', () => {
  cerca(neg(LOGICAS.lukasiewicz, 0.3), 0.7);
  assert.equal(neg(LOGICAS.godel, 0.3), 0); assert.equal(neg(LOGICAS.producto, 0.3), 0);
  assert.equal(neg(LOGICAS.godel, 0), 1);
});
test('nilpotente: es continua por la izquierda, y rompe la divisibilidad', () => {
  assert.equal(NILPOTENTE.t(0.3, 0.6), 0); assert.equal(NILPOTENTE.t(0.6, 0.7), 0.6);
  assert.notEqual(inf(NILPOTENTE, 0.6, 0.3), Math.min(0.6, 0.3));
});
test('tercio excluso y contracción: lo que no es tautología se detecta', () => {
  const ex = FORMULAS.find((f) => f.id === 'tercio'), id = FORMULAS.find((f) => f.id === 'identidad');
  for (const [, L] of todas) { cerca(peorValor(id, L), 1); assert.ok(peorValor(ex, L) < 1); }
});
test('suma ordinal: dentro de cada bloque manda su norma, y fuera el mínimo', () => {
  const T = sumaOrdinal([[0, 0.5, LOGICAS.lukasiewicz.t], [0.5, 1, LOGICAS.producto.t]]);
  cerca(T(0.25, 0.25), 0); cerca(T(0.75, 0.75), 0.5 + 0.5 * 0.25); cerca(T(0.25, 0.75), 0.25);
});
test('cadena de Łukasiewicz con cinco valores', () => {
  assert.deepEqual(cadena(5), [0, 0.25, 0.5, 0.75, 1]);
  cerca(LOGICAS.lukasiewicz.t(0.75, 0.5), 0.25);
});
