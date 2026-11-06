import test from 'node:test';
import assert from 'node:assert/strict';
import { NORMAS_T, dual, yager, sugeno, yagerC, sumaCon, GENERADORES } from '../nucleo/operadores.js';

const V = [0, 0.1, 0.25, 0.5, 0.7, 0.9, 1];
const cerca = (a, b, t = 1e-9) => Math.abs(a - b) < t;

for (const [nombre, T] of Object.entries(NORMAS_T)) {
  test(`${nombre} cumple los cuatro axiomas de norma T`, () => {
    for (const a of V) {
      assert.ok(cerca(T(a, 1), a), 'neutro');
      for (const b of V) {
        assert.ok(cerca(T(a, b), T(b, a)), 'conmutativa');
        for (const c of V) {
          assert.ok(cerca(T(a, T(b, c)), T(T(a, b), c)), 'asociativa');
          if (b <= c) assert.ok(T(a, b) <= T(a, c) + 1e-12, 'monótona');
        }
      }
    }
  });
  test(`${nombre} está por debajo del mínimo y por encima de la drástica`, () => {
    for (const a of V) for (const b of V) {
      assert.ok(T(a, b) <= Math.min(a, b) + 1e-12);
      assert.ok(T(a, b) >= NORMAS_T.drastica(a, b) - 1e-12);
    }
  });
  test(`el dual de ${nombre} es una norma S con neutro 0`, () => {
    const S = dual(T);
    for (const a of V) {
      assert.ok(cerca(S(a, 0), a));
      for (const b of V) assert.ok(S(a, b) >= Math.max(a, b) - 1e-12);
    }
  });
}

test('duales conocidos: máximo, suma algebraica y suma acotada', () => {
  assert.ok(cerca(dual(NORMAS_T.minimo)(0.3, 0.6), 0.6));
  assert.ok(cerca(dual(NORMAS_T.producto)(0.3, 0.6), 0.72));
  assert.ok(cerca(dual(NORMAS_T.lukasiewicz)(0.3, 0.6), 0.9));
});

test('Yager: p = 1 es Łukasiewicz, y p grande se acerca al mínimo', () => {
  assert.ok(cerca(yager(1)(0.7, 0.6), 0.3));
  assert.ok(Math.abs(yager(200)(0.7, 0.6) - 0.6) < 0.01);
});

test('complementos: Sugeno y Yager son involutivos y dan 1 − a con su valor neutro', () => {
  for (const a of V) {
    assert.ok(cerca(sugeno(0)(a), 1 - a));
    assert.ok(cerca(yagerC(1)(a), 1 - a));
    for (const l of [-0.5, 2, 9]) assert.ok(cerca(sugeno(l)(sugeno(l)(a)), a, 1e-9));
    for (const w of [0.5, 2, 3]) assert.ok(cerca(yagerC(w)(yagerC(w)(a)), a, 1e-9));
  }
});

test('un generador reconstruye su norma', () => {
  const p = sumaCon(GENERADORES.producto), l = sumaCon(GENERADORES.lukasiewicz);
  for (const a of [0.2, 0.5, 0.9]) for (const b of [0.3, 0.7]) {
    assert.ok(cerca(p(a, b), a * b, 1e-9));
    assert.ok(cerca(l(a, b), Math.max(0, a + b - 1), 1e-9));
  }
});
