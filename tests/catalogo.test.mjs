import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, todosLosConceptos, buscarConcepto } from '../contenido/catalogo.js';

const TITULOS = ['Introducción al curso y aplicaciones', '1.0 Conjuntos difusos (contenido)', '1.1 Conjuntos certeros vs difusos',
  '1.2 Operaciones entre conjuntos difusos', '1.3 Propiedades de las operaciones difusas (1)', '1.3 Propiedades de las operaciones difusas (2)',
  '1.4 Funciones de membresía (1)', '1.4 Funciones de membresía típicas (2)', '2.0 Otras operaciones difusas (contenido)', '2.1.1 Relaciones difusas',
  '2.1.2 Producto cartesiano difuso', '2.1.3 Composición entre relaciones difusas', '2.2.1 Normas T', '2.2.2 Normas S', '2.2.3 Complemento difuso',
  '2.3.1 Principio de extensión unidimensional', '2.3.2 Principio de extensión multidimensional', '3.0 Razonamiento difuso (contenido)',
  '3.1 Lógica clásica vs difusa', '3.2.1 Variable lingüística', '3.2.2 Regla si-entonces', '3.2.3 Modus ponens difuso'];

test('hay 22 títulos y cada uno cae en algún concepto', () => {
  assert.equal(TITULOS.length, 22);
  const conceptos = todosLosConceptos();
  for (const t of TITULOS) assert.ok(conceptos.some((c) => c.temas?.includes(t)), t);
});

test('ningún tema del catálogo está mal escrito', () => {
  for (const c of todosLosConceptos()) for (const t of c.temas ?? []) assert.ok(TITULOS.includes(t), t);
});

test('las 8 regiones de la noche y las 5 del amanecer existen, en orden', () => {
  assert.deepEqual(CATALOGO.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(CATALOGO.filter((r) => !r.lado).map((r) => r.titulo), ['El borde', 'La forma', 'El álgebra', 'Relaciones y extensión', 'Razonar', 'Sistemas', 'Aprender', 'Solo para valientes']);
});

test('ids únicos', () => {
  const ids = todosLosConceptos().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('la parte 1 tiene sus 10 conceptos; todo concepto listo sabe cargarse y declara sus retos', () => {
  assert.equal(CATALOGO[0].conceptos.length, 10);
  for (const c of todosLosConceptos()) if (c.estado === 'listo') { assert.equal(typeof c.carga, 'function'); assert.ok(c.retos.length > 0, c.id); }
});

test('buscarConcepto', () => {
  assert.equal(buscarConcepto('1-8-cortes-alfa').region.id, 1);
  assert.equal(buscarConcepto('no-existe'), null);
});

test('el curso está entero: ninguna parada pendiente', async () => {
  const { todosLosConceptos: todos } = await import('../contenido/catalogo.js');
  assert.deepEqual(todos().filter((c) => c.estado !== 'listo' && !/^(9|1[0-3])-/.test(c.id)).map((c) => c.id), []);
});
