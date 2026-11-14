// El lienzo de una escena: capa GL abajo, Canvas 2D encima y capa de rótulos KaTeX arriba, todas con las mismas
// coordenadas lógicas W × H y a la resolución real del dispositivo.

const CUBRIR = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;';

export function soportaGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

/** En una pantalla estrecha y vertical, las partes de una escena ancha se apilan en columna: cada una se ve a su propio ancho.
 Se dibuja como siempre, fuera de la vista, y se recorta por trozos. Las columnas que se solapan en x van juntas. */
export function apilar(rects, W, H, { l = 64, r = 24, t = 56, b = 50 } = {}) {
  // se juntan las que comparten columna, mirando las cajas tal cual; los márgenes se añaden después
  let cs = rects.map((c) => ({ x: c.x, y: c.y, x2: c.x + c.w, y2: c.y + c.h }));
  for (let cambio = true; cambio;) { cambio = false; for (let i = 0; i < cs.length && !cambio; i++) for (let j = i + 1; j < cs.length && !cambio; j++) { const a = cs[i], e = cs[j]; if (Math.min(a.x2, e.x2) - Math.max(a.x, e.x) > 8) { cs[i] = { x: Math.min(a.x, e.x), y: Math.min(a.y, e.y), x2: Math.max(a.x2, e.x2), y2: Math.max(a.y2, e.y2) }; cs.splice(j, 1); cambio = true; } } }
  // el margen de una no puede meterse en la vecina: se vería un trozo suelto de la otra
  const crudas = cs;
  cs = crudas.map((c) => { let x = Math.max(0, c.x - l), x2 = Math.min(W, c.x2 + r); for (const o of crudas) { if (o === c) continue; if (o.x2 <= c.x) x = Math.max(x, o.x2 + 4); if (o.x >= c.x2) x2 = Math.min(x2, o.x - 4); } return { x, y: Math.max(0, c.y - t), x2, y2: Math.min(H, c.y2 + b) }; });
  cs.sort((a, e) => a.x - e.x || a.y - e.y);
  const W2 = Math.max(...cs.map((c) => c.x2 - c.x)); let y = 0;
  const trozos = cs.map((c) => { const w = c.x2 - c.x, h = c.y2 - c.y, d = { x: (W2 - w) / 2, y, w, h }; y += h + 12; return { s: { x: c.x, y: c.y, w, h }, d }; });
  return { trozos, W2, H2: y - 12 };
}

export function crearLienzo(contenedor, { W, H, gl: usarGL = false }) {
  const raiz = document.createElement('div');
  raiz.className = 'lienzo';
  raiz.style.cssText = `position:relative;width:100%;aspect-ratio:${W}/${H};overflow:hidden;touch-action:none;`;
  let glCanvas = null, gl = null;
  if (usarGL) {
    glCanvas = document.createElement('canvas');
    glCanvas.style.cssText = CUBRIR;
    gl = glCanvas.getContext('webgl2', { antialias: true, alpha: false });
    raiz.append(glCanvas);
  }
  const lienzo2d = document.createElement('canvas');
  lienzo2d.style.cssText = CUBRIR;
  const g2d = lienzo2d.getContext('2d');
  const capaTex = document.createElement('div');
  capaTex.style.cssText = CUBRIR + 'pointer-events:none;';
  const vista = document.createElement('canvas'), gv = vista.getContext('2d');
  vista.style.cssText = CUBRIR + 'display:none;';
  raiz.append(lienzo2d, vista, capaTex);
  contenedor.append(raiz);

  let k = 1, generacion = 0, fnTamano = null, fnTrozos = null, modo = null, kv = 1;
  const enModo = (x, y) => { // de coordenadas de la escena a las de la vista apilada
    let mejor = modo.trozos[0], md = Infinity;
    for (const t of modo.trozos) { const dx = Math.max(t.s.x - x, 0, x - t.s.x - t.s.w), dy = Math.max(t.s.y - y, 0, y - t.s.y - t.s.h), dd = dx + dy; if (dd < md) { md = dd; mejor = t; } }
    return [x - mejor.s.x + mejor.d.x, y - mejor.s.y + mejor.d.y];
  };
  function decidirModo() {
    const ancho = contenedor.getBoundingClientRect().width, quiere = !!fnTrozos && ancho > 0 && ancho < 620 && innerHeight > innerWidth * 1.05;
    const nuevo = quiere ? fnTrozos() : null, util = nuevo && nuevo.trozos.length > 1 && nuevo.W2 < W * 0.8 ? nuevo : null;
    if (JSON.stringify(util) === JSON.stringify(modo)) return false;
    modo = util;
    raiz.style.aspectRatio = modo ? `${modo.W2}/${modo.H2}` : `${W}/${H}`;
    for (const c of [glCanvas, lienzo2d]) if (c) c.style.display = modo ? 'none' : 'block';
    vista.style.display = modo ? 'block' : 'none';
    for (const [, e] of elementos) e.el.remove(); elementos.clear();
    return true;
  }
  const elementos = new Map();

  function aplicar() {
    const rect = raiz.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    let pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
    if (modo) { kv = pw / modo.W2; if (vista.width !== pw || vista.height !== ph) { vista.width = pw; vista.height = ph; } pw = Math.round(W * kv); ph = Math.round(H * kv); }
    for (const c of [glCanvas, lienzo2d]) if (c && (c.width !== pw || c.height !== ph)) { c.width = pw; c.height = ph; }
    k = pw / W;
    g2d.setTransform(1, 0, 0, 1, 0, 0);
    g2d.clearRect(0, 0, pw, ph);
    g2d.setTransform(k, 0, 0, k, 0, 0);
    for (const [clave, e] of elementos) if (e.gen !== generacion) { e.el.remove(); elementos.delete(clave); }
    generacion++;
  }

  /** Tras dibujar: en modo apilado, cada trozo pasa de la escena entera a su sitio en la columna. */
  function componer() {
    if (!modo) return;
    gv.setTransform(1, 0, 0, 1, 0, 0); gv.fillStyle = '#000'; gv.fillRect(0, 0, vista.width, vista.height);
    for (const { s, d } of modo.trozos) for (const c of [glCanvas, lienzo2d]) if (c) gv.drawImage(c, s.x * k, s.y * k, s.w * k, s.h * k, d.x * kv, d.y * kv, d.w * kv, d.h * kv);
  }

  /** Añade o actualiza rótulos: [{clave, x, y, tex, color, tam, ancla, alfa}] en coordenadas lógicas. */
  function rotular(lista) {
    const WV = modo ? modo.W2 : W, HV = modo ? modo.H2 : H, escalaCss = raiz.getBoundingClientRect().width / WV;
    for (const r of lista) {
      const clave = r.clave ?? r.tex;
      let e = elementos.get(clave);
      if (!e) {
        const el = document.createElement('div');
        el.dataset.clave = clave;
        el.style.cssText = 'position:absolute;white-space:nowrap;line-height:1;text-shadow:0 0 5px #000,0 0 2px #000;';
        capaTex.append(el);
        e = { el, tex: null };
        elementos.set(clave, e);
      }
      if (e.tex !== r.tex) {
        if (window.katex) window.katex.render(r.tex, e.el, { throwOnError: false });
        else e.el.textContent = r.tex;
        e.tex = r.tex;
      }
      e.gen = generacion;
      const s = e.el.style, a = r.ancla ?? 'c';
      const [px, py] = modo ? enModo(r.x, r.y) : [r.x, r.y];
      s.left = `${(px / WV) * 100}%`;
      s.top = `${(py / HV) * 100}%`;
      s.fontSize = `${(r.tam ?? 20) * escalaCss}px`;
      s.color = r.color ? `rgb(${r.color.join(',')})` : '#e8e4d8';
      s.opacity = String(r.alfa ?? 1);
      s.transform = `translate(${a === 'l' ? '0' : a === 'r' ? '-100%' : '-50%'},-50%)`;
    }
  }

  const obs = new ResizeObserver(() => { decidirModo(); fnTamano?.(); });
  obs.observe(raiz); obs.observe(contenedor);

  /** Bucle que solo corre con la escena a la vista. Devuelve la función para pararlo. */
  function animar(fn) {
    let visible = true, activo = true, ult = performance.now();
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(raiz);
    const cuadro = (ms) => {
      if (!activo) return;
      const dt = Math.min(0.05, (ms - ult) / 1000);
      ult = ms;
      if (visible) fn(dt);
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
    return () => { activo = false; io.disconnect(); };
  }

  return {
    W, H, raiz, gl, glCanvas, g2d, capaTex, aplicar, rotular, animar, componer,
    apilado: () => modo,
    /** fn() → { trozos, W2, H2 }: cómo apilar esta escena si la pantalla es estrecha. */
    definirTrozos: (fn) => { fnTrozos = fn; if (decidirModo()) fnTamano?.(); },
    escala: () => k,
    alTamano: (fn) => { fnTamano = fn; },
    pos(evento) {
      const r = raiz.getBoundingClientRect();
      if (!modo) return [((evento.clientX - r.left) * W) / r.width, ((evento.clientY - r.top) * H) / r.height];
      const x = ((evento.clientX - r.left) * modo.W2) / r.width, y = ((evento.clientY - r.top) * modo.H2) / r.height;
      let mejor = modo.trozos[0], md = Infinity;
      for (const t of modo.trozos) { const dx = Math.max(t.d.x - x, 0, x - t.d.x - t.d.w), dy = Math.max(t.d.y - y, 0, y - t.d.y - t.d.h); if (dx + dy < md) { md = dx + dy; mejor = t; } }
      return [x - mejor.d.x + mejor.s.x, y - mejor.d.y + mejor.s.y];
    },
  };
}
