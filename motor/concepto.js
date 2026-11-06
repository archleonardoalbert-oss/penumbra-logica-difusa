// Una parada del camino: se recorre por etapas, una cada vez, con un solo botón que dice qué viene ahora.
// Lo que ya has recorrido se ve nítido; lo que falta, borroso.
import { CATALOGO, buscarConcepto } from '../contenido/catalogo.js';
import { GLOSARIO } from '../contenido/glosario.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { enlazarTerminos } from '../nucleo/recorrido.js';
import { notaCalculo, notaDemostracion, notaEleccion, notaManipular } from '../nucleo/retos.js';
import { montarEscena } from './escena.js';
import { escalaGrado, rgb } from './colores.js';
import { reproducirEntrada } from './valiente.js';

export const h = (tag, props = {}, ...hijos) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k in el) el[k] = v; else el.setAttribute(k, v);
  }
  el.append(...hijos.flat().filter((x) => x != null && x !== false));
  return el;
};
const prosa = (texto) => enlazarTerminos(texto ?? '', GLOSARIO);
const html = (tag, texto, clase) => h(tag, { innerHTML: prosa(texto), className: clase });
const OPCIONES_TEX = { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false };
const pintarTex = (el) => window.renderMathInElement?.(el, OPCIONES_TEX);
const coma = (v, d = 2) => v.toFixed(d).replace('.', ',');
const texto = (tex, display = false) => (window.katex ? window.katex.renderToString(tex, { displayMode: display, throwOnError: false }) : tex);

/** Título cuyas últimas letras pierden el borde. `--b` en el elemento regula cuánto: se aclara al avanzar. */
export function tituloDifuso(t, tag = 'h1') {
  const el = h(tag, { className: 'difuso', ariaLabel: t });
  const n = t.length;
  [...t].forEach((c, i) => {
    const s = h('span', { textContent: c === ' ' ? ' ' : c, ariaHidden: 'true' });
    s.style.setProperty('--d', Math.max(0, (i - n * 0.55) / (n * 0.45)).toFixed(3));
    el.append(s);
  });
  return el;
}

export function barraGrado(valor) {
  const barra = h('div', { className: 'grado', role: 'img' });
  const relleno = h('i'), num = h('b');
  barra.append(h('span', { textContent: 'tu grado' }), h('div', { className: 'grado-carril' }, relleno), num);
  const fijar = (v) => {
    relleno.style.width = `${v * 100}%`;
    num.textContent = coma(v);
    barra.setAttribute('aria-label', `grado de dominio ${coma(v)}`);
    barra.dataset.valor = String(v);
  };
  fijar(valor);
  return { el: barra, fijar };
}

// ---------------------------------------------------------------- glosario: toda palabra se puede preguntar
let tarjeta = null;
function instalarGlosario() {
  if (tarjeta) return;
  tarjeta = h('div', { className: 'glosario-tarjeta', role: 'dialog', hidden: true });
  document.body.append(tarjeta);
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest?.('.termino');
    if (!b) { if (!ev.target.closest?.('.glosario-tarjeta')) tarjeta.hidden = true; return; }
    const g = GLOSARIO[b.dataset.termino];
    tarjeta.replaceChildren(h('b', { textContent: g.titulo }), h('p', { innerHTML: g.texto }), h('p', { className: 'ejemplo-glosario', innerHTML: `Por ejemplo: ${g.ejemplo}` }));
    pintarTex(tarjeta);
    tarjeta.hidden = false;
    const r = b.getBoundingClientRect(), w = Math.min(360, innerWidth - 24);
    tarjeta.style.width = `${w}px`;
    tarjeta.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left + scrollX))}px`;
    tarjeta.style.top = `${r.bottom + scrollY + 8}px`;
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') tarjeta.hidden = true; });
}

// ---------------------------------------------------------------- entenderlo, poco a poco
const pasoDemo = (p) => h('li', {}, html('div', p.texto, 'texto'), p.porque ? html('div', p.porque, 'porque') : null);

/** Convierte los bloques en una secuencia de apariciones: cada «Seguir» añade solo una cosa nueva. */
function secuencia(c) {
  const s = [];
  const bloques = c.entender ?? c.rigor.map((b) => ({ tipo: b.pasos ? 'demo' : b.tipo === 'NOTA' ? 'nota' : b.tipo === 'EJ' ? 'ejemplo' : 'formal', titulo: b.titulo, tex: b.tex, texto: b.tex, pasos: b.pasos, valiente: b.valiente, cartelas: b.cartelas }));
  for (const b of bloques) {
    if (b.tipo === 'idea') s.push(() => html('p', b.texto, 'idea'));
    else if (b.tipo === 'ejemplo') {
      s.push(() => h('div', { className: 'ejemplo' }, h('p', { className: 'rotulo-etapa', textContent: 'Con números' }), html('p', b.texto),
        b.tabla ? h('table', { className: 'tabla-ejemplo' }, h('tbody', {}, b.tabla.map((fila) => h('tr', {}, fila.map((v, i) => h(i ? 'td' : 'th', { innerHTML: prosa(v) })))))) : null,
        b.cierre ? html('p', b.cierre, 'cierre') : null));
    } else if (b.tipo === 'simbolos') {
      let lista;
      s.push(() => {
        lista = h('dl', { className: 'lectura' });
        return h('div', { className: 'simbolos' }, h('p', { className: 'rotulo-etapa', textContent: 'Pieza a pieza' }), b.intro ? html('p', b.intro) : null, lista);
      });
      b.piezas.forEach((p, i) => {
        const fila = () => h('div', { className: 'pieza' }, h('dt', { innerHTML: texto(p.tex) }), h('dd', { innerHTML: prosa(p.dice) }));
        if (i === 0) { const prev = s.pop(); s.push(() => { const r = prev(); lista.append(fila()); return r; }); } else s.push(() => { const f = fila(); lista.append(f); return f; });
      });
      if (b.todo) s.push(() => h('div', { className: 'todo-junto' }, h('p', { className: 'rotulo-etapa', textContent: 'Todo junto' }), h('div', { className: 'formula-grande', innerHTML: texto(b.todo, true) }), b.lee ? html('p', b.lee) : null));
    } else if (b.tipo === 'formal') {
      s.push(() => h('div', { className: 'formal' }, h('p', { className: 'rotulo-etapa', textContent: b.titulo ? `Ahora sí, con todo el rigor · ${b.titulo}` : 'Ahora sí, con todo el rigor' }), html('div', b.tex, 'formal-tex'), b.lee ? html('p', b.lee, 'cierre') : null));
    } else if (b.tipo === 'nota') {
      s.push(() => h('aside', { className: 'nota' }, b.titulo ? h('b', { textContent: b.titulo }) : null, html('p', b.texto)));
    } else if (b.tipo === 'demo') {
      if (b.plan) s.push(() => h('div', { className: 'demo-plan' }, h('p', { className: 'rotulo-etapa', textContent: b.valiente ? 'Un reto mayor' : 'Vamos a demostrarlo' }), h('b', { textContent: b.titulo ?? '' }), html('p', b.plan), b.tex ? html('p', b.tex) : null));
      else s.push(() => h('div', { className: 'demo-plan' }, h('p', { className: 'rotulo-etapa', textContent: 'Vamos a demostrarlo' }), h('b', { textContent: b.titulo ?? '' }), b.tex ? html('p', b.tex) : null));
      if (b.valiente) {
        s.push(() => {
          const cuerpo = h('ol', { className: 'razonamiento', hidden: true }, b.pasos.map(pasoDemo));
          const boton = h('button', { type: 'button', className: 'boton-valiente', textContent: '⚔ Demostración solo para valientes' });
          boton.addEventListener('click', () => reproducirEntrada({ titulo: b.titulo ?? c.titulo, cartelas: b.cartelas, alTerminar: () => { cuerpo.hidden = false; pintarTex(cuerpo); cuerpo.scrollIntoView({ block: 'start' }); } }));
          return h('div', {}, boton, cuerpo);
        });
      } else b.pasos.forEach((p, i) => s.push(() => h('ol', { className: 'razonamiento', start: i + 1 }, pasoDemo(p))));
    }
  }
  if (c.tecnicas?.length) s.push(() => h('div', { className: 'te-llevas' }, h('p', { className: 'rotulo-etapa', textContent: 'Lo que te llevas' }), h('ul', { className: 'tecnicas' }, c.tecnicas.map((x) => h('li', {}, h('b', { innerHTML: x.titulo }), html('span', x.texto))))));
  if (c.referencias?.length) s.push(() => h('details', { className: 'de-donde' }, h('summary', { textContent: 'De dónde sale esto' }), h('ul', { className: 'referencias' }, c.referencias.map((r) => h('li', { innerHTML: r })))));
  return s;
}

// ---------------------------------------------------------------- retos
function zonaPistas(pistas) {
  let usadas = 0;
  const lista = h('ol', { className: 'pistas' }), boton = h('button', { type: 'button', className: 'boton-pista' });
  const pintar = () => { boton.hidden = usadas >= pistas.length; boton.textContent = `Pedir una pista (${usadas + 1} de ${pistas.length})`; };
  boton.addEventListener('click', () => { const li = html('li', pistas[usadas]); lista.append(li); pintarTex(li); usadas++; pintar(); });
  pintar();
  return { el: h('div', {}, lista, pistas.length ? boton : null), usadas: () => usadas };
}

function tarjetaReto(reto, { registrar, notaInicial, escena, escenaDisponible }) {
  const marca = h('span', { className: 'reto-nota' });
  let mejor = notaInicial;
  const fijarNota = () => { marca.textContent = mejor > 0 ? `mejor nota ${coma(mejor)}` : ''; };
  fijarNota();
  const salida = h('p', { className: 'reto-salida', ariaLive: 'polite' });
  const responder = (nota, t) => { registrar(reto.id, nota); salida.innerHTML = prosa(t); pintarTex(salida); salida.dataset.nota = String(nota); mejor = Math.max(mejor, nota); fijarNota(); };
  const pistas = zonaPistas(reto.pistas ?? []);
  const caja = h('section', { className: `reto reto-${reto.tipo}`, id: `reto-${reto.id}` },
    h('header', {}, h('span', { className: 'reto-tipo', textContent: { calcular: 'Calcula', manipular: 'Manipula', elegir: 'Elige', contraejemplo: 'Encuentra el contraejemplo', demostrar: 'Demuestra' }[reto.tipo] }), marca),
    html('div', reto.enunciado, 'reto-enunciado'));
  const acciones = h('div', { className: 'reto-acciones' });
  caja.append(acciones, pistas.el, salida);

  if (reto.tipo === 'calcular') {
    const entrada = h('input', { type: 'text', inputMode: 'decimal', placeholder: 'tu respuesta', autocomplete: 'off' });
    const b = h('button', { type: 'button', textContent: 'Comprobar' });
    const hacer = () => {
      const v = parseFloat(entrada.value.replace(',', '.'));
      if (Number.isNaN(v)) { salida.textContent = 'Escribe un número, por ejemplo 0,35.'; return; }
      const nota = notaCalculo(v, reto.respuesta, reto.tol, pistas.usadas());
      responder(nota, Math.abs(v - reto.respuesta) <= reto.tol ? `Correcto. ${reto.explicacion ?? ''}` : `Aún no: te da una precisión de ${coma(nota)}. Revísalo o pide una pista.`);
    };
    b.addEventListener('click', hacer);
    entrada.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') hacer(); });
    acciones.append(entrada, b);
  } else if (reto.tipo === 'elegir' || reto.tipo === 'contraejemplo') {
    let intentos = 0, hecho = false;
    reto.opciones.forEach((op, i) => {
      const b = html('button', op);
      b.type = 'button'; b.className = 'opcion';
      b.addEventListener('click', () => {
        if (hecho) return;
        intentos++;
        if (i === reto.correcta) { hecho = true; b.classList.add('bien'); responder(notaEleccion(true, intentos), `Correcto. ${reto.explicacion ?? ''}`); }
        else { b.classList.add('mal'); b.disabled = true; salida.innerHTML = prosa(reto.porQueNo?.[i] ?? 'Esa no. Piénsalo otra vez.'); pintarTex(salida); }
      });
      acciones.append(b);
    });
  } else if (reto.tipo === 'manipular') {
    if (!escenaDisponible) acciones.append(h('p', { textContent: 'Este reto necesita la escena, y tu navegador no puede dibujarla.' }));
    else {
      const b = h('button', { type: 'button', textContent: 'Comprobar en la escena' });
      b.addEventListener('click', () => {
        const pr = reto.precision(escena.estado().e), nota = notaManipular(pr, pistas.usadas());
        responder(nota, pr >= 1 ? `Conseguido. ${reto.explicacion ?? ''}` : (reto.pendiente?.(escena.estado().e) ?? `Vas por ${coma(pr)}. Sigue moviendo.`));
      });
      acciones.append(b);
    }
  } else if (reto.tipo === 'demostrar') {
    const sol = h('ol', { className: 'razonamiento solucion', hidden: true }, reto.solucion.map(pasoDemo));
    const ver = h('button', { type: 'button', textContent: 'Ver la solución modelo' });
    const auto = h('div', { className: 'autoevaluacion', hidden: true }, h('span', { textContent: 'Con la mano en el corazón, tu demostración…' }));
    for (const [n, t] of [[1, 'era completa y correcta'], [0.5, 'tenía la idea, con huecos'], [0, 'no llegó']]) {
      const b = h('button', { type: 'button', textContent: t });
      b.addEventListener('click', () => responder(notaDemostracion(n, pistas.usadas()), 'Anotado. Lo que cuenta es lo que te llevas de ella.'));
      auto.append(b);
    }
    ver.addEventListener('click', () => { sol.hidden = false; auto.hidden = false; ver.hidden = true; pintarTex(sol); });
    acciones.append(ver);
    caja.append(sol, auto);
  }
  return caja;
}

// ---------------------------------------------------------------- la ruta de la región
function rutaRegion(region, ficha, progreso) {
  const ol = h('ol', { className: 'ruta' });
  region.conceptos.forEach((x) => {
    const g = progreso.gradoConcepto(x.id, x.retos), actual = x.id === ficha.id;
    const punto = h(x.estado === 'listo' && !actual ? 'a' : 'span', { className: `estacion${actual ? ' actual' : ''}`, href: x.estado === 'listo' && !actual ? `concepto.html?c=${x.id}` : null, title: `${x.titulo} · grado ${coma(g)}`, ariaLabel: x.titulo });
    punto.style.setProperty('--color', rgb(g > 0 ? escalaGrado(g) : [58, 62, 84]));
    ol.append(h('li', {}, punto));
  });
  return h('nav', { className: 'ruta-region', ariaLabel: `Paradas de ${region.titulo}` }, h('a', { href: 'index.html', className: 'volver-mapa', textContent: '⌂ Mapa' }), h('span', { className: 'ruta-nombre', textContent: `${region.id}. ${region.titulo}` }), ol);
}

// ---------------------------------------------------------------- página
const ETAPAS = [
  { id: 'pregunta', nombre: 'La pregunta', seguir: 'Vamos a verlo' },
  { id: 'mira', nombre: 'Míralo', seguir: 'Ahora tócalo tú' },
  { id: 'toca', nombre: 'Tócalo', seguir: 'Entendamos lo que ha pasado' },
  { id: 'entiende', nombre: 'Entiéndelo', seguir: 'Demuestra que lo tienes' },
  { id: 'demuestra', nombre: 'Demuéstralo', seguir: 'Terminar esta parada' },
  { id: 'llegada', nombre: 'Lo siguiente' },
];

function mensajeAmable(raiz, titulo, t) {
  raiz.replaceChildren(h('main', { className: 'pagina mensaje' }, tituloDifuso(titulo), h('p', { innerHTML: t }), h('a', { href: 'index.html', className: 'boton-mapa', textContent: 'Volver al mapa' })));
}

export async function montarConcepto(raiz, id, { catalogo = CATALOGO, almacen } = {}) {
  instalarGlosario();
  const hallado = id ? buscarConcepto(id, catalogo) : null;
  if (!hallado) return mensajeAmable(raiz, 'Aquí no hay nada', 'No encuentro ese concepto. Quizá el enlace está mal; en el mapa están todos.');
  const { region, concepto: ficha, siguiente } = hallado;
  if (ficha.estado !== 'listo') return mensajeAmable(raiz, ficha.titulo, `Este concepto de la región «${region.titulo}» aún no está escrito. La región 1 ya se puede recorrer entera.`);
  const c = (await ficha.carga()).default;
  document.title = `${c.titulo} · Penumbra`;

  const progreso = crearProgreso(almacen === undefined ? tryLocal() : almacen);
  const grado = barraGrado(progreso.gradoConcepto(c.id, c.retos));
  const titulo = tituloDifuso(c.titulo);
  const textos = h('div', { className: 'pasos-lista' }), controles = h('div', { className: 'escena-controles' }), zonaEscena = h('div', { className: 'escena-lienzo' });
  const bloqueEscena = h('div', { className: 'bloque-escena' }, zonaEscena, textos, controles);

  bloqueEscena.style.setProperty('--ratio', String(c.escena.W / c.escena.H));
  const raiel = h('ol', { className: 'etapas' });
  const secciones = {};
  const huecoMira = h('div', {}), huecoToca = h('div', { className: 'toca-escena' }), huecoRetos = h('div', { className: 'retos-escena' });
  secciones.pregunta = h('section', { id: 'pregunta' }, html('p', c.pregunta, 'pregunta'));
  secciones.mira = h('section', { id: 'animacion' }, huecoMira);
  secciones.toca = h('section', { id: 'manipulacion', className: 'toca' }, huecoToca, h('div', {}, h('h2', { textContent: 'Ahora, tú' }), html('div', c.manipulacion, 'manipulacion')));
  const lectura = h('div', { className: 'lectura-guiada' });
  secciones.entiende = h('section', { id: 'rigor' }, lectura);
  secciones.demuestra = h('section', { id: 'retos', className: 'zona-retos' }, huecoRetos, h('div', { id: 'lista-retos' }));
  const proxima = siguiente?.estado === 'listo' ? siguiente : null;
  const notaLlegada = h('p', { className: 'tenue' });
  secciones.llegada = h('section', { id: 'llegada', className: 'llegada' },
    h('p', { className: 'rotulo-etapa', textContent: 'Parada terminada' }), html('p', c.puente, 'puente'), notaLlegada,
    proxima ? h('a', { className: 'boton-seguir', href: `concepto.html?c=${proxima.id}`, textContent: `Siguiente parada: ${proxima.titulo} →` }) : h('a', { className: 'boton-seguir', href: 'index.html', textContent: 'Volver al mapa →' }));

  const seguir = h('button', { type: 'button', className: 'boton-seguir' }), atras = h('button', { type: 'button', className: 'boton-atras', textContent: '← Volver' });
  const pie = h('div', { className: 'pie-etapa' }, atras, seguir);
  raiz.replaceChildren(h('main', { className: 'pagina concepto' }, rutaRegion(region, ficha, progreso),
    h('header', { className: 'concepto-cabecera' }, titulo, grado.el), raiel, ...Object.values(secciones), pie));

  const escena = montarEscena(zonaEscena, c.escena, { textos, controles, alCambiar: () => refrescarPie() });
  const escenaDisponible = c.escena.formato === 'plano' || !!escena.lienzo.gl;
  raiz.querySelector('#lista-retos').append(...c.retos.map((reto) => tarjetaReto(reto, {
    registrar: (r, nota) => { progreso.registrar(c.id, r, nota); grado.fijar(progreso.gradoConcepto(c.id, c.retos)); },
    notaInicial: progreso.notaReto(c.id, reto.id), escena, escenaDisponible,
  })));
  const conManipular = c.retos.some((r) => r.tipo === 'manipular');

  const apariciones = secuencia(c);
  let mostrados = 0;
  const mostrarSiguiente = () => {
    const el = apariciones[mostrados++]();
    if (!el.isConnected) { if (!lectura.contains(el)) lectura.append(el); }
    pintarTex(lectura);
    el.classList?.add('recien');
    el.scrollIntoView?.({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  let etapa = 0;
  ETAPAS.forEach((e, i) => {
    const b = h('button', { type: 'button', textContent: e.nombre });
    b.addEventListener('click', () => irA(i));
    raiel.append(h('li', {}, b));
  });

  function refrescarPie() {
    const e = ETAPAS[etapa];
    let t = e.seguir;
    const estadoEscena = escena.estado();
    if (e.id === 'mira' && escenaDisponible && estadoEscena.paso < c.escena.pasos.length - 1) t = 'Siguiente paso';
    if (e.id === 'entiende' && mostrados < apariciones.length) t = `Seguir leyendo · ${mostrados} de ${apariciones.length}`;
    seguir.textContent = `${t} →`;
    seguir.hidden = !e.seguir;
    atras.hidden = etapa === 0;
  }

  function irA(i) {
    etapa = Math.max(0, Math.min(ETAPAS.length - 1, i));
    const e = ETAPAS[etapa];
    for (const [k, s] of Object.entries(secciones)) s.hidden = k !== e.id;
    [...raiel.children].forEach((li, k) => { li.className = k < etapa ? 'pasada' : k === etapa ? 'actual' : 'futura'; li.firstChild.setAttribute('aria-current', k === etapa ? 'step' : 'false'); });
    titulo.style.setProperty('--b', String(1 - etapa / (ETAPAS.length - 1)));
    raiz.querySelector('main').dataset.etapa = e.id;
    if (e.id === 'mira') huecoMira.append(bloqueEscena);
    if (e.id === 'toca') { huecoToca.append(bloqueEscena); escena.irA(c.escena.pasos.length - 1); }
    if (e.id === 'demuestra' && conManipular) huecoRetos.append(bloqueEscena);
    if (e.id === 'entiende' && mostrados === 0) mostrarSiguiente();
    if (e.id === 'llegada') notaLlegada.textContent = `Tu grado aquí: ${coma(progreso.gradoConcepto(c.id, c.retos))}. ${progreso.gradoConcepto(c.id, c.retos) < 0.7 ? 'Puedes seguir, y volver a los retos cuando quieras: nada se bloquea.' : 'Lo tienes.'}`;
    history.replaceState(null, '', `${location.pathname}${location.search}#${e.id}`);
    refrescarPie();
    scrollTo?.({ top: 0 });
  }

  seguir.addEventListener('click', () => {
    const e = ETAPAS[etapa];
    if (e.id === 'mira' && escenaDisponible && escena.estado().paso < c.escena.pasos.length - 1) { escena.avanzar(); refrescarPie(); return; }
    if (e.id === 'entiende' && mostrados < apariciones.length) { mostrarSiguiente(); refrescarPie(); return; }
    irA(etapa + 1);
  });
  atras.addEventListener('click', () => irA(etapa - 1));

  const pedido = location.hash.slice(1), iPedido = ETAPAS.findIndex((e) => e.id === pedido);
  irA(iPedido >= 0 ? iPedido : new URLSearchParams(location.search).has('paso') ? 1 : 0);
  pintarTex(raiz);
  return { escena, progreso, irA, leerTodo: () => { while (mostrados < apariciones.length) mostrarSiguiente(); pintarTex(lectura); refrescarPie(); } };
}

export function tryLocal() {
  try { return window.localStorage; } catch { return { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } }; }
}
