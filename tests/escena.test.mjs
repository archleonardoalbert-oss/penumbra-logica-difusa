import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEntradas, normalizar, recorrerEstados, primitivasDe } from '../motor/escena.js';
import { coherencia } from '../motor/primitivas.js';
import demo from './paginas/escena-demo.js';

test('la escena es pura: dos llamadas iguales dan lo mismo', () => {
  const e = crearEntradas(demo).e;
  const a = JSON.stringify(primitivasDe(demo, { paso: 1, p: 0.5, e }));
  const b = JSON.stringify(primitivasDe(demo, { paso: 1, p: 0.5, e }));
  assert.equal(a, b);
});

test('toda línea de la escena es coherente en todo paso y p', () => {
  for (const { ctx, prims } of recorrerEstados(demo)) {
    for (const grupo of normalizar(prims).grupos) assert.deepEqual(coherencia(grupo).map((f) => f.extremo), [], JSON.stringify({ paso: ctx.paso, p: ctx.p }));
  }
});

test('una expresión inválida no rompe la escena: mantiene la última válida', () => {
  const ent = crearEntradas(demo);
  const antes = ent.e.f(5);
  ent.actualizar('f', 'x +* 2');
  assert.equal(ent.e.f(5), antes);
  assert.match(ent.avisos.f, /no se entiende/i);
  ent.actualizar('f', 'x / 20');
  assert.equal(ent.e.f(5), 0.25);
  assert.equal(ent.avisos.f, null);
});

test('una expresión fuera de [0, 1] se recorta y lo avisa', () => {
  const ent = crearEntradas(demo);
  ent.actualizar('f', 'x');
  assert.equal(ent.e.f(5), 1);
  assert.equal(ent.e.f(-3), 0);
  assert.match(ent.avisos.f, /recort/i);
});

test('el deslizador respeta sus límites', () => {
  const ent = crearEntradas(demo);
  ent.actualizar('b', 99);
  assert.equal(ent.e.b, 1);
  ent.actualizar('b', -1);
  assert.equal(ent.e.b, 0);
});

test('un punto de arrastre se limita a su región', () => {
  const ent = crearEntradas(demo);
  ent.actualizar('sonda', [50, 2]);
  assert.deepEqual(ent.e.sonda, [10, 1]);
});

test('recorrerEstados pasa por el reposo de cada paso', () => {
  const ps = [...recorrerEstados(demo)].map((s) => `${s.ctx.paso}:${s.ctx.p}`);
  assert.ok(ps.includes('0:1') && ps.includes(`${demo.pasos.length - 1}:1`));
});
