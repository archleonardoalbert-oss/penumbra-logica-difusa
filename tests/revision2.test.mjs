// Hallazgos de la revisión de la fase 2: cada prueba falló antes de su arreglo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA, LOGICAS, peorValor } from '../nucleo/logicas.js';
import { crearEntradas, normalizar, primitivasDe } from '../motor/escena.js';

const carga = async (parte, id) => (await import(`../contenido/parte${parte}/${id}.js`));

test('6-6: el empujón del texto no derriba el palo', async () => {
  const { escena } = (await carga(6, '6-6-pendulo')).default;
  const { e } = crearEntradas(escena);
  const textos = normalizar(primitivasDe(escena, { paso: 2, p: 1, e })).grupos.flat().filter((x) => x.clave === 'est').map((x) => x.tex).join();
  assert.ok(!/90/.test(textos), textos);
});
test('el axioma del producto define el producto: falla en Łukasiewicz y en Gödel', () => {
  assert.ok(peorValor(EXTRA.producto, LOGICAS.producto) > 0.999);
  assert.ok(peorValor(EXTRA.producto, LOGICAS.lukasiewicz) < 0.9);
  assert.ok(peorValor(EXTRA.producto, LOGICAS.godel) < 0.9);
});
test('5-8: el reto no aprueba un controlador que se cae más tarde', async () => {
  const r = (await carga(5, '5-8-pendulo')).default.retos.find((x) => x.id === 'elige-signo');
  assert.equal(r.precision({ s: 0.2 }), 0);
  assert.equal(r.precision({ s: 0.8 }), 1);
});
test('7-4: sin reglas encendidas, el nivel no se sale de la escala', async () => {
  const { nivelCCD } = await carga(7, '7-4-celulas');
  assert.equal(nivelCCD({ dolor: 1, sudor: 0, edad: 0.5, aire: 0, trauma: 0 }), null);
});
test('8-5: cargar la parada no bloquea la página', async () => {
  const t0 = performance.now(); await import('../contenido/parte8/8-5-completitud.js?x=1');
  assert.ok(performance.now() - t0 < 150);
});
test('toda parada menos la última lleva a otra parada', async () => {
  const { siguienteEnCurso, todosLosConceptos } = await import('../contenido/catalogo.js');
  const L = todosLosConceptos(), corte = L.findIndex((c) => c.id === '8-5-completitud'), corte2 = L.findIndex((c) => c.id.startsWith('14-')) - 1;
  L.slice(0, -1).forEach((c, i) => { if (i !== corte && i !== corte2) assert.equal(siguienteEnCurso(c.id)?.id, L[i + 1].id); });
  assert.equal(siguienteEnCurso('8-5-completitud'), null, 'la noche termina aquí; el amanecer se descubre aparte');
  assert.equal(siguienteEnCurso(L[corte2].id), null, 'el amanecer no empuja al Horizonte: se llega por su puerta');
  assert.equal(siguienteEnCurso(L.at(-1).id), null);
});
test('una fórmula escrita por el alumno admite mín y máx, con su fórmula bonita', async () => {
  const { compilar } = await import('../nucleo/expresion.js');
  const c = compilar('min(x, 1 - x) + max(x, 0.2) * 0', ['x']);
  assert.equal(c.error ?? null, null);
  assert.ok(Math.abs(c.f(0.3) - 0.3) < 1e-9);
  assert.match(c.latex, /\\min/);
  assert.ok(compilar('min(x)', ['x']).error);
});
test('una fórmula sin ningún número válido avisa, en vez de dibujar 0 callada', async () => {
  const def = { pasos: [{ dur: 1 }], primitivas: () => [], entradas: [{ id: 'f', tipo: 'expresion', vars: ['x'], valor: 'sqrt(x - 2)', dominio: [0, 1] }] };
  assert.match(crearEntradas(def).avisos.f, /ningún número/);
});
