import test from 'node:test';
import assert from 'node:assert/strict';
import { DURA_NACER, DURA_VIAJE, guionNacer, formulaNacer, guionViaje } from '../motor/mapaGuion.js';

test('el nacimiento empieza vacío y acaba en el mapa de verdad', () => {
  const a = guionNacer(0), z = guionNacer(DURA_NACER);
  assert.equal(a.plano, 0); assert.equal(a.mat, 0); assert.ok(a.s.every((v) => v === 0));
  for (const k of ['plano', 'base', 'roca2', 'roca5', 'mat', 'caja', 'cielo', 'camino', 'ui']) assert.equal(z[k], 1, k);
  assert.ok(z.s.every((v) => v === 1));
});
test('las campanas nacen una a una, en orden', () => {
  let antes = -1;
  for (let k = 0; k < 8; k++) { const t = [...Array(1800).keys()].map((i) => i / 100).find((x) => guionNacer(x).s[k] > 0); assert.ok(t > antes); antes = t; }
});
test('la fórmula crece con lo que se ve: primero el plano, luego cada campana, luego la roca', () => {
  assert.equal(formulaNacer(0.1).tex, '');
  assert.match(formulaNacer(1.8).tex, /z\(p\) = b/);
  assert.doesNotMatch(formulaNacer(1.8).tex, /sum|e\^/);
  assert.match(formulaNacer(5).tex, /\\sum_\{i=1\}\^\{\d\}/);
  assert.match(formulaNacer(9).tex, /\\rho\(p\)/);
  assert.ok(formulaNacer(5).texto.length > 20);
});
test('el viaje recorre el tramo, aparece el destino y termina fundido', () => {
  const a = guionViaje(0), m = guionViaje(DURA_VIAJE * 0.4), z = guionViaje(DURA_VIAJE);
  assert.equal(a.recorrido, 0); assert.equal(z.recorrido, 1);
  assert.ok(m.recorrido > 0 && m.recorrido < 1);
  assert.equal(a.expo, 0); assert.equal(z.expo, 0); assert.equal(m.expo, 1);
  assert.equal(z.tarjeta, 1);
});
