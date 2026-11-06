import test from 'node:test';
import assert from 'node:assert/strict';
import { fuerzaConCarro, umbralFuerza, ajustar, costePendulo } from '../nucleo/diseno.js';
import { fuerzaPendulo } from '../nucleo/sistemas.js';
import { simular, PARAMETROS } from '../nucleo/pendulo.js';

const g = 180 / Math.PI, P = { anchoAngulo: 20, anchoVel: 2, F: 18 };
const vuelo = (fuerza, T = 15, theta = 15) => simular({ theta: theta / g, omega: 0, x: 0, v: 0 }, { T, dt: 0.01, parar: true, fuerza });

test('sin mirar el carro, se escapa; mirándolo, vuelve al centro con el palo recto', () => {
  assert.ok(Math.abs(vuelo((s) => fuerzaPendulo(s.theta, s.omega, P)).at(-1).x) > 5);
  const tr = vuelo((s) => fuerzaConCarro(s, { ...P, kx: 0.05, kv: 0.1 }));
  assert.equal(tr.length, 1501);
  assert.ok(Math.abs(tr.at(-1).x) < 0.3, `x = ${tr.at(-1).x}`);
  assert.ok(Math.abs(tr.at(-1).theta) * g < 1);
  assert.ok(Math.max(...tr.map((s) => Math.abs(s.x))) < 2.4, 'cabe en el riel');
});
test('el umbral teórico de fuerza separa lo que cae de lo que aguanta', () => {
  const F0 = umbralFuerza(20);
  assert.ok(Math.abs(F0 - (2 * (PARAMETROS.M + PARAMETROS.m) * PARAMETROS.g * 20) / g) < 1e-9);
  const dura = (F) => simular({ theta: 2 / g, omega: 0, x: 0, v: 0 }, { T: 20, dt: 0.01, parar: true, fuerza: (s) => fuerzaPendulo(s.theta, s.omega, { anchoAngulo: 20, anchoVel: 2, F }) });
  assert.ok(dura(F0 * 0.9).length < 2001, 'por debajo, cae');
  assert.equal(dura(F0 * 1.1).length, 2001, 'por encima, aguanta');
  assert.ok(Math.abs(dura(F0 * 1.1).at(-1).theta) * g < 0.5);
});
test('el coste penaliza caer y premia calmarse pronto', () => {
  const caer = costePendulo({ F: 3, atencion: 0.1 }), bueno = costePendulo({ F: 18, atencion: 1 });
  assert.ok(caer > 3 * bueno, `${caer} ${bueno}`);
});
test('ajustar: el coste nunca sube y llega a sostenerlo desde una mala elección', () => {
  const h = ajustar({ F: 4, atencion: 0.1 }, 40);
  for (let i = 1; i < h.length; i++) assert.ok(h[i].coste <= h[i - 1].coste + 1e-12);
  const fin = h.at(-1), tr = simular({ theta: 15 / g, omega: 0, x: 0, v: 0 }, { T: 6, dt: 0.01, parar: true, fuerza: (s) => fuerzaPendulo(s.theta, s.omega, { anchoAngulo: 20, anchoVel: 2 / fin.p.atencion, F: fin.p.F }) });
  assert.equal(tr.length, 601);
  assert.ok(Math.abs(tr.at(-1).theta) * g < 1);
  assert.ok(fin.coste < h[0].coste / 3);
  for (const x of h) { assert.ok(x.p.F >= 2 && x.p.F <= 30); assert.ok(x.p.atencion >= 0.05 && x.p.atencion <= 1); }
});
