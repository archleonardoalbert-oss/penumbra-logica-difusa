import test from 'node:test';
import assert from 'node:assert/strict';
import { alturaMapa, regionEn, glslMapa } from '../motor/alturaMapa.js';

const POS = [{ posicion: [0.2, 0.2] }, { posicion: [0.8, 0.8] }];

test('la colina crece con el grado de su región', () => {
  assert.ok(alturaMapa(0.2, 0.2, [1, 0], POS) > alturaMapa(0.2, 0.2, [0.5, 0], POS));
  assert.ok(alturaMapa(0.2, 0.2, [0.5, 0], POS) > alturaMapa(0.2, 0.2, [0, 0], POS));
});

test('no afecta de forma apreciable a la colina más lejana', () => {
  assert.ok(Math.abs(alturaMapa(0.8, 0.8, [1, 0], POS) - alturaMapa(0.8, 0.8, [0, 0], POS)) < 0.01);
});

test('sin ningún dominio, la colina sigue siendo visible', () => {
  assert.ok(alturaMapa(0.2, 0.2, [0, 0], POS) >= 0.12);
  assert.ok(alturaMapa(0.2, 0.2, [0, 0], POS) > alturaMapa(0.5, 0.5, [0, 0], POS) + 0.05);
});

test('nunca sale de [0, 1]', () => {
  const muchas = Array.from({ length: 8 }, () => ({ posicion: [0.5, 0.5] }));
  assert.ok(alturaMapa(0.5, 0.5, Array(8).fill(1), muchas) <= 1);
  assert.ok(alturaMapa(0, 1, [0, 0], POS) >= 0);
});

test('la subida inicial escala la altura', () => {
  assert.equal(alturaMapa(0.2, 0.2, [1, 0], POS, 0), 0);
  assert.ok(alturaMapa(0.2, 0.2, [1, 0], POS, 0.5) < alturaMapa(0.2, 0.2, [1, 0], POS, 1));
});

test('regionEn elige el centro más cercano dentro del radio', () => {
  const centros = [[100, 100], [300, 100]];
  assert.equal(regionEn([120, 110], centros, 60), 0);
  assert.equal(regionEn([290, 90], centros, 60), 1);
  assert.equal(regionEn([200, 300], centros, 60), -1);
});

test('el GLSL usa las mismas posiciones y un grado por región', () => {
  const g = glslMapa(POS);
  assert.match(g, /g0/); assert.match(g, /g1/); assert.match(g, /0\.8/);
});
