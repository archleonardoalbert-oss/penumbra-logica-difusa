import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clasico, triangular, trapecial, gaussiana, campana, sigmoide, altura, soporte, nucleo, corteAlfa, corteFuerte,
  esNormal, esConvexo, reconstruir, cardinalSigma, contenido, grado,
} from '../nucleo/difuso.js';

const assertIntervalos = (real, esperado, tol) => {
  assert.equal(real.length, esperado.length, JSON.stringify(real));
  real.forEach(([a, b], i) => {
    assert.ok(Math.abs(a - esperado[i][0]) < tol, `inicio ${a} ≠ ${esperado[i][0]}`);
    assert.ok(Math.abs(b - esperado[i][1]) < tol, `final ${b} ≠ ${esperado[i][1]}`);
  });
};

test('corte de un triángulo', () => {
  const m = triangular(0, 5, 10);
  assertIntervalos(corteAlfa(m, 0.5, [0, 10]), [[2.5, 7.5]], 0.01);
  assertIntervalos(corteAlfa(m, 1, [0, 10]), [[5, 5]], 0.01);
});

test('una función con dos picos no es convexa', () => {
  const m = (x) => Math.max(gaussiana(3, 0.5)(x), gaussiana(7, 0.5)(x));
  assert.equal(esConvexo(m, [0, 10]), false);
  assert.equal(corteAlfa(m, 0.5, [0, 10]).length, 2);
});

test('convexo equivale a cortes de un solo intervalo', () => {
  const casos = [triangular(1, 4, 9), trapecial(1, 3, 7, 9), gaussiana(5, 1), campana(5, 2, 2), sigmoide(5, 0.5)];
  for (const m of casos) {
    assert.equal(esConvexo(m, [0, 10]), true);
    for (let a = 0.05; a < 1; a += 0.05) assert.ok(corteAlfa(m, a, [0, 10]).length <= 1);
  }
});

test('teorema de representación: los cortes reconstruyen el conjunto', () => {
  const m = gaussiana(5, 1), r = reconstruir(m, [0, 10], 400);
  for (let x = 0; x <= 10; x += 0.1) assert.ok(Math.abs(r(x) - m(x)) < 0.004, `x=${x}`);
});

test('reconstruir con pocos niveles aproxima por debajo', () => {
  const m = gaussiana(5, 1), r = reconstruir(m, [0, 10], 4);
  for (let x = 0; x <= 10; x += 0.1) assert.ok(r(x) <= m(x) + 1e-9);
  assert.ok(Math.abs(r(5) - 1) < 1e-9);
});

test('soporte, núcleo y altura de un trapecio', () => {
  const m = trapecial(1, 3, 7, 9);
  assertIntervalos(soporte(m, [0, 10]), [[1, 9]], 0.01);
  assertIntervalos(nucleo(m, [0, 10]), [[3, 7]], 0.01);
  assert.ok(Math.abs(altura(m, [0, 10]) - 1) < 1e-6);
  assert.equal(esNormal(m, [0, 10]), true);
});

test('subnormal: gaussiana escalada a 0,6', () => {
  const g = gaussiana(5, 1), m = (x) => 0.6 * g(x);
  assert.ok(Math.abs(altura(m, [0, 10]) - 0.6) < 1e-3);
  assert.equal(esNormal(m, [0, 10]), false);
  assert.deepEqual(nucleo(m, [0, 10]), []);
});

test('clásico: los cortes son el propio intervalo para todo α', () => {
  const m = clasico(2, 6);
  for (const a of [0.1, 0.5, 1]) assertIntervalos(corteAlfa(m, a, [0, 10]), [[2, 6]], 0.01);
});

test('el corte fuerte de nivel 1 de un trapecio es vacío; el débil no', () => {
  const m = trapecial(1, 3, 7, 9);
  assert.deepEqual(corteFuerte(m, 1, [0, 10]), []);
  assert.equal(corteAlfa(m, 1, [0, 10]).length, 1);
});

test('los cortes decrecen al subir α', () => {
  const m = gaussiana(5, 1);
  const [[a1, b1]] = corteAlfa(m, 0.3, [0, 10]), [[a2, b2]] = corteAlfa(m, 0.7, [0, 10]);
  assert.ok(a1 < a2 && b2 < b1);
});

test('cardinal sigma de un conjunto discreto', () => {
  assert.ok(Math.abs(cardinalSigma([0.2, 1, 0.5]) - 1.7) < 1e-12);
  assert.equal(cardinalSigma([]), 0);
});

test('inclusión: mín(μ, ν) está en μ, y grado(μ, μ) = 1', () => {
  const m = gaussiana(4, 1), n = gaussiana(6, 1), i = (x) => Math.min(m(x), n(x));
  assert.equal(contenido(i, m, [0, 10]), true);
  assert.equal(contenido(m, n, [0, 10]), false);
  assert.equal(grado(m, m, [0, 10]), 1);
  assert.ok(grado(m, n, [0, 10]) < 1 && grado(m, n, [0, 10]) > 0);
});

test('las formas devuelven 0 y 1 donde deben', () => {
  assert.equal(triangular(0, 5, 10)(5), 1);
  assert.equal(triangular(0, 5, 10)(0), 0);
  assert.ok(Math.abs(sigmoide(5, 1)(5) - 0.5) < 1e-12);
  assert.ok(Math.abs(campana(5, 2, 3)(7) - 0.5) < 1e-12);
  assert.equal(gaussiana(5, 1)(5), 1);
});
