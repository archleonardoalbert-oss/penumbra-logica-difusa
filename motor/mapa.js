// La portada: un terreno con una colina por región, cuya altura y color cuentan cuánto dominas cada una.
import { CATALOGO } from '../contenido/catalogo.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { alturaMapa, glslMapa, regionEn } from './alturaMapa.js';
import { barraGrado, h, tituloDifuso, tryLocal } from './concepto.js';
import { crearLienzo, soportaGL2 } from './lienzo.js';
import { punto, rotulo, terreno } from './primitivas.js';
import { crearRender3D } from './render3d.js';
import { ev } from './tiempo.js';

const W = 1100, HH = 640;
const coma = (v) => v.toFixed(2).replace('.', ',');

function listaConceptos(region, progreso) {
  return h('ul', { className: 'mapa-conceptos' }, region.conceptos.map((c) => {
    const g = progreso.gradoConcepto(c.id, c.retos);
    if (c.estado !== 'listo') return h('li', { className: 'pendiente' }, h('span', { textContent: c.titulo }), h('small', { textContent: 'aún no' }));
    return h('li', {}, h('a', { href: `concepto.html?c=${c.id}`, textContent: c.titulo }), h('small', { textContent: coma(g) }));
  }));
}

function listaPlana(raiz, catalogo, progreso) {
  raiz.append(h('div', { className: 'mapa-lista' }, catalogo.map((r) => h('section', {}, h('h2', { textContent: `${r.id}. ${r.titulo}` }), h('p', { textContent: r.lema }), listaConceptos(r, progreso)))));
}

export function montarMapa(raiz, { catalogo = CATALOGO, almacen = tryLocal() } = {}) {
  const progreso = crearProgreso(almacen);
  const cabecera = h('header', { className: 'mapa-cabecera' }, tituloDifuso('Penumbra'), h('p', { className: 'lema', textContent: 'Un curso de lógica difusa: la zona entre la luz y la sombra.' }));
  const pagina = h('main', { className: 'pagina portada' }, cabecera);
  raiz.replaceChildren(pagina);
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

  const zonaMapa = h('div', { className: 'mapa-lienzo' }), panel = h('aside', { className: 'mapa-panel' });
  const indice = h('nav', { className: 'mapa-indice', ariaLabel: 'Regiones' });
  pagina.append(h('div', { className: 'mapa-rejilla' }, zonaMapa, panel), indice, pie());

  const lienzo = crearLienzo(zonaMapa, { W, H: HH, gl: true });
  const r3 = crearRender3D(lienzo, { cx: 550, cy: 262, S: 480 });
  const glsl = glslMapa(catalogo);
  let camara = { yaw: -0.62, pitch: 0.92 }, t = matchMedia('(prefers-reduced-motion: reduce)').matches ? 9 : 0, sucio = true;
  let enfocada = null, fijada = null;

  const grados = () => catalogo.map((r) => progreso.gradoRegion(r.id, catalogo));
  const sube = () => ev(t, 0, 1.6);
  const cima = (r, g) => [r.posicion[0], r.posicion[1], alturaMapa(r.posicion[0], r.posicion[1], g, catalogo, sube())];

  function prims() {
    const g = grados(), s = sube(), uniformes = { sube: s };
    g.forEach((v, i) => { uniformes[`g${i}`] = v; });
    const f = (x, y) => alturaMapa(x, y, g, catalogo, s);
    const lista = [terreno(f, { glsl, uniformes })];
    catalogo.forEach((r, i) => {
      const p = cima(r, g), activa = enfocada === r.id || fijada === r.id;
      lista.push(punto(p, { radio: activa ? 8 : 5, color: activa ? [255, 255, 255] : [244, 211, 69], alfa: s }));
      lista.push(rotulo(p, `\\text{${r.titulo}}`, { clave: `r${r.id}`, dy: -24, tam: activa ? 21 : 18, color: activa ? [255, 255, 255] : [232, 228, 216], alfa: s }));
    });
    return lista;
  }

  const pintar = () => { lienzo.aplicar(); r3.dibujar(prims(), camara); };

  function pintarPanel() {
    const id = enfocada ?? fijada, r = catalogo.find((x) => x.id === id);
    if (!r) {
      panel.replaceChildren(h('h2', { textContent: 'Tu terreno' }), h('p', { textContent: 'Cada colina es una región del curso. Crece e ilumina según lo que demuestras en los retos. Mirar no sube nada.' }), h('p', { className: 'tenue', textContent: 'Pasa por una colina para verla y haz clic para abrirla. Empieza por «El borde».' }));
      return;
    }
    const { el } = barraGrado(progreso.gradoRegion(r.id, catalogo));
    panel.replaceChildren(h('p', { className: 'tenue', textContent: `Región ${r.id}` }), h('h2', { textContent: r.titulo }), h('p', { className: 'lema', textContent: r.lema }), el, fijada === r.id ? listaConceptos(r, progreso) : h('p', { className: 'tenue', textContent: 'Haz clic para ver sus conceptos.' }));
  }

  const abrir = (id) => { fijada = id; enfocada = null; pintarPanel(); sucio = true; };
  catalogo.forEach((r) => {
    const b = h('button', { type: 'button', textContent: `${r.id}. ${r.titulo}` });
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
      giro = px; sucio = true;
      return;
    }
    const i = regionEn(px, centros(), 70), id = i >= 0 ? catalogo[i].id : null;
    zona.style.cursor = id ? 'pointer' : 'grab';
    if (id !== enfocada && !(id === null && fijada === null && enfocada === null)) { enfocada = id; pintarPanel(); sucio = true; }
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

  alCambiar = () => { pintarPanel(); sucio = true; };
  lienzo.alTamano(() => { sucio = true; });
  lienzo.animar((dt) => {
    if (t < 1.6) { t += dt; sucio = true; }
    if (sucio) { sucio = false; pintar(); }
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
