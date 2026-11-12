import test from 'node:test';
import assert from 'node:assert/strict';
import { PHI_MAX, construirLUT, leerEnd, leerUV, psiCritico } from '../nucleo/lutRayos.js';
/** La referencia: el mismo RK4 de u'' = -u + 1,5 u², con paso muy fino. */
function fino(r0, psi, phiFin) { const cp = Math.cos(psi), sp = Math.max(Math.sin(psi), 1e-3); let u = 1 / r0; const fs = Math.sqrt(1 - u); let v = (-u * fs * cp) / sp, fi = 0; const h = 0.002, f = (x) => -x + 1.5 * x * x; while (fi < phiFin) { const k1 = v, l1 = f(u), k2 = v + 0.5 * h * l1, l2 = f(u + 0.5 * h * k1), k3 = v + 0.5 * h * l2, l3 = f(u + 0.5 * h * k2), k4 = v + h * l3, l4 = f(u + h * k3); u += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); v += (h / 6) * (l1 + 2 * l2 + 2 * l3 + l4); fi += h; if (u >= 0.995) return null; if (u < Math.min(0.5 / r0, 0.012) && v < 0) return null; } return { u, v }; }
for (const r0 of [140, 32, 10.5, 4.8, 2.05, 1.45, 1.07]) test(`la tabla reproduce la trayectoria exacta a r = ${r0}`, () => {
  const L = construirLUT(r0); const E = []; let sem = 12345; const azar = () => (sem = (Math.imul(sem, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 900; i++) { const psi = azar() * Math.PI, e = leerEnd(L, psi), phi = azar() * Math.min(e.fin, PHI_MAX), ref = fino(r0, psi, phi); if (!ref || e.fin - phi < 0.03) continue; const m = leerUV(L, psi, phi), err = Math.abs(1 / m.u - 1 / ref.u) / (1 / ref.u); if (1 / ref.u > 3 && 1 / ref.u < 20) E.push(err); }
  E.sort((a, b) => a - b); assert.ok(E.length > 15, `pocas muestras: ${E.length}`); assert.ok(E[E.length >> 1] < 0.004, `mediana ${E[E.length >> 1]}`); assert.ok(E[Math.floor(E.length * 0.98)] < 0.04, `percentil 98: ${E[Math.floor(E.length * 0.98)]}`);
});
test('el rayo escapa o cae según el ángulo crítico, a ambos lados de la esfera de fotones', () => { for (const r0 of [32, 1.45]) { const L = construirLUT(r0), c = psiCritico(r0); assert.equal(leerEnd(L, c - 0.05).sale, true, `${r0} debería escapar`); assert.equal(leerEnd(L, c + 0.05).sale, false, `${r0} debería caer`); } });
test('construirla es barata: se puede rehacer al caer', () => { const t0 = performance.now(); for (let i = 0; i < 10; i++) construirLUT(1.2 + i * 0.3); const ms = (performance.now() - t0) / 10; console.log('tabla:', ms.toFixed(1), 'ms'); assert.ok(ms < 40, 'tarda demasiado'); });
