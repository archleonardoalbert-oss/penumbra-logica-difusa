import test from 'node:test';
import assert from 'node:assert/strict';
import { crearProgreso } from '../nucleo/progreso.js';
import { notaCalculo, notaManipular, notaEleccion, notaDemostracion } from '../nucleo/retos.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const RETOS = [{ id: 'a' }, { id: 'b' }];
const CAT = [{ id: 1, conceptos: [{ id: 'x', retos: RETOS }, { id: 'y', retos: [{ id: 'a' }] }] }];

test('mirar no sube nada', () => { assert.equal(crearProgreso(memoria()).gradoConcepto('x', RETOS), 0); });

test('guarda la mejor nota', () => {
  const p = crearProgreso(memoria());
  p.registrar('x', 'a', 0.8); p.registrar('x', 'a', 0.3);
  assert.equal(p.notaReto('x', 'a'), 0.8);
});

test('grado del concepto: media de retos, los no hechos cuentan 0', () => {
  const p = crearProgreso(memoria());
  p.registrar('x', 'a', 0.8);
  assert.equal(p.gradoConcepto('x', RETOS), 0.4);
});

test('grado de la región: media de sus conceptos', () => {
  const p = crearProgreso(memoria());
  p.registrar('x', 'a', 1); p.registrar('x', 'b', 1);
  assert.equal(p.gradoRegion(1, CAT), 0.5);
});

test('persiste entre instancias', () => {
  const m = memoria();
  crearProgreso(m).registrar('x', 'a', 1);
  assert.equal(crearProgreso(m).notaReto('x', 'a'), 1);
});

test('reiniciar deja todo en 0', () => {
  const m = memoria(), p = crearProgreso(m);
  p.registrar('x', 'a', 1); p.reiniciar();
  assert.equal(p.notaReto('x', 'a'), 0);
  assert.equal(crearProgreso(m).notaReto('x', 'a'), 0);
});

test('con almacén que lanza excepción, funciona en memoria', () => {
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  const q = crearProgreso(roto);
  q.registrar('x', 'a', 1);
  assert.equal(q.notaReto('x', 'a'), 1);
  q.reiniciar();
  assert.equal(q.notaReto('x', 'a'), 0);
});

test('datos corruptos en el almacén: empieza de cero sin fallar', () => {
  const m = memoria();
  m.setItem('penumbra-progreso-v1', '{no es json');
  assert.equal(crearProgreso(m).notaReto('x', 'a'), 0);
  m.setItem('penumbra-progreso-v1', '{"x":{"a":"mucho"}}');
  assert.equal(crearProgreso(m).notaReto('x', 'a'), 0);
});

test('una nota fuera de [0, 1] se recorta', () => {
  const p = crearProgreso(memoria());
  p.registrar('x', 'a', 7);
  assert.equal(p.notaReto('x', 'a'), 1);
});

test('pistas: 0 → 1; 1 → 0,8; 5 → 0,4', () => {
  assert.equal(notaManipular(1, 0), 1);
  assert.ok(Math.abs(notaManipular(1, 1) - 0.8) < 1e-12);
  assert.equal(notaManipular(1, 5), 0.4);
  assert.equal(notaManipular(1, 9), 0.4);
});

test('cálculo: exacto dentro de tol, cae lineal hasta 5·tol', () => {
  assert.equal(notaCalculo(1.01, 1, 0.02, 0), 1);
  assert.ok(Math.abs(notaCalculo(1.06, 1, 0.02, 0) - 0.5) < 1e-9);
  assert.equal(notaCalculo(2, 1, 0.02, 0), 0);
  assert.equal(notaCalculo(NaN, 1, 0.02, 0), 0);
});

test('elección: 1, 0,5, 0 según el intento', () => {
  assert.equal(notaEleccion(true, 1), 1);
  assert.equal(notaEleccion(true, 2), 0.5);
  assert.equal(notaEleccion(true, 3), 0);
  assert.equal(notaEleccion(false, 1), 0);
});

test('demostración: autoevaluación con penalización por pistas', () => {
  assert.equal(notaDemostracion(1, 0), 1);
  assert.equal(notaDemostracion(0.5, 0), 0.5);
  assert.equal(notaDemostracion(0, 2), 0);
});
