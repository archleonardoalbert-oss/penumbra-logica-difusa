import test from 'node:test'; import assert from 'node:assert/strict';
import { apilar } from '../motor/lienzo.js';
test('las columnas de una escena ancha se apilan, y las que comparten columna van juntas', () => {
  const caja = (f, c) => ({ x: 70 + c * 290, y: 42 + f * 150, w: 240, h: 112 });
  const r = apilar([caja(0, 0), caja(1, 0), caja(2, 0), { ...caja(0, 1), x: 360 }, { ...caja(1, 1), x: 360 }, { ...caja(2, 1), x: 360 }, { x: 670, y: 110, w: 380, h: 280 }], 1100, 530);
  assert.equal(r.trozos.length, 3); assert.ok(r.W2 < 500, `ancho ${r.W2}`);
  for (const t of r.trozos) { assert.ok(t.s.x >= 0 && t.s.x + t.s.w <= 1100); assert.equal(t.s.w, t.d.w); }
  r.trozos.slice(1).forEach((t, i) => assert.ok(t.d.y >= r.trozos[i].d.y + r.trozos[i].d.h, 'se solapan'));
});
