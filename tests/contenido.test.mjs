import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, todosLosConceptos } from '../contenido/catalogo.js';
import { crearEntradas, normalizar, recorrerEstados } from '../motor/escena.js';
import { coherencia } from '../motor/primitivas.js';

const listos = todosLosConceptos().filter((c) => c.estado === 'listo');
const mates = (s) => [...String(s).matchAll(/\$\$?([^$]+)\$\$?/g)].map((m) => m[1]);

function textosDe(c) {
  const t = [c.pregunta, c.manipulacion, ...c.escena.pasos.map((p) => p.texto)];
  for (const b of c.entender ?? c.rigor) { t.push(b.tex, b.texto, b.lee, b.plan, b.intro, b.todo, b.cierre); for (const p of b.pasos ?? []) t.push(p.texto, p.porque); for (const p of b.piezas ?? []) t.push(p.tex, p.dice); }
  for (const x of c.tecnicas) t.push(x.texto);
  for (const r of c.retos) {
    t.push(r.enunciado, r.explicacion, ...(r.pistas ?? []), ...(r.opciones ?? []));
    for (const p of r.solucion ?? []) t.push(p.texto, p.porque);
  }
  return t.filter(Boolean);
}

for (const ficha of listos) {
  test(`${ficha.id}: está completo y coincide con el catálogo`, async () => {
    const c = (await ficha.carga()).default;
    assert.equal(c.id, ficha.id);
    assert.equal(c.titulo, ficha.titulo);
    assert.deepEqual(c.retos.map((r) => r.id), ficha.retos.map((r) => r.id));
    assert.ok(c.pregunta && c.manipulacion && (c.entender ?? c.rigor).length >= 2, 'faltan secciones');
    assert.ok(c.tecnicas.length >= 1, 'sin técnicas');
    assert.ok(c.referencias.length >= 1, 'sin referencias');
    assert.ok(c.retos.some((r) => ['manipular', 'calcular'].includes(r.tipo)), 'hace falta un reto de manipular o calcular');
    assert.ok(c.escena.pasos.length >= 3, 'muy pocos pasos');
  });

  test(`${ficha.id}: toda línea llega a su sitio, en todo paso`, async () => {
    const c = (await ficha.carga()).default;
    for (const { ctx, prims } of recorrerEstados(c.escena)) {
      normalizar(prims).grupos.forEach((g, i) => {
        const f = coherencia(g);
        assert.deepEqual(f.map((x) => x.extremo), [], `paso ${ctx.paso}, p=${ctx.p}, grupo ${i}`);
      });
    }
  });

  test(`${ficha.id}: la escena es pura`, async () => {
    const c = (await ficha.carga()).default, e = crearEntradas(c.escena).e, ctx = { paso: 1, p: 0.5, e, q: (i) => (i < 1 ? 1 : i === 1 ? 0.5 : 0) };
    assert.equal(JSON.stringify(c.escena.primitivas(ctx)), JSON.stringify(c.escena.primitivas(ctx)));
  });

  test(`${ficha.id}: la notación es rigurosa, sin / ni *`, async () => {
    const c = (await ficha.carga()).default;
    for (const t of textosDe(c)) for (const m of mates(t)) assert.ok(!/[/*]/.test(m), `«${m}»`);
  });

  test(`${ficha.id}: los retos están bien formados y se pueden resolver`, async () => {
    const c = (await ficha.carga()).default;
    for (const r of c.retos) {
      assert.ok(r.enunciado, r.id);
      if (r.tipo === 'calcular') assert.ok(Number.isFinite(r.respuesta) && r.tol > 0, r.id);
      if (r.tipo === 'elegir' || r.tipo === 'contraejemplo') { assert.ok(r.correcta >= 0 && r.correcta < r.opciones.length, r.id); assert.ok(r.explicacion, r.id); }
      if (r.tipo === 'demostrar') assert.ok(r.solucion.length >= 2 && r.solucion.every((p) => p.texto), r.id);
      if (r.tipo === 'manipular') {
        const ent = crearEntradas(c.escena);
        const inicial = r.precision(ent.e);
        assert.ok(inicial >= 0 && inicial < 1, `${r.id}: el reto no debe nacer resuelto (${inicial})`);
        for (const [k, v] of Object.entries(r.prueba)) ent.actualizar(k, v);
        assert.equal(r.precision(ent.e), 1, `${r.id}: la solución de ejemplo no da 1`);
      }
    }
  });
}

test('lo reescrito no suelta jerga sin explicar, ni empieza por lo formal', async () => {
  const JERGA = /supremo|ínfimo|norma\b|cuasi|vectorial|inducción|indicadora|parte entera|cutworthy/i;
  for (const ficha of listos) {
    const c = (await ficha.carga()).default;
    assert.ok(c.entender, `${c.id}: falta reescribir`);
    assert.equal(c.entender[0].tipo, 'idea', `${c.id}: debe empezar por una idea en palabras`);
    const iFormal = c.entender.findIndex((b) => b.tipo === 'formal');
    assert.ok(c.entender.slice(0, iFormal).some((b) => b.tipo === 'ejemplo'), `${c.id}: antes de lo formal, un ejemplo`);
    assert.ok(c.entender.slice(0, iFormal).some((b) => b.tipo === 'simbolos'), `${c.id}: antes de lo formal, leer los símbolos`);
    for (const b of [...c.entender, ...c.tecnicas]) for (const t of [b.texto, b.lee, b.plan, b.intro, b.tex, ...(b.pasos ?? []).flatMap((p) => [p.texto, p.porque]), ...(b.piezas ?? []).map((p) => p.dice)].filter(Boolean)) {
      const limpio = t.replace(/\[\[[^\]]+\]\]/g, '');
      assert.ok(!JERGA.test(limpio), `${c.id}: jerga sin explicar en «${t.slice(0, 70)}»`);
    }
  }
});

test('la región 1 está lista entera', () => {
  assert.ok(CATALOGO[0].conceptos.every((c) => c.estado === 'listo'));
});

test('hay terrenos cuyo GLSL declara lo mismo que su función', async () => {
  for (const ficha of listos) {
    const c = (await ficha.carga()).default;
    if (c.escena.formato !== '3d') continue;
    const { principal } = normalizar(c.escena.primitivas({ paso: c.escena.pasos.length - 1, p: 1, e: crearEntradas(c.escena).e, q: () => 1 }));
    const t = principal.find((q) => q.tipo === 'terreno');
    assert.ok(t && t.glsl, ficha.id);
  }
});
