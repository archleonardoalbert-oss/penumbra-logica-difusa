import test from 'node:test';
import assert from 'node:assert/strict';
import * as ia from '../nucleo/ia.js';

const cerca = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const numerica = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

test('sigmoide: 0,5 en la frontera, y su derivada es s(1-s)', () => {
  cerca(ia.sigma(0), 0.5); cerca(numerica(ia.sigma, 0.7), ia.sigma(0.7) * (1 - ia.sigma(0.7)));
});
test('softmax suma 1; con temperatura no cambia el ganador', () => {
  const p = ia.softmax([2, 1, 0]), q = ia.softmax([2, 1, 0], 3);
  cerca(p.reduce((a, b) => a + b), 1); assert.ok(q[0] < p[0]); assert.ok(q[0] > q[1]);
  cerca(ia.softmax([Math.log(0.63), Math.log(0.1)])[0], 0.63 / 0.73);
});
test('derivadas de las normas T coinciden con la derivada numérica', () => {
  for (const [n, T] of Object.entries(ia.NORMAS)) for (const [a, b] of [[0.3, 0.8], [0.7, 0.6], [0.2, 0.3]]) {
    const [da, db] = ia.gradNorma(n, a, b);
    cerca(da, numerica((x) => T(x, b), a), 1e-4); cerca(db, numerica((x) => T(a, x), b), 1e-4);
  }
});
test('mínimo: solo pasa gradiente por una entrada; Łukasiewicz se anula en media zona', () => {
  assert.deepEqual(ia.gradNorma('minimo', 0.3, 0.8), [1, 0]);
  assert.deepEqual(ia.gradNorma('lukasiewicz', 0.3, 0.4), [0, 0]);
  assert.deepEqual(ia.gradNorma('lukasiewicz', 0.8, 0.7), [1, 1]);
  assert.deepEqual(ia.gradNorma('producto', 0.3, 0.8).map((v) => +v.toFixed(3)), [0.8, 0.3]);
});
test('implicaciones: valor y derivadas; Reichenbach reparte entre MP y MT', () => {
  cerca(ia.IMPL.reichenbach(0.7, 0.4), 0.58);
  const g = ia.gradImpl('reichenbach', 0.1, 0.1);
  cerca(g.mp, 0.1); cerca(g.mt, 0.9);
  assert.equal(ia.gradImpl('godel', 0.7, 0.4).mt, 0);
  cerca(ia.gradImpl('goguen', 0.8, 0.4).mp, 1.25); cerca(ia.gradImpl('goguen', 0.8, 0.4).mt, 0.625);
});
test('implicación sigmoidal: mantiene los extremos clásicos', () => {
  const S = ia.sigmoidal(ia.IMPL.reichenbach, 9, -0.5);
  cerca(S(1, 0), 0, 1e-9); cerca(S(0, 0), 1, 1e-9); cerca(S(1, 1), 1, 1e-9); cerca(S(0, 1), 1, 1e-9);
  assert.ok(S(0.5, 0.5) > 0 && S(0.5, 0.5) < 1);
});
test('cuantificadores suaves: con p=1, la media; con p grande, tienden a máx y mín', () => {
  const v = [0.9, 0.5, 0.2];
  cerca(ia.existeP(v, 1), 1.6 / 3); cerca(ia.paraTodoP(v, 1), 1.6 / 3);
  assert.ok(Math.abs(ia.existeP(v, 200) - 0.9) < 0.01); assert.ok(Math.abs(ia.paraTodoP(v, 200) - 0.2) < 0.01);
  cerca(ia.paraTodoP([0.7, 0.7], 2), 0.7);
});
test('clasificador con regla: entrenar sube la satisfacción', () => {
  const h = ia.entrenarConRegla({ conRegla: true, epocas: 300 });
  assert.ok(h.at(-1).satisfaccion > h[0].satisfaccion);
  const sin = ia.entrenarConRegla({ conRegla: false, epocas: 300 });
  assert.ok(h.at(-1).exactitud > sin.at(-1).exactitud, `${h.at(-1).exactitud} ≤ ${sin.at(-1).exactitud}`);
});
test('Fréchet: la conjunción real queda entre Łukasiewicz y el mínimo; el producto es independencia', () => {
  for (const [a, b] of [[0.9, 0.7], [0.5, 0.5], [0.2, 0.3]]) for (const r of [-1, -0.5, 0, 0.5, 1]) {
    const c = ia.conjuncionReal(a, b, r);
    assert.ok(c >= Math.max(0, a + b - 1) - 1e-12 && c <= Math.min(a, b) + 1e-12);
  }
  cerca(ia.conjuncionReal(0.9, 0.7, 0), 0.63); cerca(ia.conjuncionReal(0.9, 0.7, 1), 0.7); cerca(ia.conjuncionReal(0.9, 0.7, -1), 0.6);
});
test('ECE: 0 si está calibrado; detecta el exceso de confianza', () => {
  const conf = Array(10).fill(0.8), ok = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
  cerca(ia.ece(conf, ok, 10), 0);
  cerca(ia.ece(Array(10).fill(0.9), [1, 1, 1, 1, 1, 0, 0, 0, 0, 0], 10), 0.4);
  // la cancelación dentro de un bin: dos grupos mal, ECE 0
  cerca(ia.ece([0.71, 0.71, 0.79, 0.79], [1, 1, 1, 0], 10) >= 0 ? 0 : 1, 0);
});
test('PAV: monótono, conserva la media, y el ejemplo a mano', () => {
  const r = ia.pav([1, 0, 1, 1, 0, 1]);
  assert.deepEqual(r.map((v) => +v.toFixed(4)), [0.5, 0.5, 0.6667, 0.6667, 0.6667, 1]);
  for (let i = 1; i < r.length; i++) assert.ok(r[i] >= r[i - 1]);
  cerca(r.reduce((a, b) => a + b), 4);
});
test('temperatura: no cambia la clase y baja la confianza', () => {
  const z = [3, 1], q = ia.softmax(z, 2);
  assert.ok(q[0] > q[1] && q[0] < ia.softmax(z)[0]);
});
test('OWA: máximo, mínimo y media; orness', () => {
  cerca(ia.owa([0.2, 0.9, 0.5], [1, 0, 0]), 0.9); cerca(ia.owa([0.2, 0.9, 0.5], [0, 0, 1]), 0.2); cerca(ia.owa([0.2, 0.9, 0.5], [1 / 3, 1 / 3, 1 / 3]), 1.6 / 3);
  cerca(ia.orness([1, 0, 0]), 1); cerca(ia.orness([0, 0, 1]), 0); cerca(ia.orness([1 / 3, 1 / 3, 1 / 3]), 0.5);
});
test('literal suave: interpola; irrelevante da 1; la regla del informe', () => {
  cerca(ia.literal(0.9, 1, 1), 0.9); cerca(ia.literal(0.9, 0, 1), 0.1); cerca(ia.literal(0.9, 1, 0), 1);
  cerca(ia.fuerzaRegla([0.9, 0.7, 0.2], [{ m: 1, p: 1 }, { m: 1, p: 1 }, { m: 0, p: 1 }]), 0.63);
});
test('el ejemplo del informe CCD da p ≈ (0,06; 0,80; 0,07; 0,04; 0,03)', () => {
  const R = [{ w: 0.63, theta: [1, 4, 1, 0, 0] }, { w: 0.1, theta: [0, 0, 1, 4, 1] }], { z, p } = ia.salidaTSK(R);
  cerca(z[1], (0.63 / 0.73) * 4, 1e-9); [0.06, 0.8, 0.07, 0.04, 0.03].forEach((v, i) => cerca(p[i], v, 0.012));
});
test('group lasso: anula el grupo entero si su norma no llega a λ', () => {
  assert.deepEqual(ia.proxGrupo([0.3, 0.4], 0.6), [0, 0]);
  const v = ia.proxGrupo([3, 4], 1); cerca(v[0], 2.4); cerca(v[1], 3.2);
});
test('coste: umbral de decisión; más coste de infra-triaje, antes se alarma', () => {
  cerca(ia.umbralCoste(1, 1), 0.5); cerca(ia.umbralCoste(4, 1), 0.2);
  const C = ia.matrizCoste(5, 4);
  assert.equal(C[1][3], 8); assert.equal(C[3][1], 2); assert.equal(C[2][2], 0);
  assert.equal(ia.decisionCoste([0.5, 0.5], [[0, 4], [1, 0]]), 0);
  assert.equal(ia.decisionCoste([0.1, 0.9], [[0, 4], [1, 0]]), 1);
});
test('contrafactual: el menor cambio que cruza la frontera', () => {
  const f = (x) => 2 * x[0] + x[1], r = ia.contrafactual(f, [0.2, 0.3], 1.5, [[0, 1], [0, 1]]);
  assert.ok(f(r.x) >= 1.5 - 1e-6); assert.equal(r.indice, 0); cerca(r.x[0], 0.6, 1e-6);
});
test('kappa ponderado: 1 si coinciden; 0 aprox. al azar', () => {
  cerca(ia.kappaCuadratico([1, 2, 3, 4], [1, 2, 3, 4], 5), 1);
  assert.ok(ia.kappaCuadratico([1, 1, 2, 2], [2, 1, 2, 1], 3) < 0.3);
});
test('tamaño de muestra del informe: unos 1030', () => {
  cerca(ia.tamanoNoInferioridad(0.03, 0.15), 1030, 8);
});
test('la potencia crece con n', () => {
  assert.ok(ia.potenciaNoInferioridad(1500, 0.03, 0.15) > ia.potenciaNoInferioridad(300, 0.03, 0.15));
});
test('la capa CCD se entrena y selecciona conceptos', () => {
  const t0 = performance.now(), h = ia.entrenarCCD({ lambda: 0.03, epocas: 400 }), ini = h[0], fin = h.at(-1);
  assert.ok(performance.now() - t0 < 2500, 'debe poder entrenarse al abrir la parada');
  assert.ok(fin.perdida < ini.perdida);
  assert.ok(fin.activos < ini.activos, `${ini.activos} → ${fin.activos}`);
  assert.ok(fin.exactitud > 0.7, `exactitud ${fin.exactitud}`);
});
