import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRed, crearVuelo, guionCruce, DURA_CRUCE, CAPAS, CENTRO_RED } from '../motor/mapaRed.js';

const cimas = [[0.1, 0.3, 0.2], [0.3, 0.7, 0.2], [0.5, 0.3, 0.2], [0.7, 0.7, 0.2], [0.9, 0.3, 0.2]];
const red = crearRed(cimas);
test('la red es real: cada activación sale de sus pesos', () => {
  for (const n of red.nodos) if (n.capa > 0) {
    const entra = red.todas.filter((a) => a.b === n.i), s = entra.reduce((v, a) => v + a.w * red.nodos[a.a].activ, n.sesgo);
    assert.ok(Math.abs(n.activ - 1 / (1 + Math.exp(-s))) < 1e-9);
  }
  assert.ok(red.nodos.every((n) => n.activ >= 0 && n.activ <= 1));
});
test('la ruta pasa por una neurona de cada capa, en orden', () => {
  assert.equal(red.ruta.length, CAPAS.length);
  red.ruta.forEach((i, k) => assert.equal(red.nodos[i].capa, k));
  for (let k = 1; k < red.ruta.length; k++) assert.ok(red.aristas.some((a) => a.a === red.ruta[k - 1] && a.b === red.ruta[k]), 'la arista de la ruta se dibuja');
});
test('las neuronas de la ruta son los capítulos: cada una mira a su montaña', () => {
  cimas.forEach((c, k) => assert.deepEqual(red.nodos[red.ruta[k + 1]].cima, c));
  assert.equal(red.nodos[red.ruta[0]].esCapitulo, false);
});
test('la red nunca se reordena: cada nodo está siempre en el mismo sitio', () => {
  for (const n of red.nodos) { assert.deepEqual(n.caos, n.orden); assert.deepEqual(n.fin, n.orden); }
});
const vuelo = crearVuelo(red), dt = 1 / 60, resta = (a, b) => a.map((v, i) => v - b[i]), lon = (a) => Math.hypot(...a);
test('el vuelo no da tirones: la velocidad cambia despacio en toda la película', () => {
  let vAnt = null, salto = 0;
  for (let t = 0; t < 40; t += dt) { const v = lon(resta(vuelo.en(t + dt).ojo, vuelo.en(t).ojo)) / dt; if (vAnt !== null) salto = Math.max(salto, Math.abs(v - vAnt)); vAnt = v; }
  assert.ok(salto < 0.03, `la velocidad salta ${salto} entre dos cuadros`);
});
test('la cámara nunca gira de golpe', () => {
  let m = 0;
  for (let t = 0; t < 40; t += dt) { const a = vuelo.en(t).dir, b = vuelo.en(t + dt).dir; m = Math.max(m, Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))); }
  assert.ok(m < 0.016, `gira ${m} rad en un cuadro`);
});
test('la cámara nunca se detiene antes de llegar: siempre va de camino', () => {
  for (let t = 0.2; t < 33; t += 0.25) assert.ok(lon(resta(vuelo.en(t + dt).ojo, vuelo.en(t).ojo)) / dt > 0.12, `casi parada en ${t}`);
});
test('pasa junto a cada neurona de la ruta, en orden', () => {
  red.ruta.forEach((i, k) => { let d = Infinity; for (let t = 0; t < 34; t += dt) d = Math.min(d, lon(resta(vuelo.en(t).ojo, red.nodos[i].orden))); assert.ok(d < 0.1, `neurona ${k}: lejos, ${d}`); });
  for (let k = 1; k < vuelo.tNodos.length; k++) assert.ok(vuelo.tNodos[k] - vuelo.tNodos[k - 1] > 1.6, 'hay tiempo de ver cada neurona');
  for (let t = 1; t < 40; t += 0.1) assert.ok(vuelo.en(t + 0.1).u >= vuelo.en(t).u);
});
test('la ruta no da saltos laterales bruscos', () => {
  for (let k = 1; k < red.ruta.length; k++) { const a = red.nodos[red.ruta[k - 1]].orden, b = red.nodos[red.ruta[k]].orden; assert.ok(Math.hypot(a[1] - b[1], a[2] - b[2]) < 0.8, `tramo ${k}`); }
});
test('la red solo cuadra al final: desde el punto de llegada, cada capa es una columna; desde dentro, no', () => {
  const dispersion = (t) => { const { ojo, dir } = vuelo.en(t), der = [dir[1], -dir[0], 0], lat = der.map((v) => v / lon(der)); const col = red.porCapa.map((c) => c.map((n) => { const d = resta(n.orden, ojo), z = d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2]; return (d[0] * lat[0] + d[1] * lat[1]) / Math.max(z, 0.05); })); const medias = col.map((c) => c.reduce((a, b) => a + b, 0) / c.length), hueco = Math.abs(medias[1] - medias[0]); return Math.max(...col.map((c, i) => Math.max(...c.map((v) => Math.abs(v - medias[i]))))) / Math.max(hueco, 1e-6); };
  assert.ok(dispersion(36) < 0.45, `al final: ${dispersion(36)}`);
  assert.ok(dispersion(18) > 1, `dentro: ${dispersion(18)}`);
  const f = vuelo.en(36), hacia = resta(CENTRO_RED, f.ojo), l = lon(hacia);
  assert.ok(f.dir[0] * hacia[0] / l + f.dir[1] * hacia[1] / l + f.dir[2] * hacia[2] / l > 0.995, 'mira al centro');
});
test('es determinista: la misma película cada vez', () => {
  assert.deepEqual(crearRed(cimas).ruta, red.ruta);
});
test('el guion: primero estrellas sin conexiones; luego conexiones; luego la red de lejos; y al final, el amanecer', () => {
  const a = guionCruce(1), b = guionCruce(12), m = guionCruce(35), z = guionCruce(DURA_CRUCE);
  assert.equal(a.aristas, 0); assert.ok(b.aristas > 0.2 && b.aristas <= 0.5);
  assert.equal(m.retro, 1); assert.equal(m.alba, 0);
  assert.equal(z.alba, 1); assert.equal(z.hilos, 1); assert.equal(z.ui, 1); assert.equal(z.fuerza, 0);
});
