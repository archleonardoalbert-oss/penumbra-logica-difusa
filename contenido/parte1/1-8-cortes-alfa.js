import { AZUL, BLANCO, GRIS2, ORO, ROSA } from '../../motor/colores.js';
import { curva, linea, mapaCalor, marco, poligono, punto, rotulo, terreno } from '../../motor/primitivas.js';
import { ev, mix } from '../../motor/tiempo.js';

const R = String.raw;
const coma = (v) => v.toFixed(2).replace('.', '{,}');
const DOSIGMA2 = 0.08;
const f = (x, y) => Math.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / DOSIGMA2);
const GLSL = 'float d=(x-.5)*(x-.5)+(y-.5)*(y-.5);return exp(-d/.08);';
const radio = (a) => Math.sqrt(-DOSIGMA2 * Math.log(a));

export default {
  id: '1-8-cortes-alfa',
  titulo: 'α-cortes',
  puente: 'Cortar es fácil. Lo sorprendente es que los cortes bastan para reconstruir todo el conjunto.',
  pregunta: '¿Se puede ver un conjunto difuso como muchos conjuntos clásicos? Córtalo a una altura y mira la silueta que queda.',
  escena: {
    id: 'cortes-alfa', formato: '3d', W: 1100, H: 690,
    render3d: { cx: 365, cy: 372, S: 335 },
    entradas: [{ id: 'alfa', tipo: 'deslizador', etiqueta: 'nivel α', min: 0.05, max: 0.98, paso: 0.01, valor: 0.5 }],
    pasos: [
      { dur: 3000, texto: 'Un conjunto difuso sobre el plano es un terreno: la altura en cada punto es su grado.' },
      { dur: 2400, texto: 'Levanta un plano horizontal hasta la altura $\\alpha$. Corta el terreno, y lo que queda por encima forma una isla.' },
      { dur: 2600, texto: 'El borde de la isla es una curva de nivel. Bájala al suelo por estas líneas.' },
      { dur: 2400, texto: 'Retiramos la mitad del terreno para verlo: en el suelo queda una región nítida, el <b style="color:#f4d345;font-weight:400">α-corte</b>, un conjunto clásico: todos los puntos con grado al menos $\\alpha$.' },
      { dur: 2200, texto: 'Mueve $\\alpha$. Cuanto más alto, más pequeño. Mira el perfil abajo a la derecha: los cortes se anidan, cada uno dentro del anterior.' },
    ],
    primitivas({ q, paso, e }) {
      const a = paso >= 1 ? mix(0.02, e.alfa, ev(q(1), 0, 0.85)) : 0.02, r = radio(a), de = ev(q(0), 0.15, 1);
      const P = [marco({ x: [0, 1], y: [0, 1], z: [0, 1] }, { alfa: ev(q(0), 0, 0.3), paredX: GRIS2, paredY: GRIS2, etiquetas: { x: 'x', y: 'y', z: R`\mu` } })];
      const abre = paso === 3 ? 0.5 * ev(q(3), 0, 0.5) : paso > 3 ? 0.5 * (1 - ev(q(4), 0, 0.5)) : 0;
      if (de > 0) P.push(terreno(f, { glsl: GLSL, desde: Math.max(1 - de, abre) }));
      const pl = ev(q(1), 0, 0.3);
      if (pl > 0) {
        for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
          const x0 = i / 10, x1 = x0 + 0.1, y0 = j / 10, y1 = y0 + 0.1;
          P.push(poligono([[x0, y0, a], [x1, y0, a], [x1, y1, a], [x0, y1, a]], { color: BLANCO, alfa: 0.13 * pl }));
        }
        P.push(rotulo([1, 0, a], R`\alpha = ${coma(a)}`, { clave: 'alfa', dx: 16, ancla: 'l', tam: 22, color: BLANCO, alfa: pl, siempre: true }));
      }
      const cn = ev(q(2), 0, 0.5);
      const circulo = (z, hasta) => curva((u) => [0.5 + r * Math.cos(u), 0.5 + r * Math.sin(u), z], [0, 6.28319], { hasta, n: 120, color: ORO, ancho: 3.2, brillo: true });
      if (cn > 0) P.push(circulo(a, cn));
      const baj = ev(q(2), 0.45, 1);
      if (baj > 0) {
        for (let k = 0; k < 8; k++) {
          const u = (k / 8) * 6.28319, x = 0.5 + r * Math.cos(u), y = 0.5 + r * Math.sin(u);
          P.push(linea([x, y, a], [x, y, mix(a, 0, baj)], { color: ORO, ancho: 1.3, alfa: 0.75 * baj }));
          P.push(punto([x, y, mix(a, 0, baj)], { color: ORO, radio: 2.5, alfa: baj }));
        }
      }
      const sue = ev(q(3), 0, 0.6);
      if (sue > 0) {
        P.push(circulo(0, 1));
        for (let k = 0; k < 40; k++) {
          const u0 = (k / 40) * 6.28319, u1 = ((k + 1) / 40) * 6.28319;
          P.push(poligono([[0.5, 0.5, 0], [0.5 + r * Math.cos(u0), 0.5 + r * Math.sin(u0), 0], [0.5 + r * Math.cos(u1), 0.5 + r * Math.sin(u1), 0]], { color: ORO, alfa: 0.35 * sue }));
        }
      }
      // mapa desde arriba y perfil: lo mismo, en plano
      const pa = ev(q(1), 0, 0.5), M = [], C = [];
      if (pa > 0) {
        M.push(mapaCalor(f, { clave: 'corte' }), marco({ x: [0, 1], y: [0, 1] }, { alfa: pa, ticks: { x: [0, 1], y: [0, 1] }, etiquetas: {} }));
        M.push(rotulo([0.5, 1], R`\text{Desde arriba}`, { clave: 'tm', dy: -18, tam: 17, color: GRIS2, alfa: pa }));
        if (cn > 0) M.push(curva((u) => [0.5 + r * Math.cos(u), 0.5 + r * Math.sin(u)], [0, 6.28319], { hasta: cn, n: 120, color: BLANCO, ancho: 2.6 }));
        const xi = 0.5 - r, xd = 0.5 + r, g = (x) => f(x, 0.5);
        C.push(marco({ x: [0, 1], y: [0, 1] }, { alfa: pa, ticks: { x: [0, 1], y: [0, 1] }, etiquetas: { x: R`x`, y: R`\mu` } }));
        C.push(curva((x) => [x, g(x)], [0, 1], { n: 140, color: AZUL, ancho: 2.6 }));
        C.push(linea([0, a], [1, a], { color: BLANCO, ancho: 1.2, alfa: 0.7 * pa }));
        C.push(rotulo([0.5, 1], R`\text{Perfil en } y = 0{,}5`, { clave: 'tc', dy: -20, tam: 17, color: GRIS2, alfa: pa }));
        if (cn > 0) {
          C.push(punto([xi, g(xi)], { color: ORO, radio: 5, alfa: cn }), punto([xd, g(xd)], { color: ORO, radio: 5, alfa: cn }));
          C.push(linea([xi, g(xi)], [xi, 0], { color: ORO, ancho: 1, alfa: 0.6 * cn, discontinua: true }), linea([xd, g(xd)], [xd, 0], { color: ORO, ancho: 1, alfa: 0.6 * cn, discontinua: true }));
          C.push(poligono([[xi, 0], [xd, 0], [xd, 0.035], [xi, 0.035]], { color: ORO, alfa: cn }));
        }
        if (paso >= 4) {
          [0.2, 0.4, 0.6, 0.8].forEach((n, i) => { const ri = radio(n); C.push(poligono([[0.5 - ri, 0.05 + i * 0.022], [0.5 + ri, 0.05 + i * 0.022], [0.5 + ri, 0.058 + i * 0.022], [0.5 - ri, 0.058 + i * 0.022]], { color: ROSA, alfa: ev(q(4), 0, 0.6) * 0.9 })); });
        }
      }
      return { principal: P, paneles: [
        { ejes: { x: [0, 1], y: [0, 1], caja: { x: 810, y: 92, w: 216, h: 216 } }, prims: M },
        { ejes: { x: [0, 1], y: [0, 1], caja: { x: 786, y: 410, w: 280, h: 210 } }, prims: C },
      ] };
    },
  },
  manipulacion: '<ul><li>Mueve «nivel α»: el plano sube y baja, y todas las vistas se recalculan a la vez.</li><li>Arrastra la vista 3D para girar la cámara: la intersección del plano con el terreno es real.</li></ul>',
  rigor: [
    { tipo: 'DEF', titulo: 'α-corte y corte fuerte', tex: R`Para $\alpha \in [0, 1]$: el $\alpha$-corte es $A_\alpha = \{x \in X : \mu_A(x) \ge \alpha\}$, y el corte fuerte $A_{\alpha^+} = \{x \in X : \mu_A(x) > \alpha\}$. Ambos son conjuntos clásicos.` },
    { tipo: 'NOTA', titulo: 'Viejos conocidos', tex: R`$A_{0^+} = \operatorname{sop}(A)$, $A_1 = \operatorname{nuc}(A)$ y $A_0 = X$. Si $A$ es clásico, $A_\alpha = A$ para todo $\alpha \in (0, 1]$.` },
    { tipo: 'PROP', titulo: 'Los cortes se anidan', tex: R`Si $\alpha \le \beta$, entonces $A_\beta \subseteq A_\alpha$ y $A_{\beta^+} \subseteq A_{\alpha^+}$.`, pasos: [
      { texto: R`Sea $x \in A_\beta$. Entonces $\mu_A(x) \ge \beta$.`, porque: 'Definición de α-corte.' },
      { texto: R`Como $\beta \ge \alpha$, resulta $\mu_A(x) \ge \alpha$, luego $x \in A_\alpha$.`, porque: 'Transitividad de $\\ge$. Para los cortes fuertes, igual con $>$.' },
    ] },
    { tipo: 'PROP', titulo: 'Los cortes conmutan con mínimo y máximo', tex: R`Con $\mu_{A \cap B} = \min(\mu_A, \mu_B)$ y $\mu_{A \cup B} = \max(\mu_A, \mu_B)$: $(A \cap B)_\alpha = A_\alpha \cap B_\alpha$ y $(A \cup B)_\alpha = A_\alpha \cup B_\alpha$.`, pasos: [
      { texto: R`$x \in (A \cap B)_\alpha \iff \min(\mu_A(x), \mu_B(x)) \ge \alpha$.`, porque: 'Definiciones de corte e intersección difusa.' },
      { texto: R`$\min(a, b) \ge \alpha \iff a \ge \alpha \text{ y } b \ge \alpha$.`, porque: 'El mínimo de dos números es $\\ge \\alpha$ exactamente cuando ambos lo son.' },
      { texto: R`Eso es $x \in A_\alpha$ y $x \in B_\alpha$. Para la unión: $\max(a, b) \ge \alpha \iff a \ge \alpha \text{ o } b \ge \alpha$.`, porque: 'El máximo es uno de los dos números, y ambos son $\\le$ que él.' },
    ] },
    { tipo: 'NOTA', titulo: 'Con infinitos conjuntos, cuidado', tex: R`Para una familia infinita $(A_i)$, con la unión definida por el supremo, solo se garantiza $\bigcup_i (A_i)_\alpha \subseteq (\bigcup_i A_i)_\alpha$, y la inclusión puede ser estricta: el supremo puede valer $\alpha$ sin que ningún $\mu_{A_i}(x)$ llegue a $\alpha$. Los cortes fuertes, en cambio, sí conmutan con esa unión.` },
  ],
  tecnicas: [
    { titulo: 'Traduce lo difuso a lo clásico', texto: 'Los cortes convierten una propiedad difusa en una familia de propiedades clásicas. Muchas demostraciones se reducen a un argumento clásico en cada nivel.' },
    { titulo: 'Desdobla mín y máx', texto: 'Las equivalencias $\\min(a, b) \\ge \\alpha \\iff (a \\ge \\alpha \\text{ y } b \\ge \\alpha)$ y su análoga con $\\max$ convierten operaciones difusas en «y» y «o» lógicos.' },
  ],
  retos: [
    { id: 'corte-triangulo', tipo: 'calcular', enunciado: R`Sea $\mu$ triangular, con pies en $0$ y $10$ y pico en $5$. ¿Cuánto mide el intervalo $A_{0{,}6}$?`, respuesta: 4, tol: 0.05,
      pistas: [R`A la izquierda, $\mu(x) = x \div 5$.`, R`Resuelve $x \div 5 = 0{,}6$: da $x = 3$; por simetría, el otro extremo es $7$.`], explicacion: R`$A_{0{,}6} = [3, 7]$, de longitud $4$.` },
    { id: 'propiedad-monotonia', tipo: 'elegir', enunciado: R`Como $0{,}3 \le 0{,}7$, ¿qué relación hay siempre entre $A_{0{,}3}$ y $A_{0{,}7}$?`, opciones: [R`$A_{0{,}3} \subseteq A_{0{,}7}$`, R`$A_{0{,}7} \subseteq A_{0{,}3}$`, 'Son disjuntos', 'Depende de la forma de $A$'], correcta: 1,
      explicacion: 'Pedir grado al menos 0,7 es más exigente: quien lo cumple, también cumple grado al menos 0,3.' },
  ],
  referencias: ['G. J. Klir, B. Yuan, <em>Fuzzy Sets and Fuzzy Logic</em>, cap. 1–2.', 'M. Navara, temario del curso <em>Fuzzy Logic</em>, CTU Praga: cortes, propiedades «cutworthy».'],
};
