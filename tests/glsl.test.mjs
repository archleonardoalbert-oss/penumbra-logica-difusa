// Lo que pinta la GPU y lo que calcula JS deben ser la misma superficie: se traduce el GLSL a JS y se comparan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { todosLosConceptos } from '../contenido/catalogo.js';
import { crearEntradas, normalizar, primitivasDe } from '../motor/escena.js';

const AYUDA = { min: Math.min, max: Math.max, exp: Math.exp, abs: Math.abs, pow: Math.pow, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, log: Math.log, mix: (a, b, t) => a + (b - a) * t, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), step: (e, v) => (v < e ? 0 : 1), smoothstep: (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); } };
function aJS(glsl, nombres) {
  const cuerpo = glsl.replace(/\b(float|int|vec2|bool)\s+/g, 'let ').replace(/\b(\d+)\.(?!\d)/g, '$1.0').replace(/(^|[^\w.])\.(\d)/g, '$10.$2');
  return new Function('x', 'y', ...Object.keys(AYUDA), ...nombres, cuerpo);
}
for (const ficha of todosLosConceptos().filter((c) => c.estado === 'listo')) {
  test(`${ficha.id}: el terreno de la GPU es el de JS`, async () => {
    const { escena } = (await ficha.carga()).default;
    if (escena.formato !== '3d') return;
    const { e } = crearEntradas(escena);
    for (let paso = 0; paso < escena.pasos.length; paso++) for (const p of [0.5, 1]) {
      for (const q of normalizar(primitivasDe(escena, { paso, p, e })).grupos.flat().filter((x) => x.tipo === 'terreno' && x.glsl)) {
        const u = q.uniformes ?? {}, nombres = Object.keys(u), g = aJS(q.glsl, nombres);
        for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
          const x = (i + 0.37) / 21, y = (j + 0.61) / 21, gpu = g(x, y, ...Object.values(AYUDA), ...nombres.map((n) => u[n])), js = q.f(x, y);
          assert.ok(Math.abs(gpu - js) < 1e-3, `paso ${paso}, p=${p}, (${x.toFixed(2)}, ${y.toFixed(2)}): GPU ${gpu}, JS ${js}`);
        }
      }
    }
  });
}
