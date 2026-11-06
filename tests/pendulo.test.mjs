import test from 'node:test';
import assert from 'node:assert/strict';
import { simular, PARAMETROS as P, energia } from '../nucleo/pendulo.js';
import { crearTaller } from '../nucleo/taller.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('sin fuerza, la energía se conserva', () => {
  const t = simular({ theta: 0.3, omega: 0, x: 0, v: 0 }, { T: 2, dt: 0.002 });
  const e0 = energia(t[0]), e1 = energia(t.at(-1));
  assert.ok(Math.abs(e1 - e0) < 1e-4, `${e0} → ${e1}`);
});

test('sin fuerza, se cae hacia donde está inclinado, y el carro retrocede', () => {
  const t = simular({ theta: 0.1, omega: 0, x: 0, v: 0 }, { T: 1, dt: 0.002 });
  assert.ok(t.at(-1).theta > 0.5);
  assert.ok(t.at(-1).x < 0);
});

test('en perfecto equilibrio, no se mueve', () => {
  const t = simular({ theta: 0, omega: 0, x: 0, v: 0 }, { T: 1, dt: 0.01 });
  assert.equal(t.at(-1).theta, 0);
});

test('se detiene al tocar el suelo', () => {
  const t = simular({ theta: 0.5, omega: 0, x: 0, v: 0 }, { T: 6, dt: 0.01, parar: true });
  assert.ok(Math.abs(t.at(-1).theta) <= Math.PI / 2 + 1e-9);
});

test('una fuerza hacia el lado de la caída la frena', () => {
  const libre = simular({ theta: 0.1, omega: 0, x: 0, v: 0 }, { T: 0.5, dt: 0.002 });
  const empuja = simular({ theta: 0.1, omega: 0, x: 0, v: 0 }, { T: 0.5, dt: 0.002, fuerza: () => 5 });
  assert.ok(empuja.at(-1).theta < libre.at(-1).theta);
  assert.ok(P.g > 0);
});

test('el taller guarda lo construido, y aguanta datos rotos', () => {
  const m = mem(), t = crearTaller(m);
  t.guardar({ ancho: 20 });
  assert.equal(crearTaller(m).leer().ancho, 20);
  m.setItem('penumbra-taller-v1', '{mal');
  assert.deepEqual(crearTaller(m).leer(), {});
});
