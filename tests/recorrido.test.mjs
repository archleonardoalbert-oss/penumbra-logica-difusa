import test from 'node:test';
import assert from 'node:assert/strict';
import { siguienteConcepto, enlazarTerminos } from '../nucleo/recorrido.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { GLOSARIO } from '../contenido/glosario.js';
import { todosLosConceptos } from '../contenido/catalogo.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const CAT = [{ id: 1, conceptos: [
  { id: 'a', estado: 'listo', retos: [{ id: 'r' }] }, { id: 'b', estado: 'listo', retos: [{ id: 'r' }] }, { id: 'c', estado: 'pendiente', retos: [] } ] }];

test('sin progreso, lo siguiente es el primer concepto', () => {
  assert.equal(siguienteConcepto(CAT, crearProgreso(mem())).id, 'a');
});
test('un concepto dominado se salta; uno flojo sigue siendo lo siguiente', () => {
  const p = crearProgreso(mem());
  p.registrar('a', 'r', 0.3);
  assert.equal(siguienteConcepto(CAT, p).id, 'a');
  p.registrar('a', 'r', 0.9);
  assert.equal(siguienteConcepto(CAT, p).id, 'b');
});
test('los pendientes no son destino; con todo dominado no hay siguiente', () => {
  const p = crearProgreso(mem());
  p.registrar('a', 'r', 1); p.registrar('b', 'r', 1);
  assert.equal(siguienteConcepto(CAT, p), null);
});
test('[[palabra]] se convierte en un botón con su explicación disponible', () => {
  const g = { supremo: { titulo: 'Supremo', texto: 'x' } };
  assert.equal(enlazarTerminos('el [[supremo]] vale', g), 'el <button type="button" class="termino" data-termino="supremo">supremo</button> vale');
  assert.equal(enlazarTerminos('los [[supremos|supremo]]', g), 'los <button type="button" class="termino" data-termino="supremo">supremos</button>');
});
test('un término que no está en el glosario es un error, no un silencio', () => {
  assert.throws(() => enlazarTerminos('[[nada]]', {}), /nada/);
});
test('el glosario explica en palabras y con un ejemplo', () => {
  for (const [k, v] of Object.entries(GLOSARIO)) { assert.ok(v.titulo && v.texto, k); assert.ok(v.ejemplo, `${k} sin ejemplo`); }
});
test('todo concepto listo dice por qué viene el siguiente', async () => {
  for (const f of todosLosConceptos().filter((c) => c.estado === 'listo')) assert.ok((await f.carga()).default.puente, f.id);
});

test('todos los términos marcados en el contenido existen en el glosario', async () => {
  for (const f of todosLosConceptos().filter((c) => c.estado === 'listo')) {
    const c = (await f.carga()).default;
    enlazarTerminos(JSON.stringify(c), GLOSARIO);
  }
});
