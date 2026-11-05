// La página de un concepto, en sus 5 pasos: pregunta, animación, manipulación, rigor y reto.
import { CATALOGO, buscarConcepto } from '../contenido/catalogo.js';
import { crearProgreso } from '../nucleo/progreso.js';
import { notaCalculo, notaDemostracion, notaEleccion, notaManipular } from '../nucleo/retos.js';
import { montarEscena } from './escena.js';
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
const html = (tag, texto, clase) => h(tag, { innerHTML: texto, className: clase });
const OPCIONES_TEX = { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false };
const pintarTex = (el) => window.renderMathInElement?.(el, OPCIONES_TEX);
const coma = (v, d = 2) => v.toFixed(d).replace('.', ',');

/** Título cuyas últimas letras pierden el borde: lo nítido se deshace. */
export function tituloDifuso(texto, tag = 'h1') {
  const el = h(tag, { className: 'difuso', ariaLabel: texto });
  const n = texto.length;
  [...texto].forEach((c, i) => {
    const s = h('span', { textContent: c === ' ' ? ' ' : c, ariaHidden: 'true' });
    const f = Math.max(0, (i - n * 0.55) / (n * 0.45));
    s.style.setProperty('--d', f.toFixed(3));
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

// ---------------------------------------------------------------- rigor
const ETIQUETAS = { DEF: 'Definición', TEO: 'Teorema', PROP: 'Proposición', LEMA: 'Lema', DEM: 'Demostración', EJ: 'Ejemplo', NOTA: 'Observación' };

const pasosDemostracion = (pasos) => h('ol', { className: 'razonamiento' }, pasos.map((p) =>
  h('li', {}, html('div', p.texto, 'texto'), p.porque ? html('div', p.porque, 'porque') : null)));

function bloqueRigor(b, nombreConcepto) {
  const caja = h('section', { className: `bloque bloque-${b.tipo}` },
    h('p', { className: 'bloque-tipo', textContent: b.titulo ? `${ETIQUETAS[b.tipo]} · ${b.titulo}` : ETIQUETAS[b.tipo] }),
    b.tex ? html('div', b.tex, 'bloque-tex') : null);
  if (!b.pasos) return caja;
  const cuerpo = h('div', {}, pasosDemostracion(b.pasos), h('p', { className: 'qed', textContent: '∎' }));
  if (!b.valiente) { caja.append(cuerpo); return caja; }
  cuerpo.hidden = true;
  const boton = h('button', { type: 'button', className: 'boton-valiente', textContent: '⚔ Demostración solo para valientes' });
  boton.addEventListener('click', () => {
    reproducirEntrada({ titulo: b.titulo ?? nombreConcepto, cartelas: b.cartelas, alTerminar: () => { cuerpo.hidden = false; pintarTex(cuerpo); cuerpo.scrollIntoView({ block: 'start' }); } });
  });
  caja.append(boton, cuerpo);
  return caja;
}

// ---------------------------------------------------------------- retos
function zonaPistas(pistas) {
  let usadas = 0;
  const lista = h('ol', { className: 'pistas' });
  const boton = h('button', { type: 'button', className: 'boton-pista' });
  const pintar = () => {
    boton.hidden = usadas >= pistas.length;
    boton.textContent = `Pedir una pista (${usadas + 1} de ${pistas.length})`;
  };
  boton.addEventListener('click', () => {
    const li = html('li', pistas[usadas]);
    lista.append(li); pintarTex(li);
    usadas++; pintar();
  });
  pintar();
  return { el: h('div', {}, lista, pistas.length ? boton : null), usadas: () => usadas };
}

function tarjetaReto(reto, { registrar, notaInicial, escena, escenaDisponible }) {
  const marca = h('span', { className: 'reto-nota' });
  const fijarNota = (n) => { marca.textContent = n > 0 ? `mejor nota ${coma(n)}` : ''; };
  fijarNota(notaInicial);
  const salida = h('p', { className: 'reto-salida', ariaLive: 'polite' });
  const responder = (nota, texto) => {
    registrar(reto.id, nota);
    salida.innerHTML = texto; pintarTex(salida);
    salida.dataset.nota = String(nota);
    fijarNota(Math.max(nota, +(marca.dataset.mejor ?? notaInicial)));
    marca.dataset.mejor = String(Math.max(nota, +(marca.dataset.mejor ?? notaInicial)));
  };
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
      responder(nota, nota >= 0.4 && Math.abs(v - reto.respuesta) <= reto.tol ? `Correcto. ${reto.explicacion ?? ''}` : `Aún no: te da una precisión de ${coma(nota)}. Revísalo o pide una pista.`);
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
        if (i === reto.correcta) {
          hecho = true; b.classList.add('bien');
          responder(notaEleccion(true, intentos), `Correcto. ${reto.explicacion ?? ''}`);
        } else {
          b.classList.add('mal'); b.disabled = true;
          salida.innerHTML = reto.porQueNo?.[i] ?? 'Esa no. Piénsalo otra vez.'; pintarTex(salida);
        }
      });
      acciones.append(b);
    });
  } else if (reto.tipo === 'manipular') {
    if (!escenaDisponible) acciones.append(h('p', { textContent: 'Este reto necesita la escena, y tu navegador no puede dibujarla.' }));
    else {
      const b = h('button', { type: 'button', textContent: 'Comprobar en la escena' });
      b.addEventListener('click', () => {
        const precision = reto.precision(escena.estado().e);
        const nota = notaManipular(precision, pistas.usadas());
        responder(nota, precision >= 1 ? `Conseguido. ${reto.explicacion ?? ''}` : (reto.pendiente?.(escena.estado().e) ?? `Vas por ${coma(precision)}. Sigue moviendo.`));
      });
      acciones.append(b);
    }
  } else if (reto.tipo === 'demostrar') {
    const sol = h('div', { className: 'solucion' }, pasosDemostracion(reto.solucion));
    sol.hidden = true;
    const ver = h('button', { type: 'button', textContent: 'Ver la solución modelo' });
    const auto = h('div', { className: 'autoevaluacion' }, h('span', { textContent: 'Con la mano en el corazón, tu demostración…' }));
    auto.hidden = true;
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

// ---------------------------------------------------------------- página
function mensajeAmable(raiz, titulo, texto) {
  raiz.replaceChildren(h('main', { className: 'pagina mensaje' }, tituloDifuso(titulo), html('p', texto), h('a', { href: 'index.html', className: 'boton-mapa', textContent: 'Volver al mapa' })));
}

export async function montarConcepto(raiz, id, { catalogo = CATALOGO, almacen } = {}) {
  const hallado = id ? buscarConcepto(id, catalogo) : null;
  if (!hallado) return mensajeAmable(raiz, 'Aquí no hay nada', 'No encuentro ese concepto. Quizá el enlace está mal; en el mapa están todos.');
  const { region, concepto: ficha, anterior, siguiente } = hallado;
  if (ficha.estado !== 'listo') return mensajeAmable(raiz, ficha.titulo, `Este concepto de la región «${region.titulo}» aún no está escrito. La región 1 ya se puede recorrer entera.`);
  const c = (await ficha.carga()).default;
  document.title = `${c.titulo} · Penumbra`;

  const progreso = crearProgreso(almacen === undefined ? tryLocal() : almacen);
  const grado = barraGrado(progreso.gradoConcepto(c.id, c.retos));
  const textos = h('div', { className: 'pasos-lista' }), controles = h('div', { className: 'escena-controles' }), zonaEscena = h('div', { className: 'escena-lienzo' });
  const enlace = (f, rel) => (f?.estado === 'listo' ? h('a', { href: `concepto.html?c=${f.id}`, textContent: `${rel} ${f.titulo}` }) : h('span'));

  raiz.replaceChildren(h('main', { className: 'pagina concepto' },
    h('nav', { className: 'migas' }, h('a', { href: 'index.html', textContent: 'Mapa' }), ' / ', h('span', { textContent: region.titulo })),
    h('header', { className: 'concepto-cabecera' }, tituloDifuso(c.titulo), grado.el),
    h('section', { className: 'seccion-pregunta', id: 'pregunta' }, html('p', c.pregunta, 'pregunta')),
    h('div', { className: 'estudio' },
      h('div', { className: 'columna-texto' },
        h('section', { id: 'animacion' }, h('h2', { textContent: 'Míralo' }), textos),
        h('section', { id: 'manipulacion' }, h('h2', { textContent: 'Tócalo' }), html('div', c.manipulacion, 'manipulacion'))),
      h('div', { className: 'columna-escena' }, zonaEscena, controles)),
    h('section', { id: 'rigor' }, h('h2', { textContent: 'Con todo el rigor' }), c.rigor.map((b) => bloqueRigor(b, c.titulo))),
    c.tecnicas?.length ? h('section', { id: 'tecnicas' }, h('h2', { textContent: 'Lo que te llevas' }), h('ul', { className: 'tecnicas' }, c.tecnicas.map((x) => h('li', {}, h('b', { textContent: x.titulo }), html('span', x.texto))))) : null,
    h('section', { id: 'retos' }, h('h2', { textContent: 'Demuéstralo' }), h('div', { id: 'lista-retos' })),
    c.referencias?.length ? h('section', { id: 'referencias' }, h('h2', { textContent: 'De dónde sale' }), h('ul', { className: 'referencias' }, c.referencias.map((r) => html('li', r)))) : null,
    h('nav', { className: 'concepto-pie' }, enlace(anterior, '←'), enlace(siguiente, '→'))));

  const escena = montarEscena(zonaEscena, c.escena, { textos, controles });
  const escenaDisponible = c.escena.formato === 'plano' || !!escena.lienzo.gl;
  raiz.querySelector('#lista-retos').append(...c.retos.map((reto) => tarjetaReto(reto, {
    registrar: (r, nota) => { progreso.registrar(c.id, r, nota); grado.fijar(progreso.gradoConcepto(c.id, c.retos)); },
    notaInicial: progreso.notaReto(c.id, reto.id), escena, escenaDisponible,
  })));
  pintarTex(raiz);
  return { escena, progreso };
}

export function tryLocal() {
  try { return window.localStorage; } catch { return { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } }; }
}
