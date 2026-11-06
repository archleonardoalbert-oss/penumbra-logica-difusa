// La portada: un terreno con una colina por región, cuya altura y color cuentan cuánto dominas cada una.
import { CATALOGO } from '../contenido/catalogo.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { siguienteConcepto } from '../nucleo/recorrido.js';
import { alturaMapa, glslMapa, regionEn } from './alturaMapa.js';
import { barraGrado, h, tituloDifuso, tryLocal } from './concepto.js';
import { crearLienzo, soportaGL2 } from './lienzo.js';
import { curva, punto, rotulo, terreno } from './primitivas.js';
import { crearRender3D } from './render3d.js';
import { ev, mix } from './tiempo.js';

const W = 1100, HH = 640;
const coma = (v) => v.toFixed(2).replace('.', ',');

function listaConceptos(region, progreso) {
  const proximo = siguienteConcepto([region], progreso)?.id;
  return h('ul', { className: 'mapa-conceptos' }, region.conceptos.map((c) => {
    const g = progreso.gradoConcepto(c.id, c.retos);
    if (c.estado !== 'listo') return h('li', { className: 'pendiente' }, h('span', { textContent: c.titulo }), h('small', { textContent: 'aún no' }));
    return h('li', { className: c.id === proximo ? 'proximo' : '' }, h('a', { href: `concepto.html?c=${c.id}`, textContent: c.titulo }), h('small', { textContent: c.id === proximo ? 'te toca' : coma(g) }));
  }));
}

function listaPlana(raiz, catalogo, progreso) {
  raiz.append(h('div', { className: 'mapa-lista' }, catalogo.map((r) => h('section', {}, h('h2', { textContent: `${r.id}. ${r.titulo}` }), h('p', { textContent: r.lema }), listaConceptos(r, progreso)))));
}

export function montarMapa(raiz, { catalogo = CATALOGO, almacen = tryLocal() } = {}) {
  const progreso = crearProgreso(almacen);
  const cabecera = h('header', { className: 'mapa-cabecera' }, tituloDifuso('Penumbra'), h('p', { className: 'lema', textContent: 'Un camino por la lógica difusa: de lo que tiene borde a lo que no.' }));
  const pagina = h('main', { className: 'portada' });
  raiz.replaceChildren(pagina);
  pagina.append(cabecera);
  const pie = () => {
    const zona = h('div', { className: 'mapa-pie' });
    const inicio = h('button', { type: 'button', textContent: 'Empezar de cero' });
    inicio.addEventListener('click', () => {
      const si = h('button', { type: 'button', className: 'peligro', textContent: 'Sí, borrar todo' }), no = h('button', { type: 'button', textContent: 'Cancelar' });
      si.addEventListener('click', () => { progreso.reiniciar(); zona.replaceChildren(inicio); alCambiar(); });
      no.addEventListener('click', () => zona.replaceChildren(inicio));
      zona.replaceChildren(h('span', { textContent: 'Se borrarán todas tus notas. ¿Seguro?' }), si, no);
    });
    zona.append(inicio);
    return zona;
  };
  let alCambiar = () => {};

  if (!soportaGL2()) {
    listaPlana(pagina, catalogo, progreso);
    pagina.append(pie());
    alCambiar = () => { pagina.querySelector('.mapa-lista').remove(); listaPlana(pagina, catalogo, progreso); };
    return null;
  }

  const zonaMapa = h('div', { className: 'mapa-lienzo' }), panel = h('aside', { className: 'mapa-panel' }), cuerpoPanel = h('div', { className: 'panel-cuerpo' });
  const indice = h('nav', { className: 'mapa-indice', ariaLabel: 'Regiones' });
  panel.append(cuerpoPanel, indice, pie());
  pagina.prepend(zonaMapa);
  pagina.append(panel);

  const lienzo = crearLienzo(zonaMapa, { W, H: HH, gl: true });
  const r3 = crearRender3D(lienzo, { cx: 430, cy: 232, S: 450 });
  const glsl = glslMapa(catalogo);
  let camara = { yaw: -0.62, pitch: 0.92 }, t = matchMedia('(prefers-reduced-motion: reduce)').matches ? 9 : 0;
  let enfocada = null, fijada = null;

  const grados = () => catalogo.map((r) => progreso.gradoRegion(r.id, catalogo));
  const sube = () => ev(t, 0, 1.6);
  const cima = (r, g) => [r.posicion[0], r.posicion[1], alturaMapa(r.posicion[0], r.posicion[1], g, catalogo, sube())];

  function prims() {
    const g = grados(), s = sube(), uniformes = { sube: s };
    g.forEach((v, i) => { uniformes[`g${i}`] = v; });
    const f = (x, y) => alturaMapa(x, y, g, catalogo, s);
    const lista = [terreno(f, { glsl, uniformes })];
    // el camino: pasa por todas las cimas en orden, pegado al terreno
    const sig = siguienteConcepto(catalogo, progreso), iSig = sig ? catalogo.findIndex((r) => r.id === sig.region.id) : catalogo.length - 1;
    const tramo = (i, u) => {
      const a = catalogo[Math.max(0, i - 1)].posicion, b = catalogo[i].posicion, c = catalogo[Math.min(catalogo.length - 1, i + 1)].posicion, d = catalogo[Math.min(catalogo.length - 1, i + 2)].posicion;
      const cr = (k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
      const x = cr(0), y = cr(1);
      return [x, y, f(x, y) + 0.012];
    };
    for (let i = 0; i + 1 < catalogo.length; i++) {
      const hecho = i < iSig;
      lista.push(curva((u) => tramo(i, u), [0, 1], { n: 40, ancho: hecho ? 4 : 2.2, color: hecho ? [244, 211, 69] : [150, 156, 180], alfa: (hecho ? 1 : 0.55) * s, brillo: hecho, discontinua: !hecho }));
    }
    if (sig) {
      const p = cima(sig.region, g), lat = (t * 0.9) % 1;
      lista.push(punto(p, { radio: 9 + 16 * lat, color: [255, 255, 255], alfa: 0.35 * (1 - lat) * s }));
    }
    catalogo.forEach((r, i) => {
      const p = cima(r, g), activa = enfocada === r.id || fijada === r.id;
      lista.push(punto(p, { radio: activa ? 8 : 5, color: activa ? [255, 255, 255] : [244, 211, 69], alfa: s }));
      lista.push(rotulo(p, `\\text{${r.titulo}}`, { clave: `r${r.id}`, dy: -24, tam: activa ? 19 : 15, color: activa ? [255, 255, 255] : [232, 228, 216], alfa: s }));
    });
    return lista;
  }

  let vuelo = null;
  const pintar = () => { lienzo.aplicar(); r3.dibujar(prims(), vuelo ? { ...camara, ...vuelo.vista(t) } : { ...camara, ...vista }); };

  /** Al continuar, la cámara cae sobre la colina y la página se funde: no es un enlace más, es seguir andando. */
  function volarA(sig) {
    const destino = `concepto.html?c=${sig.id}`;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { location.href = destino; return; }
    const g = grados(), [px, py] = r3.proyectar(cima(sig.region, g)), t0 = t, Z = 3;
    vuelo = { vista: (tt) => { const k = ev(tt - t0, 0, 0.9), z = mix(1, Z, k); return { S: vista.S * z, cx: mix(vista.cx, 430 - (px - vista.cx) * Z, k), cy: mix(vista.cy, 320 - (py - vista.cy) * Z, k) }; } };
    pagina.classList.add('fundiendo');
    setTimeout(() => { location.href = destino; }, 880);
  }

  let huella = '';
  /** Solo se anima el panel si cambia de verdad lo que dice. */
  function rellenar(...hijos) {
    const clave = hijos.map((x) => x?.textContent ?? '').join('|');
    if (clave !== huella) { huella = clave; cuerpoPanel.style.animation = 'none'; void cuerpoPanel.offsetWidth; cuerpoPanel.style.animation = ''; }
    cuerpoPanel.replaceChildren(...hijos);
  }
  function pintarPanel() {
    const id = enfocada ?? fijada, r = catalogo.find((x) => x.id === id);
    if (!r) {
      const sig = siguienteConcepto(catalogo, progreso);
      if (!sig) { rellenar(h('h2', { textContent: 'Has recorrido todo lo escrito' }), h('p', { textContent: 'Tus colinas brillan. Vuelve a cualquier parada, o espera a la siguiente región.' })); return; }
      const ir = h('button', { type: 'button', className: 'boton-seguir', textContent: 'Continuar el camino →' });
      ir.addEventListener('click', () => volarA(sig));
      rellenar(h('p', { className: 'rotulo-etapa', textContent: 'Tu siguiente parada' }), h('h2', { textContent: sig.titulo }), h('p', { className: 'tenue', textContent: `Región ${sig.region.id}: ${sig.region.titulo}` }), ir,
        h('p', { className: 'tenue', textContent: 'El camino dorado es lo que llevas. Las colinas crecen con lo que demuestras en los retos; mirar no sube nada.' }));
      return;
    }
    const { el } = barraGrado(progreso.gradoRegion(r.id, catalogo));
    const salir = h('button', { type: 'button', className: 'boton-atras', textContent: '← Ver todo el camino' });
    salir.addEventListener('click', () => abrir(null));
    const sigAqui = siguienteConcepto(catalogo, progreso);
    rellenar(sigAqui ? h('a', { className: 'siguiente-compacta', href: `concepto.html?c=${sigAqui.id}`, textContent: `Tu siguiente parada: ${sigAqui.titulo} →` }) : '', fijada === r.id ? salir : '', h('p', { className: 'tenue', textContent: `Región ${r.id}` }), h('h2', { textContent: r.titulo }), h('p', { className: 'lema', textContent: r.lema }), el, fijada === r.id ? listaConceptos(r, progreso) : h('p', { className: 'tenue', textContent: 'Haz clic para ver sus conceptos.' }));
  }

  /** Abrir una región acerca la cámara a su colina; soltarla vuelve a la vista completa. */
  let vista = { S: 450, cx: 430, cy: 232 }, objetivo = { ...vista };
  const VISTA_BASE = { S: 450, cx: 430, cy: 232 };
  const enfocarRegion = (id) => {
    if (id === null) { objetivo = { ...VISTA_BASE }; return; }
    const r = catalogo.find((x) => x.id === id), p = r3.proyectar(cima(r, grados())), Z = 1.45;
    const sx = vista.S / VISTA_BASE.S, bx = VISTA_BASE.cx + (p[0] - vista.cx) / sx, by = VISTA_BASE.cy + (p[1] - vista.cy) / sx;
    objetivo = { S: VISTA_BASE.S * Z, cx: 430 - (bx - VISTA_BASE.cx) * Z, cy: 330 - (by - VISTA_BASE.cy) * Z };
  };
  const abrir = (id) => { fijada = id; enfocada = null; enfocarRegion(id); indice.querySelectorAll('button').forEach((b) => b.classList.toggle('activa', b.dataset.region === String(id))); pintarPanel(); };
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && fijada !== null) abrir(null); });
  catalogo.forEach((r) => {
    const b = h('button', { type: 'button', textContent: `${r.id}. ${r.titulo}` });
    b.dataset.region = String(r.id);
    b.addEventListener('click', () => abrir(r.id));
    indice.append(b);
  });

  const centros = () => { const g = grados(); return catalogo.map((r) => r3.proyectar(cima(r, g))); };
  let giro = null, movido = 0;
  const zona = lienzo.raiz;
  zona.addEventListener('pointerdown', (ev2) => { giro = lienzo.pos(ev2); movido = 0; zona.setPointerCapture(ev2.pointerId); });
  zona.addEventListener('pointermove', (ev2) => {
    const px = lienzo.pos(ev2);
    if (giro) {
      movido += Math.hypot(px[0] - giro[0], px[1] - giro[1]);
      camara = r3.camaraValida({ yaw: camara.yaw + (px[0] - giro[0]) * 0.006, pitch: camara.pitch + (px[1] - giro[1]) * 0.004 });
      giro = px;
      return;
    }
    const i = regionEn(px, centros(), 70), id = i >= 0 ? catalogo[i].id : null;
    zona.style.cursor = id ? 'pointer' : 'grab';
    if (id !== enfocada && !(id === null && fijada === null && enfocada === null)) { enfocada = id; pintarPanel(); }
  });
  const soltar = (ev2) => {
    if (giro && movido < 6 && ev2.type === 'pointerup') {
      const i = regionEn(lienzo.pos(ev2), centros(), 70);
      if (i >= 0) abrir(catalogo[i].id);
    }
    giro = null;
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);

  alCambiar = () => { pintarPanel(); };
  lienzo.animar((dt) => {
    t += dt;
    for (const k of ['S', 'cx', 'cy']) vista[k] += (objetivo[k] - vista[k]) * Math.min(1, dt * 5);
    pintar();
  });
  pintarPanel();
  pintar();

  return {
    camara: () => r3.camaraValida(camara),
    aPantalla(id) {
      const i = catalogo.findIndex((r) => r.id === id), [x, y] = centros()[i], b = zona.getBoundingClientRect();
      return [b.left + (x * b.width) / W, b.top + (y * b.height) / HH];
    },
  };
}
