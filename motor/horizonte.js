// El Horizonte: el mapa de la ruta de fuzzython. Cada parada es un punto de una sola órbita que cae hacia el agujero negro.
import { crearHorizonte } from './horizonteGL.js';
import { CATALOGO } from '../contenido/catalogo.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { crearLugar } from '../nucleo/lugar.js';
const hN = 'http://www.w3.org/2000/svg';
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'className') e.className = v; else if (k === 'textContent') e.textContent = v; else e.setAttribute(k, v); } c.flat().forEach((x) => e.append(x)); return e; };
const sv = (t, a = {}) => { const e = document.createElementNS(hN, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
const mezcla = (a, b, k) => a + (b - a) * k, suave = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
/** Radio de cada anillo: de lejos a pegado al horizonte. r = 1 es el horizonte; r = 1,5, la esfera de fotones. */
const TRAMOS = [[32, 21], [19, 11.5], [10.5, 5.6], [4.8, 2.05], [1.6, 1.07]];
export function trayecto(regiones) {
  const pts = []; let az = 0.3;
  regiones.forEach((r, ir) => { const [a, b] = TRAMOS[Math.min(ir, TRAMOS.length - 1)], n = r.conceptos.length; r.conceptos.forEach((c, i) => { const f = n > 1 ? i / (n - 1) : 0; pts.push({ c, region: r, r: a * (b / a) ** f, az, ir }); az += 0.62 + 0.42 / (a * (b / a) ** f) ** 0.4; }); });
  return pts;
}
export function montarHorizonte(raiz, { catalogo = CATALOGO, almacen = localStorage } = {}) {
  const regiones = catalogo.filter((r) => r.lado === 'horizonte'), P = trayecto(regiones), progreso = crearProgreso(almacen), N = P.length, q = new URLSearchParams(location.search);
  const canvas = h('canvas', { id: 'c' }), panel = h('aside', { className: 'hz-panel' }), mapa = sv('svg', { class: 'hz-mapa', viewBox: '-110 -110 220 220', role: 'img', 'aria-label': 'La órbita en espiral y sus paradas' });
  raiz.append(canvas, h('header', { className: 'hz-cab' }, h('h1', { textContent: 'El Horizonte' }), h('p', { textContent: 'fuzzython, en una órbita que cae.' })), panel, mapa, h('a', { className: 'hz-volver', href: 'index.html?lado=alba', textContent: 'Volver al amanecer' }));
  let g; try { g = crearHorizonte(canvas); } catch (e) { canvas.remove(); }
  const grado = (x) => progreso.gradoConcepto(x.c.id, x.c.retos);
  const inicial = () => { const pid = q.get('ir'); if (pid) { const i = P.findIndex((x) => x.c.id === pid); if (i >= 0) return i; } const l = crearLugar(almacen).ultimoEntre(P.map((x) => x.c.id)); if (l) { const i = P.findIndex((x) => x.c.id === l.c); if (i >= 0) return i; } const i = P.findIndex((x) => grado(x) < 0.7); return i < 0 ? 0 : i; };
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let objetivo = inicial(), k = q.has('ir') && objetivo > 0 && !reducido ? objetivo - 1 : objetivo, t = 0, ult = performance.now(), fijo = false, mirX = 0, mirY = 0, arr = null;
  // minimapa: la espiral, con el radio en escala logarítmica para que quepa todo
  const posM = (x) => { const v = 104 * (Math.log(x.r) / Math.log(34)) ** 0.8; return [v * Math.cos(x.az), v * Math.sin(x.az)]; };
  let dS = ''; for (let i = 0; i < N - 1; i++) { for (let u = 0; u < 1; u += 0.1) { const r = P[i].r * (P[i + 1].r / P[i].r) ** u, az = mezcla(P[i].az, P[i + 1].az, u), v = 104 * (Math.log(r) / Math.log(34)) ** 0.8; dS += `${i || u ? 'L' : 'M'}${(v * Math.cos(az)).toFixed(2)} ${(v * Math.sin(az)).toFixed(2)}`; } }
  const [xz, yz] = N ? posM(P[N - 1]) : [0, 0]; mapa.append(sv('path', { class: 'hz-esp', d: dS + `L${xz} ${yz}` }), sv('circle', { class: 'hz-sombra', r: 7 }));
  const puntos = P.map((x, i) => { const [a, b] = posM(x), c = sv('circle', { class: 'hz-pto', cx: a, cy: b, r: 3.1, tabindex: 0 }); const tit = sv('title'); tit.textContent = x.c.titulo; c.append(tit); c.addEventListener('click', () => { objetivo = i; pintar(); }); mapa.append(c); return c; });
  const marca = sv('circle', { class: 'hz-yo', r: 5.4 }); mapa.append(marca);
  function pintar() {
    const x = P[objetivo]; if (!x) return; const r = x.region, g0 = grado(x), lista = h('ol', { className: 'hz-lista' }, r.conceptos.map((c) => { const i = P.findIndex((y) => y.c.id === c.id), b = h('button', { type: 'button', className: i === objetivo ? 'activa' : '', textContent: c.titulo }); b.addEventListener('click', () => { objetivo = i; pintar(); }); return h('li', {}, b); }));
    const ent = h('a', { className: 'boton-seguir', href: `concepto.html?c=${x.c.id}`, textContent: g0 > 0 ? 'Seguir en esta parada' : 'Entrar en esta parada' });
    const atras = h('button', { type: 'button', className: 'hz-paso', textContent: 'Órbita anterior', 'aria-label': 'Parada anterior' }), ade = h('button', { type: 'button', className: 'hz-paso', textContent: 'Caer más', 'aria-label': 'Parada siguiente' });
    atras.disabled = objetivo === 0; ade.disabled = objetivo === N - 1; atras.addEventListener('click', () => mover(-1)); ade.addEventListener('click', () => mover(1));
    panel.replaceChildren(h('p', { className: 'rotulo-etapa', textContent: `Anillo ${r.anillo}: ${r.titulo}` }), h('h2', { textContent: x.c.titulo }), h('p', { className: 'lema', textContent: r.lema }), ent, h('div', { className: 'hz-pasos' }, atras, ade), lista, h('p', { className: 'tenue hz-dist', textContent: `A ${String(x.r.toFixed(x.r < 3 ? 2 : 1)).replace('.', ',')} veces el radio del horizonte, contando desde el centro` }));
    puntos.forEach((c, i) => { c.classList.toggle('hecho', grado(P[i]) >= 0.7); c.classList.toggle('activo', i === objetivo); });
  }
  const mover = (d) => { objetivo = Math.max(0, Math.min(N - 1, objetivo + d)); pintar(); };
  pintar();
  addEventListener('keydown', (e) => { if (e.target.closest?.('a,button')) { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; } if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { mover(1); e.preventDefault(); } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { mover(-1); e.preventDefault(); } });
  let ac = 0; canvas.addEventListener('wheel', (e) => { ac += e.deltaY; if (Math.abs(ac) > 120) { mover(Math.sign(ac)); ac = 0; } }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { arr = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); }); canvas.addEventListener('pointermove', (e) => { if (!arr) return; mirX = Math.max(-0.8, Math.min(0.8, mirX + (e.clientX - arr[0]) * 0.003)); mirY = Math.max(-0.5, Math.min(0.5, mirY + (e.clientY - arr[1]) * 0.003)); arr = [e.clientX, e.clientY]; }); canvas.addEventListener('pointerup', () => { arr = null; });
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); }, cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  /** Dónde está la cámara para un avance continuo por la órbita. Función pura: la misma k da el mismo plano. */
  function camara(kk) {
    const i = Math.min(N - 2, Math.floor(kk)), f = kk - i, A = P[Math.max(0, i)], B = P[Math.min(N - 1, i + 1)] ?? A, u = suave(f), r = A.r * (B.r / A.r) ** u, az = mezcla(A.az, B.az, u), inc = mezcla(0.28, 0.07, suave((30 - r) / 22));
    const C = [r * Math.cos(inc) * Math.sin(az), -r * Math.cos(inc) * Math.cos(az), r * Math.sin(inc)];
    // pegada al horizonte ya no se puede mirar otra cosa: el universo entero cabe en una ventana, y se mira hacia ella
    // La mirada gira en su plano: hacia el centro, de lado (con el agujero a la izquierda) y, al final, hacia fuera.
    const n = norm(C), tan = norm(cruz([0, 0, 1], n)), gira = Math.PI * (0.5 * suave((5 - r) / 3.2) + 0.5 * suave((1.62 - r) / 0.42)), mir = norm(n.map((v, j) => -v * Math.cos(gira) + tan[j] * Math.sin(gira))), de = norm(cruz(mir, [0, 0, 1])), ar = cruz(de, mir), fuera = suave((1.62 - r) / 0.42);
    const lado = innerWidth > 760 ? 0.1 + 0.06 * fuera : 0, f2 = norm(mir.map((v, j) => v + de[j] * (mirX + lado) + ar[j] * -mirY)), de2 = norm(cruz(f2, [0, 0, 1])), ar2 = cruz(de2, f2);
    return { C, base: [...de2, ...ar2, ...f2.map((v) => -v)], fov: mezcla(0.62, 1.3, suave((12 - r) / 9)), r };
  }
  /** El ojo se adapta: pegado al horizonte, un observador quieto recibe la luz con un corrimiento al azul enorme (g⁴ crece como (1 − 1/r)⁻²). */
  const exposicion = (r) => 0.62 * Math.min(1, (1 - 1 / r) ** 2 / 0.3);
  function cuadro(ms) {
    requestAnimationFrame(cuadro); if (document.hidden) { ult = ms; return; }
    const dt = Math.min(0.05, (ms - ult) / 1000); ult = ms; if (!fijo) { t += dt; k = reducido ? objetivo : k + (objetivo - k) * (1 - Math.exp(-dt * 0.85)); if (Math.abs(objetivo - k) < 1e-4) k = objetivo; if (!arr) { mirX *= 1 - dt * 0.5; mirY *= 1 - dt * 0.5; } }
    const W = Math.round(innerWidth * Math.min(devicePixelRatio || 1, 1.25)), H = Math.round(innerHeight * Math.min(devicePixelRatio || 1, 1.25)); if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    if (g && N) { const c = camara(N > 1 ? k : 0); g.dibujar({ ...c, t, expo: exposicion(c.r) }); if (marca) { const a = posM({ r: c.r, az: mezcla(P[Math.floor(Math.min(k, N - 1))].az, P[Math.min(N - 1, Math.floor(k) + 1)].az, suave(k - Math.floor(k))) }); marca.setAttribute('cx', a[0]); marca.setAttribute('cy', a[1]); } }
  }
  requestAnimationFrame(cuadro);
  return { fijar: (o) => { if ('k' in o) { k = o.k; objetivo = Math.round(o.k); pintar(); } if ('t' in o) { t = o.t; } fijo = true; }, actual: () => P[objetivo]?.c.id, paradas: () => P.map((x) => ({ id: x.c.id, r: x.r })) };
}
