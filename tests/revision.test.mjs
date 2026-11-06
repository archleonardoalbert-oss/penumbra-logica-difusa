// Fallos hallados en la revisión final: cada prueba reproduce uno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { todosLosConceptos } from '../contenido/catalogo.js';
import { crearEntradas, normalizar, primitivasDe } from '../motor/escena.js';

const cargar = async (id) => (await todosLosConceptos().find((c) => c.id === id).carga()).default;
const listos = todosLosConceptos().filter((c) => c.estado === 'listo');
const reposo = (c, e) => normalizar(primitivasDe(c.escena, { paso: c.escena.pasos.length - 1, p: 1, e }));

test('1-10: el reto puntúa los puntos que se ven, no los almacenados', async () => {
  const c = await cargar('1-10-convexidad'), ent = crearEntradas(c.escena), r = c.retos.find((x) => x.id === 'contraejemplo');
  ent.actualizar('sep', 0.3);
  assert.equal(r.precision(ent.e), 1, 'con las cimas separadas y los puntos colocados solos, el valle es enorme');
});

test('1-10: toda curva del mapa es de verdad una curva de nivel, aunque los discos se solapen', async () => {
  const c = await cargar('1-10-convexidad'), ent = crearEntradas(c.escena);
  ent.actualizar('sep', 0.16); ent.actualizar('alfa', 0.1);
  const F = (x, y) => Math.max(Math.exp(-((x - 0.34) ** 2 + (y - 0.5) ** 2) / 0.03), Math.exp(-((x - 0.66) ** 2 + (y - 0.5) ** 2) / 0.03));
  const curvas = reposo(c, ent.e).paneles[0].prims.filter((q) => q.tipo === 'curva');
  assert.ok(curvas.length >= 1);
  for (const q of curvas) for (const [x, y] of q.puntos) assert.ok(Math.abs(F(x, y) - 0.1) < 0.005, `(${x}, ${y}) tiene ${F(x, y)}`);
});

test('1-10: no afirma que «sin islas» sea lo mismo que convexo', async () => {
  const c = await cargar('1-10-convexidad');
  assert.ok(!JSON.stringify(c.entender).includes('Eso es exactamente la convexidad'));
  assert.ok(!JSON.stringify(c.escena.pasos).includes('sin islas'));
});

test('1-1: la borrosidad de la escena es la w de la fórmula, y la tabla sale de ella', async () => {
  const c = await cargar('1-1-quien-es-alto'), ent = crearEntradas(c.escena), w = ent.e.borrosidad;
  assert.ok(Math.abs(w - 2.8) < 1e-9, `w = ${w}`);
  assert.ok(Math.abs(1 / (1 + Math.exp(1 / w)) - 0.41) < 0.005);
});

test('1-2: la cuenta de granos cuadra: quitar 99 de 100 deja uno', async () => {
  const c = await cargar('1-2-monton'), ent = crearEntradas(c.escena);
  const { paneles, principal } = normalizar(primitivasDe(c.escena, { paso: 1, p: 1, e: ent.e }));
  assert.match(paneles[0].prims.find((q) => q.clave === 'quedan').tex, /^1\\/);
  assert.ok(principal.some((q) => q.clave === 'absurdo'));
  assert.ok(!c.pregunta.includes('cien veces'));
});

test('1-6: una sola definición de normal y de subnormal', async () => {
  const c = await cargar('1-6-anatomia'), t = JSON.stringify(c.entender);
  assert.ok(!t.includes('aunque el conjunto no sea normal'));
  const { GLOSARIO } = await import('../contenido/glosario.js');
  assert.ok(!GLOSARIO.subnormal.texto.includes('ningún grado alcanza'));
});

test('el texto no manda usar controles que no están en esa etapa', async () => {
  for (const f of listos) {
    const c = await f.carga().then((m) => m.default);
    for (const p of c.escena.pasos) assert.ok(!/Escribe tu|Baja el deslizador|Mueve \$|Sube los niveles/.test(p.texto), `${c.id}: «${p.texto.slice(0, 60)}»`);
    assert.ok(!/Pulsa ↻|En el último paso|Desde el tercer paso/.test(c.manipulacion), `${c.id}: ${c.manipulacion.slice(0, 80)}`);
  }
});

test('ningún texto tiene caracteres de control (un \\v o \\t colados por un \\varepsilon)', async () => {
  for (const f of listos) {
    const c = (await f.carga()).default;
    assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(JSON.stringify(c)) && !/\\u00(0[0-8bcef]|1)/.test(JSON.stringify(c)), c.id);
  }
});

test('pulsar Comprobar sin haber hecho nada da 0: mirar no sube nada', async () => {
  for (const f of listos) {
    const c = (await f.carga()).default;
    for (const r of c.retos) if (r.tipo === 'manipular') assert.equal(r.precision(crearEntradas(c.escena).e), 0, `${c.id}/${r.id}`);
  }
});

test('sin jerga sin explicar en ningún texto: lista ampliada, retos y escena incluidos', async () => {
  const JERGA = /supremo|ínfimo|norma\b|cuasi|vectorial|inducción|indicadora|parte entera|cutworthy|recíproco|intervalo abierto|distribución|disjuntos|cuantifica|transitividad|\bcota\b/i;
  for (const f of listos) {
    const c = (await f.carga()).default;
    const textos = [c.pregunta, c.manipulacion, c.puente, ...c.escena.pasos.map((p) => p.texto)];
    for (const b of [...c.entender, ...c.tecnicas]) textos.push(b.texto, b.lee, b.plan, b.intro, b.tex, b.cierre, ...(b.pasos ?? []).flatMap((p) => [p.texto, p.porque]), ...(b.piezas ?? []).map((p) => p.dice));
    for (const r of c.retos) textos.push(r.enunciado, r.explicacion, ...(r.pistas ?? []), ...(r.opciones ?? []), ...(r.solucion ?? []).flatMap((p) => [p.texto, p.porque]));
    for (const t of textos.filter(Boolean)) assert.ok(!JERGA.test(t.replace(/\[\[[^\]]+\]\]/g, '').replace(/\$[^$]*\$/g, '')), `${c.id}: «${t.slice(0, 80)}»`);
  }
});

test('ninguna barra invertida perdida: en una cadena normal, \\frac se convierte en un carácter de control', async () => {
  const mira = (v, id) => { if (typeof v === 'string') assert.ok(!/[\x08\x09\x0b\x0c\x0d]/.test(v), `${id}: «${v.slice(0, 70)}»`); else if (Array.isArray(v)) v.forEach((x) => mira(x, id)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => mira(x, id)); };
  for (const f of listos) { const c = (await f.carga()).default; mira({ ...c, escena: { pasos: c.escena.pasos } }, c.id); }
});
