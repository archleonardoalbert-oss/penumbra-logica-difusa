import { AZUL, BLANCO, GRIS2, ORO, ROJO, ROSA } from '../../motor/colores.js';
import { curva, linea, marco, poligono, punto, rotulo } from '../../motor/primitivas.js';
import { ev } from '../../motor/tiempo.js';

const R = String.raw;
const coma = (v, d = 1) => v.toFixed(d).replace('.', '{,}');
const ordenados = (e) => [e.a[0], e.b[0], e.c[0], e.d[0]].sort((x, y) => x - y);
const forma = (e) => {
  const [a, b, c, d] = ordenados(e), h = e.altura;
  return (x) => {
    if (x <= a || x >= d) return 0;
    if (x >= b && x <= c) return h;
    return h * (x < b ? (x - a) / Math.max(b - a, 1e-6) : (d - x) / Math.max(d - c, 1e-6));
  };
};
const fuera = 0.08;

export default {
  id: '1-6-anatomia',
  titulo: 'Soporte, núcleo y altura',
  pregunta: 'Si un conjunto no tiene borde, ¿dónde empieza y dónde acaba? ¿Quién está seguro dentro? ¿Y si nadie pertenece del todo?',
  escena: {
    id: 'anatomia', formato: 'plano', W: 1100, H: 560,
    ejes: { x: [0, 10], y: [0, 1], caja: { x: 110, y: 80, w: 860, h: 380 } },
    entradas: [
      { id: 'a', tipo: 'arrastre', eje: 'x', valor: [1, 0], region: { x: [0, 10], y: [0, 1] } },
      { id: 'b', tipo: 'arrastre', eje: 'x', valor: [3, 0], region: { x: [0, 10], y: [0, 1] } },
      { id: 'c', tipo: 'arrastre', eje: 'x', valor: [5, 0], region: { x: [0, 10], y: [0, 1] } },
      { id: 'd', tipo: 'arrastre', eje: 'x', valor: [9, 0], region: { x: [0, 10], y: [0, 1] } },
      { id: 'altura', tipo: 'deslizador', etiqueta: 'altura', min: 0.2, max: 1, paso: 0.01, valor: 1 },
    ],
    pasos: [
      { dur: 1800, texto: 'Este es un conjunto difuso con forma de trapecio. Vamos a sacarle sus piezas, una a una.' },
      { dur: 2200, texto: 'El <b style="color:#58c4dd;font-weight:400">soporte</b> son los puntos con grado mayor que 0: los que pertenecen aunque sea un poco.' },
      { dur: 2200, texto: 'El <b style="color:#f4d345;font-weight:400">núcleo</b> son los puntos con grado exactamente 1: los que pertenecen del todo.' },
      { dur: 2200, texto: 'La <b style="color:#fc6282;font-weight:400">altura</b> es el mayor grado alcanzado. Si vale 1, el conjunto es <em>normal</em>. Baja el deslizador «altura» y verás que el núcleo desaparece.' },
      { dur: 1800, texto: 'Los <em>puntos de cruce</em> tienen grado $0{,}5$: justo donde es igual de cierto que pertenecen y que no.' },
    ],
    primitivas({ q, e }) {
      const f = forma(e), [a, b, c, d] = ordenados(e), h = e.altura;
      const N = [marco({ x: [0, 10], y: [0, 1] }, { alfa: ev(q(0), 0, 0.3), ticks: { x: [0, 2, 4, 6, 8, 10], y: [0, 1] }, etiquetas: { y: R`\mu`, x: 'x' }, colorY: ORO })];
      const t = ev(q(0), 0.1, 1);
      if (t > 0) N.push(curva((x) => [x, f(x)], [0, 10], { hasta: t, n: 400, color: BLANCO, ancho: 3, brillo: true }));
      for (const [k, v] of Object.entries({ a: e.a, b: e.b, c: e.c, d: e.d })) N.push(punto([v[0], 0], { color: GRIS2, radio: 6, alfa: ev(q(0), 0.6, 1), halo: 0 }), rotulo([v[0], 0], k, { clave: `h${k}`, dy: 30, tam: 15, color: GRIS2, alfa: ev(q(0), 0.6, 1) }));
      const s = ev(q(1), 0, 0.8);
      if (s > 0) {
        N.push(poligono([[a, 0], [a + (d - a) * s, 0], [a + (d - a) * s, -fuera], [a, -fuera]], { color: AZUL, alfa: 0.75 }));
        N.push(linea([a, 0], [a, 1], { color: AZUL, ancho: 1.2, alfa: 0.5 * s, discontinua: true }), linea([d, 0], [d, 1], { color: AZUL, ancho: 1.2, alfa: 0.5 * s, discontinua: true }));
        N.push(rotulo([(a + d) / 2, -fuera], R`\text{soporte} = (${coma(a)},\ ${coma(d)})`, { clave: 'sop', dy: 18, tam: 19, color: AZUL, alfa: s }));
      }
      const n = ev(q(2), 0, 0.8), hayNucleo = h >= 1 - 1e-9;
      if (n > 0) {
        if (hayNucleo) {
          N.push(poligono([[b, 1], [b + (c - b) * n, 1], [b + (c - b) * n, 1.03], [b, 1.03]], { color: ORO }));
          N.push(linea([b, 1], [b, 0], { color: ORO, ancho: 1.2, alfa: 0.5 * n, discontinua: true }), linea([c, 1], [c, 0], { color: ORO, ancho: 1.2, alfa: 0.5 * n, discontinua: true }));
          N.push(rotulo([(b + c) / 2, 1.03], R`\text{núcleo} = [${coma(b)},\ ${coma(c)}]`, { clave: 'nuc', dy: -18, tam: 19, color: ORO, alfa: n }));
        } else N.push(rotulo([(b + c) / 2, h], R`\text{núcleo vacío: nadie llega a 1}`, { clave: 'nuc', dy: -28, tam: 19, color: ROJO, alfa: n }));
      }
      const al = ev(q(3), 0, 0.7);
      if (al > 0) {
        N.push(linea([0, h], [b, h], { color: ROSA, ancho: 1.6, alfa: 0.85 * al, discontinua: true }), punto([b, h], { color: ROSA, radio: 5, alfa: al }));
        N.push(rotulo([0, h], R`h = ${coma(h, 2)}`, { clave: 'alt', dx: 62, dy: -16, tam: 20, color: ROSA, alfa: al }));
      }
      const cr = ev(q(4), 0, 0.7);
      if (cr > 0 && h >= 0.5) {
        const x1 = a + (b - a) * (0.5 / h), x2 = d - (d - c) * (0.5 / h);
        N.push(punto([x1, 0.5], { color: BLANCO, radio: 6, alfa: cr }), punto([x2, 0.5], { color: BLANCO, radio: 6, alfa: cr }));
        N.push(linea([x1, 0.5], [x2, 0.5], { color: BLANCO, ancho: 1, alfa: 0.4 * cr, discontinua: true }));
      }
      return N;
    },
  },
  manipulacion: '<ul><li>Arrastra por el eje los puntos <em>a, b, c, d</em> para moldear el trapecio: las piezas se recalculan solas.</li><li>Baja la «altura» por debajo de 1: el conjunto deja de ser normal.</li></ul>',
  rigor: [
    { tipo: 'DEF', titulo: 'Soporte y núcleo', tex: R`$\operatorname{sop}(A) = \{x \in X : \mu_A(x) > 0\}$ y $\operatorname{nuc}(A) = \{x \in X : \mu_A(x) = 1\}$. Son conjuntos <em>clásicos</em>: de un difuso extraemos información nítida.` },
    { tipo: 'DEF', titulo: 'Altura y normalidad', tex: R`$h(A) = \sup_{x \in X} \mu_A(x)$. El conjunto $A$ es <em>normal</em> si existe $x$ con $\mu_A(x) = 1$, y <em>subnormal</em> en otro caso.` },
    { tipo: 'PROP', titulo: 'El núcleo está en el soporte', tex: R`Siempre $\operatorname{nuc}(A) \subseteq \operatorname{sop}(A)$.`, pasos: [
      { texto: R`Sea $x \in \operatorname{nuc}(A)$. Entonces $\mu_A(x) = 1$.`, porque: 'Definición de núcleo.' },
      { texto: R`Como $1 > 0$, se tiene $\mu_A(x) > 0$, es decir, $x \in \operatorname{sop}(A)$.`, porque: 'Definición de soporte.' },
    ] },
    { tipo: 'NOTA', titulo: 'Normal no es lo mismo que altura 1', tex: R`Si $A$ es normal, $h(A) = 1$. Lo contrario falla: con $X = (0, 1)$ y $\mu_A(x) = x$, el supremo es $1$ pero ningún punto lo alcanza. Por eso la definición de normal exige un punto, y por eso aquí se escribe $\sup$ y no $\max$. En un universo finito, sí son equivalentes.` },
    { tipo: 'DEF', titulo: 'Puntos de cruce', tex: R`Son los $x$ con $\mu_A(x) = 0{,}5$. Un conjunto clásico no tiene ninguno.` },
  ],
  tecnicas: [
    { titulo: 'Supremo frente a máximo', texto: 'Antes de escribir «el máximo», pregúntate si se alcanza. Un contraejemplo en un intervalo abierto suele resolver la duda.' },
    { titulo: 'Busca el contraejemplo en un intervalo abierto', texto: 'Para refutar el recíproco de algo que involucra un supremo, prueba con una función creciente en un intervalo abierto.' },
  ],
  retos: [
    { id: 'moldear-trapecio', tipo: 'manipular', enunciado: R`Moldea el trapecio para que el soporte sea $(2, 8)$ y el núcleo $[4, 6]$, con error menor que $0{,}25$.`,
      precision: (e) => { const [a, b, c, d] = ordenados(e); const bien = [Math.abs(a - 2), Math.abs(b - 4), Math.abs(c - 6), Math.abs(d - 8)].filter((v) => v < 0.25).length; return e.altura >= 0.999 ? bien / 4 : (bien / 4) * 0.5; },
      prueba: { a: [2, 0], b: [4, 0], c: [6, 0], d: [8, 0] }, pistas: ['El soporte lo fijan los extremos exteriores; el núcleo, los interiores.'], explicacion: 'Lo has hecho con las cuatro piezas de un trapecio: exactamente la función trapecial de la región 2.' },
    { id: 'calcular-anatomia', tipo: 'calcular', enunciado: R`Sea $X = \{1, 2, 3, 4, 5\}$ y $A = \{(1, 0),\ (2, 0{,}4),\ (3, 0{,}9),\ (4, 0{,}4),\ (5, 0)\}$. ¿Cuánto vale la altura, más el número de elementos del soporte?`,
      respuesta: 3.9, tol: 0.001, pistas: ['La altura es el mayor grado.', 'El soporte es {2, 3, 4}.'], explicacion: R`$0{,}9 + 3 = 3{,}9$. Y el núcleo está vacío: $A$ es subnormal.` },
  ],
  referencias: ['G. J. Klir, B. Yuan, <em>Fuzzy Sets and Fuzzy Logic</em>, cap. 1.', 'M. Navara, temario del curso <em>Fuzzy Logic</em>, CTU Praga.'],
};
