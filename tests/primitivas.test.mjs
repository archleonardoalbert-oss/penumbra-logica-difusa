import test from 'node:test';
import assert from 'node:assert/strict';
import { curva, linea, marco, punto, coherencia, poligono, rotulo, terreno } from '../motor/primitivas.js';
import { smooth, seg, ev, mix, vent } from '../motor/tiempo.js';

const M2 = () => marco({ x: [0, 1], y: [0, 1] });
const M3 = () => marco({ x: [0, 1], y: [0, 1], z: [0, 1] });

test('línea de un punto de la curva al eje: coherente', () => {
  const c = curva((u) => [u, u * u], [0, 1]);
  assert.deepEqual(coherencia([M2(), c, linea([0.5, 0.25], [0.5, 0])]), []);
});

test('línea que se queda corta: se detecta', () => {
  const c = curva((u) => [u, u * u], [0, 1]);
  const r = coherencia([M2(), c, linea([0.5, 0.3], [0.5, 0])]);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].extremo, [0.5, 0.3]);
});

test('línea que llega a un punto declarado: coherente', () => {
  const p = punto([0.3, 0.7]);
  assert.deepEqual(coherencia([M2(), p, linea([0.3, 0.7], [0, 0.7])]), []);
});

test('en 3D, una línea que cae a la pared: coherente; a mitad de nada: no', () => {
  const c = curva((u) => [u, 1, u * u], [0, 1]);
  assert.deepEqual(coherencia([M3(), c, linea([0.5, 1, 0.25], [0.5, 1, 0])]), []);
  assert.equal(coherencia([M3(), c, linea([0.5, 1, 0.25], [0.5, 0.5, 0.5])]).length, 1);
});

test('en 3D, llegar a cualquier cara del marco cuenta', () => {
  assert.deepEqual(coherencia([M3(), linea([0, 0.3, 0.2], [1, 0.3, 0.2])]), []);
});

test('curva a medio trazar termina exactamente en f(hasta)', () => {
  const f = (u) => [u, Math.sin(u)];
  const c = curva(f, [0, 1], { hasta: 0.37 });
  assert.deepEqual(c.puntos.at(-1), f(0.37));
  assert.deepEqual(c.puntos[0], f(0));
});

test('una línea encadenada a otra: coherente en esa unión', () => {
  const a = linea([0, 0.5], [0.5, 0.5]), b = linea([0.5, 0.5], [0.5, 0]);
  assert.deepEqual(coherencia([M2(), a, b]), []);
});

test('sin un extremo común, dos líneas sueltas se detectan', () => {
  const a = linea([0.2, 0.2], [0.4, 0.4]), b = linea([0.6, 0.6], [0.8, 0.8]);
  assert.equal(coherencia([a, b]).length, 4);
});

test('los constructores llevan su tipo', () => {
  assert.equal(poligono([[0, 0], [1, 0], [1, 1]]).tipo, 'poligono');
  assert.equal(rotulo([0, 0], 'x').tipo, 'rotulo');
  const t = terreno((x, y) => x * y, { glsl: 'return x*y;' });
  assert.equal(t.tipo, 'terreno');
  assert.equal(t.desde, 0);
});

test('tiempo: curva suave y tramos', () => {
  assert.equal(smooth(0), 0);
  assert.equal(smooth(1), 1);
  assert.equal(smooth(0.5), 0.5);
  assert.equal(seg(5, 0, 10), 0.5);
  assert.equal(ev(20, 0, 10), 1);
  assert.equal(mix(2, 4, 0.5), 3);
  assert.equal(vent(5, 0, 10), 1);
  assert.equal(vent(0, 0, 10), 0);
});
