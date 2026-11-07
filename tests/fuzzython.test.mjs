import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { poligono, NORMAS_FZ, EJEMPLO, fuerzasEjemplo, mamdaniEjemplo, sugenoEjemplo, tsukamotoEjemplo, gaussiana, sFuncion } from '../nucleo/fuzzython.js';
const F = JSON.parse(readFileSync(new URL('./fixtures/fuzzython.json', import.meta.url)));
const igual = (a, b, tol = 1e-6, m = '') => assert.ok(Math.abs(a - b) < tol, `${m} ${a} frente a ${b}`);
const igualP = (a, b) => { assert.equal(a.length, b.length, `${JSON.stringify(a)} ${JSON.stringify(b)}`); a.forEach((p, i) => { igual(p[0], b[i][0]); igual(p[1], b[i][1]); }); };
const tri = poligono([[0, 0], [5, 1], [10, 0]]), tra = poligono([[0, 0], [2, 1], [6, 1], [10, 0]]), hom = poligono([[0, 1], [4, 1], [8, 0]]);
test('la pertenencia coincide con fuzzython, también fuera de sus puntos', () => { [-1, 0, 1, 2.5, 5, 7, 10, 12].forEach((x, i) => { igual(tri.val(x), F.eval.tri[i]); igual(tra.val(x), F.eval.tra[i]); igual(hom.val(x), F.eval.hombro[i]); }); });
test('recortar y escalar', () => { igualP(tri.minimizar(0.4).puntos, F.minimizar); igualP(tri.escalar(0.4).puntos, F.producto); });
const a = poligono([[0, 0], [4, 1], [8, 0]]), b = poligono([[2, 0], [6, 1], [10, 0]]);
test('unión, intersección y complemento, con el cruce incluido', () => { igualP(a.combinar(NORMAS_FZ.MAX, b).puntos, F.union); igualP(a.combinar(NORMAS_FZ.MIN, b).puntos, F.inter); igualP(a.complemento().puntos, F.comp); });
test('las seis desdifusiones y el área', () => { const m = a.minimizar(0.7).combinar(NORMAS_FZ.MAX, b.minimizar(0.3)); igual(m.area(), F.area); for (const k of ['COG', 'CM', 'MM', 'LM', 'RM']) igual(m[k](), F.defuzz[k], 1e-6, k); igual(m.COA(), F.defuzz.COA, 1e-5, 'COA'); });
test('las normas', () => { for (const [k, v] of Object.entries(F.normas)) igual(NORMAS_FZ[k](0.5, 0.7), v, 1e-9, k); });
test('otras formas', () => { [0, 1, 2].forEach((x, i) => igual(gaussiana(0, 1)(x), F.gauss[i])); [0, 2.5, 5, 7.5, 10].forEach((x, i) => igual(sFuncion(0, 5, 10)(x), F.s[i])); });
test('Mamdani, Larsen, Sugeno y Tsukamoto dan lo mismo que el original en todas las temperaturas', () => {
  for (const t of Object.keys(F.mamdani).map(Number)) { igual(mamdaniEjemplo(t), F.mamdani[t], 1e-6, `M ${t}`); igual(mamdaniEjemplo(t, { activacion: 'PROD' }), F.larsen[t], 1e-6, `L ${t}`); igual(sugenoEjemplo(t), F.sugeno[t], 1e-9, `S ${t}`); igual(tsukamotoEjemplo(t), F.tsukamoto[t], 2e-5, `T ${t}`); }
});
test('la fuerza se acumula por máximo dentro de cada adjetivo', () => { const f = fuerzasEjemplo(33); igual(f.short, 0.2, 1e-12); igual(f.usual, 0.4, 1e-12); igual(f.large, 0.6, 1e-12); assert.ok(EJEMPLO.reglas.length === 3); });
import { areaDiscreta } from '../nucleo/fuzzython.js';
test('el área numérica reproduce el tramo de más del original', () => { const v = { 3: 1.0, 7: 1.1428571428571426, 10: 1.0999999999999999, 49: 1.0000000000000007, 100: 1.0000000000000007 }; for (const [r, a] of Object.entries(v)) igual(areaDiscreta(() => 1, 0, 1, +r).area, a, 1e-12, r); });
