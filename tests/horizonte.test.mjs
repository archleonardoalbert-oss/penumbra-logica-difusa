import test from 'node:test';
import assert from 'node:assert/strict';
import { trazar, RADIO_FOTONES, B_CRITICO, ISCO, omega, flujoDisco, flujoIntegral, corrimiento, angSombra, cromaCuerpoNegro } from '../nucleo/horizonte.js';
const cerca = (a, b, tol) => assert.ok(Math.abs(a - b) < tol, `${a} frente a ${b}`);
// unidades: radio de Schwarzschild = 1
test('constantes de Schwarzschild', () => { cerca(RADIO_FOTONES, 1.5, 1e-12); cerca(B_CRITICO, 2.598076, 1e-5); cerca(ISCO, 3, 1e-12); });
test('la deflexión lejana coincide con Einstein: 2 r_s / b', () => {
  for (const b of [200, 500, 1000]) { const r = trazar({ r0: 1e5, b, entra: true }); cerca(r.deflexion, 2 / b, 0.08 * (2 / b)); }
});
test('una luz con b algo menor que el crítico cae; algo mayor, escapa', () => {
  assert.equal(trazar({ r0: 40, b: B_CRITICO - 0.01, entra: true }).capturado, true);
  assert.equal(trazar({ r0: 40, b: B_CRITICO + 0.01, entra: true }).capturado, false);
});
test('casi en el crítico, la luz da vueltas: la deflexión crece sin límite', () => {
  const a = trazar({ r0: 40, b: B_CRITICO + 0.2, entra: true }).deflexion, c = trazar({ r0: 40, b: B_CRITICO + 0.002, entra: true }).deflexion;
  assert.ok(c > a + 2, `${a} ${c}`);
});
test('tamaño de la sombra para un observador quieto, fórmula de Synge', () => {
  cerca(angSombra(1000), Math.asin(2.598076 / 1000 * Math.sqrt(1 - 1 / 1000)), 1e-9);
  cerca(angSombra(1.5), Math.PI / 2, 1e-9);
});
test('Kepler relativista: Ω² = r_s / (2 r³)', () => { cerca(omega(4) ** 2, 1 / (2 * 64), 1e-12); });
test('el flujo del disco: cero en la ISCO, y la fórmula cerrada coincide con la integral de Page y Thorne', () => {
  cerca(flujoDisco(3), 0, 1e-9);
  for (const r of [3.5, 5, 8, 15, 40]) { const a = flujoDisco(r), b = flujoIntegral(r); assert.ok(Math.abs(a / b - 1) < 2e-3, `r=${r}: ${a} y ${b}`); }
  assert.ok(flujoDisco(4.7) > flujoDisco(20));
});
test('el máximo del flujo está en r ≈ 9,55 M = 4,78 r_s', () => {
  let m = 0, rm = 0; for (let r = 3.01; r < 15; r += 0.01) { const f = flujoDisco(r); if (f > m) { m = f; rm = r; } } cerca(rm, 4.775, 0.03);
});
test('Doppler: lo que se acerca se azula; lo que se aleja se enrojece; y sin giro queda solo la gravedad', () => {
  const r = 6, b = 7; const acerca = corrimiento({ r, Lfot: b, r0: 1e6 }), aleja = corrimiento({ r, Lfot: -b, r0: 1e6 }), nada = corrimiento({ r, Lfot: 0, r0: 1e6 });
  assert.ok(acerca > nada && nada > aleja); cerca(nada, Math.sqrt(1 - 1.5 / r), 1e-5);
});
test('un observador en lo profundo del pozo ve más azul', () => { assert.ok(corrimiento({ r: 6, Lfot: 0, r0: 3 }) > corrimiento({ r: 6, Lfot: 0, r0: 1e6 })); });
test('cuerpo negro: a 2000 K rojo; a 30000 K azulado; hacia 6500 K casi blanco', () => {
  const f = cromaCuerpoNegro(2000), c = cromaCuerpoNegro(30000), m = cromaCuerpoNegro(6500);
  assert.ok(f[0] > f[2] * 3); assert.ok(c[2] > c[0]); assert.ok(Math.abs(m[0] - m[2]) < 0.2);
});
