// La portada: un terreno con una colina por región, cuya altura y color cuentan cuánto dominas cada una.
import { CATALOGO } from '../contenido/catalogo.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { siguienteConcepto } from '../nucleo/recorrido.js';
import { alturaMapa, campoMapa, regionEn } from './alturaMapa.js';
import { crearTaller } from '../nucleo/taller.js';
import { barraGrado, h, tituloDifuso, tryLocal } from './concepto.js';
import { soportaGL2 } from './lienzo.js';
import { camaraMapa, crearPaisaje, proyectar } from './mapaGL.js';
import { ev, mix } from './tiempo.js';

const ESCZ = 0.46, NCAMPO = 640;
const coma = (v) => v.toFixed(2).replace('.', ',');

function listaConceptos(region, progreso) {
  const proximo = siguienteConcepto([region], progreso)?.id;
  return h('ul', { className: 'mapa-conceptos' }, region.conceptos.map((c) => {
    const g = progreso.gradoConcepto(c.id, c.retos);
    if (c.estado !== 'listo') return h('li', { className: 'pendiente' }, h('span', { textContent: c.titulo }), h('small', { textContent: 'aún no' }));
    const fila = h('li', { className: c.id === proximo ? 'proximo' : g >= 0.7 ? 'dominado' : '' }, h('a', { href: `concepto.html?c=${c.id}`, textContent: c.titulo }), h('small', { textContent: c.id === proximo ? 'te toca' : coma(g) }));
    fila.style.setProperty('--g', String(g));
    return fila;
  }));
}

function listaPlana(raiz, catalogo, progreso) {
  raiz.append(h('div', { className: 'mapa-lista' }, catalogo.map((r) => h('section', {}, h('h2', { textContent: `${r.id}. ${r.titulo}` }), h('p', { textContent: r.lema }), listaConceptos(r, progreso)))));
}

/** El péndulo siempre está a mano, con lo que lleves construido. */
function tuPendulo(almacen) {
  const t = crearTaller(almacen).leer(), piezas = [];
  if (t.anchoAngulo) piezas.push(`«inclinado» a ${String(t.anchoAngulo).replace('.', ',')}°`);
  if (t.normaY) piezas.push(`«y» ${t.normaY}`);
  if (t.fuerzaMaxima) piezas.push(`fuerza ${t.fuerzaMaxima.toFixed(1).replace('.', ',')}`);
  return h('div', { className: 'tu-pendulo' },
    h('p', { className: 'tenue', textContent: piezas.length ? `En tu taller: ${piezas.join(', ')}.` : 'Tu taller está vacío: los retos del péndulo le van añadiendo piezas.' }),
    h('a', { className: 'enlace-pendulo', href: 'concepto.html?c=6-6-pendulo#toca', textContent: 'Probar tu péndulo' }));
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
  const indice = h('nav', { className: 'mapa-indice', ariaLabel: 'Capítulos' });
  panel.append(cuerpoPanel, pie());
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Paisaje de montañas, una por cada capítulo del curso. Cuanto más dominas un capítulo, más alta y dorada es su montaña.');
  const capaRotulos = h('div', { className: 'mapa-rotulos' });
  zonaMapa.append(canvas, capaRotulos);
  pagina.prepend(zonaMapa);
  pagina.append(indice, panel);

  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pais = crearPaisaje(canvas);
  let t = reducido ? 9 : 0, enfocada = null, fijada = null, mapaSucio = true;
  const INICIO = { yaw: -0.22, pitch: 0.39 };
  let camara = { ...INICIO }, zoom = 1;
  const camaraValida = (c) => ({ yaw: Math.max(-0.95, Math.min(0.55, c.yaw)), pitch: Math.max(0.2, Math.min(1.05, c.pitch)) });

  const grados = () => catalogo.map((r) => progreso.gradoRegion(r.id, catalogo));
  const sube = () => ev(t, 0.15, 2.8);
  const cimaDe = (r, g, s = sube()) => [r.posicion[0], r.posicion[1], alturaMapa(r.posicion[0], r.posicion[1], g, catalogo, s) * ESCZ];

  /** El camino: pasa por todas las cimas, en orden, y por donde va el curso se enciende. */
  const puntosCamino = () => {
    const pts = [], pos = catalogo.map((r) => r.posicion);
    for (let i = 0; i + 1 < pos.length; i++) {
      const a = pos[Math.max(0, i - 1)], b = pos[i], c = pos[i + 1], d = pos[Math.min(pos.length - 1, i + 2)];
      for (let k = 0; k < 44; k++) {
        const u = k / 44, cr = (j) => 0.5 * (2 * b[j] + (c[j] - a[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * u * u * u);
        pts.push([cr(0), cr(1)]);
      }
    }
    pts.push(pos.at(-1));
    return pts;
  };
  pais.fijarCamino(puntosCamino(), 0.0075);
  let huellaCampo = '';
  const fijarCampo = () => { const g = grados(), k = g.join(); if (k !== huellaCampo) { huellaCampo = k; pais.fijarCampo(campoMapa(catalogo, g, NCAMPO), NCAMPO); } };
  fijarCampo();

  // --- rótulos: texto de verdad, nítido, y que se puede usar con teclado
  const rotulos = catalogo.map((r) => {
    const b = h('button', { type: 'button', className: 'mapa-rotulo' }, h('span', { className: 'rotulo-titulo', textContent: r.titulo }), h('span', { className: 'rotulo-lema', textContent: r.lema }));
    b.addEventListener('click', (ev2) => { if (ev2.detail === 0) abrir(r.id); });
    capaRotulos.append(b);
    return b;
  });

  // --- encuadre: todo el camino a la izquierda del panel; al elegir un capítulo, se acerca a su montaña
  const vistaGeneral = () => ({ objetivo: [0.5, 0.53, 0.1], dist: 1.72 * Math.max(1, 1.5 / (innerWidth / innerHeight)) * zoom, corrimiento: innerWidth > 900 ? -0.27 : 0, alzado: -0.46 });
  const vistaDe = (id) => { const r = catalogo.find((x) => x.id === id), [x, y, z] = cimaDe(r, grados(), 1); return { objetivo: [x, y, z * 0.55], dist: 1.12 * zoom, corrimiento: innerWidth > 900 ? -0.3 : 0, alzado: -0.2 }; };
  const objetivoVista = () => (fijada ? vistaDe(fijada) : vistaGeneral());
  let vista = objetivoVista(), vuelo = null, vpActual = null, ojoActual = null, huellaRotulos = '';

  const aspecto = () => (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  function calcularCamara() {
    const v = vuelo ? vuelo(t) : vista, c = camaraValida(camara);
    const { vp, ojo } = camaraMapa({ ...c, ...v, aspecto: aspecto() });
    vpActual = vp; ojoActual = ojo;
  }
  const centros = () => { const g = grados(), W = canvas.clientWidth, H = canvas.clientHeight; return catalogo.map((r) => { const [x, y] = proyectar(vpActual, cimaDe(r, g)); return [x * W, y * H]; }); };

  function colocarRotulos() {
    const cs = centros(), aparece = ev(t, 2.2, 3.2), activos = catalogo.map((r) => enfocada === r.id || fijada === r.id), clave = cs.flat().map((v) => v.toFixed(1)).join() + activos.join() + aparece.toFixed(2);
    if (clave === huellaRotulos) return;
    huellaRotulos = clave;
    rotulos.forEach((b, i) => {
      b.style.transform = `translate(${cs[i][0].toFixed(1)}px, ${cs[i][1].toFixed(1)}px) translate(-50%, -100%)`;
      b.style.opacity = String(aparece);
      b.classList.toggle('activa', activos[i]);
      b.classList.toggle('apagada', !!fijada && !activos[i]);
    });
  }

  const sig = () => siguienteConcepto(catalogo, progreso);
  function datosFaros() {
    const g = grados(), s = sig(), d = new Float32Array(catalogo.length * 6), aparece = ev(t, 1.6, 3);
    catalogo.forEach((r, i) => d.set([...cimaDe(r, g), g[i], ((enfocada === r.id || fijada === r.id) ? 1 : 0) * aparece, (s?.region.id === r.id ? 1 : 0) * aparece], i * 6));
    return d;
  }
  /** Hasta dónde se ha andado: la fracción del camino hasta la región de tu siguiente parada. */
  const hecho = () => { const s = sig(), i = s ? catalogo.findIndex((r) => r.id === s.region.id) : catalogo.length - 1; return i / (catalogo.length - 1); };

  let escala = Math.min(devicePixelRatio || 1, 1.5), pasos = 22;
  function pintar() {
    const W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
    pais.ajustar(Math.max(2, Math.round(W * escala)), Math.max(2, Math.round(H * escala)));
    calcularCamara();
    // una penumbra que se desplaza muy despacio: la luz nunca está del todo quieta
    const az = 1.1 + (reducido ? 0 : 0.05 * Math.sin(t / 26)), el = 0.06 + 0.2 * ev(t, 0, 3.2), sol = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
    const foco = enfocada ?? fijada, rf = catalogo.find((r) => r.id === foco);
    pais.dibujar({ vp: vpActual, ojo: ojoActual, sol, sube: Math.max(0.001, sube()), t, expo: ev(t, 0, 1.6) * (vuelo ? 1 - 0.8 * ev(t - t0Vuelo, 0.4, 0.9) : 1), foco: rf ? [rf.posicion[0], rf.posicion[1], 0, 1] : [0, 0, 0, 0], hecho: hecho(), aparece: ev(t, 1.2, 3.4), faros: datosFaros(), pasos });
    colocarRotulos();
  }

  /** Al continuar, la cámara cae sobre la montaña y la página se funde: no es un enlace más, es seguir andando. */
  let t0Vuelo = 0;
  function volarA(destinoC) {
    const destino = `concepto.html?c=${destinoC.id}`;
    if (reducido) { location.href = destino; return; }
    const de = { ...vista }, a = vistaDe(destinoC.region.id);
    t0Vuelo = t;
    vuelo = (tt) => { const k = ev(tt - t0Vuelo, 0, 0.9); return { objetivo: de.objetivo.map((v, i) => mix(v, a.objetivo[i], k)), dist: mix(de.dist, 0.72, k), corrimiento: mix(de.corrimiento, 0, k), alzado: mix(de.alzado, 0, k) }; };
    pagina.classList.add('fundiendo');
    setTimeout(() => { location.href = destino; }, 880);
  }

  // --- el panel: solo cambia al elegir, nunca al pasar el ratón
  let huella = '';
  /** Solo se anima el panel si cambia de verdad lo que dice. */
  function rellenar(...hijos) {
    const clave = hijos.map((x) => x?.textContent ?? '').join('|');
    if (clave !== huella) { huella = clave; cuerpoPanel.style.animation = 'none'; void cuerpoPanel.offsetWidth; cuerpoPanel.style.animation = ''; }
    cuerpoPanel.replaceChildren(...hijos);
  }
  function pintarPanel() {
    const r = catalogo.find((x) => x.id === fijada), s = sig();
    [...indice.children].forEach((b) => { const id = +b.dataset.region; b.classList.toggle('activa', id === fijada); b.style.setProperty('--g', String(progreso.gradoRegion(id, catalogo))); });
    if (!r) {
      if (!s) { rellenar(h('h2', { textContent: 'Has recorrido todo el curso' }), h('p', { textContent: 'Tus montañas brillan. Vuelve a cualquier parada cuando quieras.' }), tuPendulo(almacen)); return; }
      const ir = h('button', { type: 'button', className: 'boton-seguir', textContent: 'Continuar el camino' });
      ir.addEventListener('click', () => volarA(s));
      rellenar(h('p', { className: 'rotulo-etapa', textContent: 'Tu siguiente parada' }), h('h2', { textContent: s.titulo }), h('p', { className: 'tenue', textContent: `Capítulo ${s.region.id}: ${s.region.titulo}` }), ir,
        h('p', { className: 'tenue', textContent: 'Cada montaña es un capítulo. Crece y se vuelve dorada con lo que demuestras en los retos; mirar no la sube.' }), tuPendulo(almacen));
      return;
    }
    const { el } = barraGrado(progreso.gradoRegion(r.id, catalogo));
    const salir = h('button', { type: 'button', className: 'boton-atras', textContent: 'Ver todo el camino' });
    salir.addEventListener('click', () => abrir(null));
    rellenar(salir, h('p', { className: 'rotulo-etapa', textContent: `Capítulo ${r.id}` }), h('h2', { textContent: r.titulo }), h('p', { className: 'lema', textContent: r.lema }), el, listaConceptos(r, progreso));
  }

  /** Elegir un capítulo acerca la cámara a su montaña; soltarlo vuelve a la vista completa. */
  function abrir(id) {
    fijada = id;
    enfocada = null;
    pintarPanel();
    mapaSucio = true;
  }
  catalogo.forEach((r) => {
    const b = h('button', { type: 'button' }, h('span', { className: 'indice-num', textContent: String(r.id) }), h('span', { className: 'indice-nombre', textContent: r.titulo }));
    b.dataset.region = String(r.id);
    b.addEventListener('click', () => abrir(fijada === r.id ? null : r.id));
    indice.append(b);
  });

  // --- ratón: pasar por encima solo resalta; elegir exige un clic
  let giro = null, movido = 0;
  const zona = zonaMapa;
  const posDe = (ev2) => { const b = canvas.getBoundingClientRect(); return [ev2.clientX - b.left, ev2.clientY - b.top]; };
  zona.addEventListener('pointerdown', (ev2) => { giro = posDe(ev2); movido = 0; zona.setPointerCapture(ev2.pointerId); });
  zona.addEventListener('pointermove', (ev2) => {
    const px = posDe(ev2);
    if (giro) {
      movido += Math.hypot(px[0] - giro[0], px[1] - giro[1]);
      camara = camaraValida({ yaw: camara.yaw - (px[0] - giro[0]) * 0.0042, pitch: camara.pitch + (px[1] - giro[1]) * 0.0032 });
      giro = px;
      mapaSucio = true;
      return;
    }
    const i = regionEn(px, centros(), 62), id = i >= 0 ? catalogo[i].id : null;
    zona.style.cursor = id ? 'pointer' : 'grab';
    if (id !== enfocada) { enfocada = id; mapaSucio = true; colocarRotulos(); }
  });
  zona.addEventListener('pointerleave', () => { if (!giro && enfocada !== null) { enfocada = null; mapaSucio = true; } });
  const soltar = (ev2) => {
    if (giro && movido < 6 && ev2.type === 'pointerup') {
      const i = regionEn(posDe(ev2), centros(), 62);
      if (i >= 0) abrir(catalogo[i].id);
    }
    giro = null;
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);
  zona.addEventListener('wheel', (ev2) => { ev2.preventDefault(); zoom = Math.max(0.62, Math.min(1.25, zoom * Math.exp(ev2.deltaY * 0.0009))); mapaSucio = true; }, { passive: false });
  addEventListener('keydown', (ev2) => { if (ev2.key === 'Escape' && fijada) abrir(null); });
  addEventListener('resize', () => { mapaSucio = true; });

  alCambiar = () => { fijarCampo(); pintarPanel(); mapaSucio = true; };

  // --- el bucle: a 30 cuadros la luz se mueve; si la máquina no da para más, baja la resolución antes que la fluidez
  let ult = performance.now(), ultCuadro = 0, activo = true, lentos = 0;
  const io = new IntersectionObserver((e2) => { activo = e2[0].isIntersecting; });
  io.observe(pagina);
  const cuadro = (ms) => {
    requestAnimationFrame(cuadro);
    if (!activo || document.hidden) { ult = ms; return; }
    const dt = Math.min(0.25, (ms - ult) / 1000);
    ult = ms;
    t += dt;
    let mueve = false;
    const a = objetivoVista(), k = Math.min(1, dt * 3.4);
    vista.dist += (a.dist - vista.dist) * k; vista.corrimiento += (a.corrimiento - vista.corrimiento) * k; vista.alzado += (a.alzado - vista.alzado) * k;
    vista.objetivo = vista.objetivo.map((v, i) => { const d = a.objetivo[i] - v; if (Math.abs(d) > 2e-4) mueve = true; return v + d * k; });
    if (Math.abs(a.dist - vista.dist) > 1e-3) mueve = true;
    const animando = t < 3.4 || vuelo || mueve;
    if (reducido && !animando && !mapaSucio) return;
    if (!animando && !mapaSucio && ms - ultCuadro < 32) return;
    if (ultCuadro && !reducido) {
      const gasto = ms - ultCuadro;
      if (gasto > 48) lentos++; else lentos = Math.max(0, lentos - 1);
      if (lentos > 12) { lentos = 0; if (escala > 0.7) escala *= 0.82; else pasos = Math.max(10, pasos - 4); }
    }
    ultCuadro = ms;
    mapaSucio = false;
    pintar();
  };
  pintarPanel();
  pintar();
  requestAnimationFrame(cuadro);

  return {
    camara: () => camaraValida(camara),
    aPantalla(id) {
      const i = catalogo.findIndex((r) => r.id === id), [x, y] = centros()[i], b = canvas.getBoundingClientRect();
      return [b.left + x, b.top + y];
    },
  };
}
