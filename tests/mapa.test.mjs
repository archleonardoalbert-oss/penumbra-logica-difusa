import test from 'node:test';
import assert from 'node:assert/strict';
import { alturaMapa, regionEn, campoMapa, DOMINIO } from '../motor/alturaMapa.js';

const POS = [{ posicion: [0.2, 0.2] }, { posicion: [0.8, 0.8] }];

test('la colina crece con el grado de su región', () => {
  assert.ok(alturaMapa(0.2, 0.2, [1, 0], POS) > alturaMapa(0.2, 0.2, [0.5, 0], POS));
  assert.ok(alturaMapa(0.2, 0.2, [0.5, 0], POS) > alturaMapa(0.2, 0.2, [0, 0], POS));
});

test('no afecta de forma apreciable a la colina más lejana', () => {
  assert.ok(Math.abs(alturaMapa(0.8, 0.8, [1, 0], POS) - alturaMapa(0.8, 0.8, [0, 0], POS)) < 0.01);
});

test('sin ningún dominio, la colina sigue siendo visible', () => {
  assert.ok(alturaMapa(0.2, 0.2, [0, 0], POS) >= 0.12);
  assert.ok(alturaMapa(0.2, 0.2, [0, 0], POS) > alturaMapa(0.5, 0.5, [0, 0], POS) + 0.05);
});

test('nunca sale de [0, 1]', () => {
  const muchas = Array.from({ length: 8 }, () => ({ posicion: [0.5, 0.5] }));
  assert.ok(alturaMapa(0.5, 0.5, Array(8).fill(1), muchas) <= 1);
  assert.ok(alturaMapa(0, 1, [0, 0], POS) >= 0);
});

test('la subida inicial escala la altura', () => {
  assert.equal(alturaMapa(0.2, 0.2, [1, 0], POS, 0), 0);
  assert.ok(alturaMapa(0.2, 0.2, [1, 0], POS, 0.5) < alturaMapa(0.2, 0.2, [1, 0], POS, 1));
});

test('regionEn elige el centro más cercano dentro del radio', () => {
  const centros = [[100, 100], [300, 100]];
  assert.equal(regionEn([120, 110], centros, 60), 0);
  assert.equal(regionEn([290, 90], centros, 60), 1);
  assert.equal(regionEn([200, 300], centros, 60), -1);
});

test('la textura del terreno da la misma altura que el cálculo', () => {
  const N = 256, g = [0.5, 0], d = campoMapa(POS, g, N), [a, b] = DOMINIO, paso = (b - a) / (N - 1);
  for (const [i, j] of [[80, 90], [120, 140], [10, 200]]) {
    const x = a + i * paso, y = a + j * paso;
    assert.ok(Math.abs(d[4 * (j * N + i)] - alturaMapa(x, y, g, POS)) < 1e-5);
  }
});

test('el oro del terreno sale solo de lo dominado', () => {
  const N = 128, nada = campoMapa(POS, [0, 0], N), algo = campoMapa(POS, [1, 0], N);
  let maxN = 0, maxA = 0; for (let k = 1; k < nada.length; k += 4) { maxN = Math.max(maxN, nada[k]); maxA = Math.max(maxA, algo[k]); }
  assert.equal(maxN, 0); assert.ok(maxA > 0.8);
});

test('la inversa de la cámara deshace la cámara', async () => {
  const { camaraMapa, inversa } = await import('../motor/mapaGL.js');
  const { vp } = camaraMapa({ yaw: -0.2, pitch: 0.4, dist: 1.7, objetivo: [0.5, 0.5, 0.1], aspecto: 1.78, corrimiento: -0.27, alzado: -0.36 });
  const I = inversa(vp);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += I[k * 4 + j] * vp[i * 4 + k]; assert.ok(Math.abs(s - (i === j ? 1 : 0)) < 1e-3, `${i},${j}: ${s}`); }
});
