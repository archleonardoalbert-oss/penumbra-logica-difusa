import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLugar, describirLugar } from '../nucleo/lugar.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('guarda dónde estás, y lo recuerda otra sesión', () => {
  const a = memoria(), l = crearLugar(a);
  assert.equal(l.ultimo(), null);
  l.guardar('2-1', { etapa: 3, latido: 5, tope: 7, paso: 2, reto: 1, entradas: { x: 3 }, borradores: { r1: '0,5' } });
  const b = crearLugar(a);
  assert.equal(b.ultimo().c, '2-1');
  assert.equal(b.de('2-1').latido, 5);
  assert.deepEqual(b.de('2-1').entradas, { x: 3 });
});
test('cada parada recuerda lo suyo, y el último lugar es el más reciente', () => {
  const l = crearLugar(memoria());
  l.guardar('1-1', { etapa: 1 }); l.guardar('1-2', { etapa: 4 }); l.guardar('1-1', { etapa: 2 });
  assert.equal(l.ultimo().c, '1-1');
  assert.equal(l.de('1-2').etapa, 4);
});
test('olvidar lo borra todo; un almacén roto no rompe nada', () => {
  const a = memoria(), l = crearLugar(a);
  l.guardar('1-1', { etapa: 1 }); l.olvidar();
  assert.equal(crearLugar(a).ultimo(), null);
  a.setItem('penumbra-lugar-v1', '{roto');
  assert.equal(crearLugar(a).ultimo(), null);
  const fallo = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } };
  crearLugar(fallo).guardar('1-1', { etapa: 1 });
});
test('la descripción dice dónde te quedaste, en palabras', () => {
  assert.equal(describirLugar({ etapa: 3, latido: 3 }, { latidos: 12 }), 'Entiéndelo, 4 de 12');
  assert.equal(describirLugar({ etapa: 1, paso: 1 }, { pasos: 4 }), 'Míralo, paso 2 de 4');
  assert.equal(describirLugar({ etapa: 4, reto: 0 }, { retos: 3 }), 'Demuéstralo, reto 1 de 3');
  assert.equal(describirLugar({ etapa: 0 }, {}), 'La pregunta');
  assert.equal(describirLugar({ etapa: 2 }, {}), 'Tócalo');
  assert.equal(describirLugar({ etapa: 5 }, {}), 'Parada terminada');
});
