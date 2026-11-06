import test from 'node:test';
import assert from 'node:assert/strict';
import { centroide, bisector, maximos, agregar, sugeno, tsukamoto, interpolante, peorError, TABLA_PENDULO, activaciones, fuerzaPendulo } from '../nucleo/sistemas.js';
import { simular } from '../nucleo/pendulo.js';

const cerca = (a, b, t = 1e-3) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const tri = (a, b, c) => (x) => Math.max(0, Math.min((x - a) / (b - a), (c - x) / (c - b)));

test('centroide y bisector de una figura simétrica caen en su eje', () => {
  const f = tri(2, 5, 8);
  cerca(centroide(f, [0, 10]), 5); cerca(bisector(f, [0, 10]), 5, 0.02);
});
test('el centroide de una figura vacía es el centro del dominio', () => cerca(centroide(() => 0, [0, 10]), 5));
test('centroide de un rectángulo más un triángulo, a mano', () => {
  const f = (x) => (x >= 0 && x <= 2 ? 1 : 0);
  cerca(centroide(f, [0, 10], 4000), 1, 0.01);
});
test('máximos: primero, medio y último de una meseta', () => {
  const f = (x) => Math.min(0.5, tri(2, 5, 8)(x)), { primero, medio, ultimo } = maximos(f, [0, 10], 2000);
  cerca(primero, 3.5, 0.02); cerca(medio, 5, 0.02); cerca(ultimo, 6.5, 0.02);
});
test('agregar: recorta cada salida por su fuerza y une con máximo', () => {
  const s = agregar([{ fuerza: 0.5, salida: () => 1 }, { fuerza: 0.2, salida: () => 1 }]);
  cerca(s(3), 0.5);
});
test('Sugeno: media ponderada; con pesos iguales, la media', () => {
  cerca(sugeno([{ fuerza: 1, z: 2 }, { fuerza: 1, z: 4 }]), 3);
  cerca(sugeno([{ fuerza: 0.25, z: 8 }, { fuerza: 0.75, z: 4 }]), 5);
  assert.equal(sugeno([{ fuerza: 0, z: 8 }]), 0);
});
test('Tsukamoto: lee en la curva inversa', () => {
  cerca(tsukamoto([{ fuerza: 0.5, inversa: (h) => 10 * h }, { fuerza: 0.5, inversa: (h) => 10 - 10 * h }]), 5);
});
test('aproximación: el error baja al añadir reglas, y pasa por los nudos', () => {
  const f = (x) => 0.5 + 0.4 * Math.sin(6 * x), g = interpolante(f, 5);
  cerca(g(0.5), f(0.5));
  assert.ok(peorError(f, 40) < peorError(f, 10)); assert.ok(peorError(f, 10) < peorError(f, 3));
});
test('las nueve activaciones del péndulo suman 1', () => {
  const a = activaciones(0.1, -0.3, { anchoAngulo: 20, anchoVel: 2 }, Math.min);
  assert.equal(a.length, 9);
  const prod = activaciones(0.1, -0.3, { anchoAngulo: 20, anchoVel: 2 }, (u, v) => u * v);
  cerca(prod.reduce((s, x) => s + x, 0), 1);
});
test('la tabla es antisimétrica: en equilibrio, ninguna fuerza', () => {
  cerca(fuerzaPendulo(0, 0, { anchoAngulo: 20, anchoVel: 2, F: 18 }), 0);
  cerca(fuerzaPendulo(0.1, 0.2, { anchoAngulo: 20, anchoVel: 2, F: 18 }), -fuerzaPendulo(-0.1, -0.2, { anchoAngulo: 20, anchoVel: 2, F: 18 }));
  assert.equal(TABLA_PENDULO.length, 3);
});
test('EL PÉNDULO SE SOSTIENE: de 15 grados, en 10 s se queda quieto', () => {
  const P = { anchoAngulo: 20, anchoVel: 2, F: 18 }, g = 180 / Math.PI;
  const tr = simular({ theta: 15 / g, omega: 0, x: 0, v: 0 }, { T: 10, dt: 0.005, parar: true, fuerza: (e) => fuerzaPendulo(e.theta, e.omega, P) });
  assert.equal(tr.length, 2001, 'no debe caerse');
  assert.ok(tr.slice(-400).every((e) => Math.abs(e.theta) * g < 1), `acaba en ${tr.at(-1).theta * g}`);
});
test('sin mirar la velocidad, no se calma', () => {
  const g = 180 / Math.PI, P = { anchoAngulo: 20, anchoVel: Infinity, F: 18 };
  const tr = simular({ theta: 15 / g, omega: 0, x: 0, v: 0 }, { T: 10, dt: 0.005, parar: true, fuerza: (e) => fuerzaPendulo(e.theta, e.omega, P) });
  assert.ok(tr.slice(-400).some((e) => Math.abs(e.theta) * g > 2));
});
test('con producto y dentro de los anchos, el controlador es la recta demostrada', () => {
  const P = { anchoAngulo: 20, anchoVel: 2, F: 18 }, th = 8 * Math.PI / 180, w = -0.5;
  cerca(fuerzaPendulo(th, w, P), (18 / 2) * (8 / 20 + w / 2), 1e-9);
});
