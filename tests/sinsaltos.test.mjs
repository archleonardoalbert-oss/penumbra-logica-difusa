// Al acabar la última animación, la escena pasa a obedecer a los mandos: no debe cambiar de golpe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { todosLosConceptos } from '../contenido/catalogo.js';
import { crearEntradas, normalizar, primitivasDe } from '../motor/escena.js';

const textos = (r) => normalizar(r).grupos.flat().filter((x) => x.tipo === 'rotulo' || x.tex !== undefined).map((x) => `${x.clave ?? ''}=${x.tex}`).sort();

for (const ficha of todosLosConceptos().filter((c) => c.estado === 'listo')) {
  test(`${ficha.id}: el final de la animación no salta`, async () => {
    const { escena } = (await ficha.carga()).default, paso = escena.pasos.length - 1, { e } = crearEntradas(escena);
    const antes = textos(primitivasDe(escena, { paso, p: 0.9999, e })), despues = textos(primitivasDe(escena, { paso, p: 1, e }));
    assert.deepEqual(despues, antes);
  });
}
