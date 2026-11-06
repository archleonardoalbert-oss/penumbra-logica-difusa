import { AZUL, BLANCO, GRIS2, ORO, ROSA } from '../../motor/colores.js';
import { gaussiana } from '../../nucleo/difuso.js';
import { curva, linea, marco, poligono, punto, rotulo } from '../../motor/primitivas.js';
import { ev } from '../../motor/tiempo.js';

const R = String.raw;
const coma = (v, d = 2) => v.toFixed(d).replace('.', '{,}');
const g = gaussiana(5, 1.6);
const DOM = [0, 10];
const semi = (a) => 1.6 * Math.sqrt(-2 * Math.log(a));
const esc = (x, n) => Math.floor(g(x) * n) / n;

export default {
  id: '1-9-representacion',
  titulo: 'El teorema de representación',
  pregunta: 'Los cortes son conjuntos nítidos. ¿Bastan para reconstruir el conjunto difuso entero, sin perder nada? Apila unos sobre otros y mira.',
  escena: {
    id: 'representacion', formato: 'plano', W: 1100, H: 540,
    ejes: { x: DOM, y: [0, 1], caja: { x: 110, y: 60, w: 860, h: 410 } },
    entradas: [
      { id: 'n', tipo: 'deslizador', etiqueta: 'niveles', min: 1, max: 40, paso: 1, valor: 8 },
      { id: 'x', tipo: 'arrastre', eje: 'x', valor: [3.4, 0], region: { x: DOM, y: [0, 1] } },
    ],
    pasos: [
      { dur: 1800, texto: 'Empezamos con un conjunto difuso cualquiera: la curva azul.' },
      { dur: 2200, texto: 'Tomamos un nivel $\\alpha$ y su corte $A_\\alpha$. Un conjunto nítido: lo convertimos en un bloque de altura $\\alpha$, es decir, en la función $\\alpha \\cdot \\mathbf{1}_{A_\\alpha}$.' },
      { dur: 3400, texto: 'Hacemos lo mismo en muchos niveles. Cada bloque es más alto y más estrecho que el anterior. Todos nacen de cortes nítidos.' },
      { dur: 2400, texto: 'Mira qué altura alcanzan los bloques en cada punto: su silueta dorada se pega a la curva. En cada $x$, el bloque más alto que lo cubre llega hasta casi $\\mu(x)$.' },
      { dur: 1800, texto: 'Sube los niveles: la silueta se pega más. En el límite, coincide. <b style="color:#f4d345;font-weight:400">Los cortes contienen toda la información.</b>' },
    ],
    primitivas({ q, paso, e }) {
      const n = Math.round(e.n);
      const N = [marco({ x: DOM, y: [0, 1] }, { alfa: ev(q(0), 0, 0.3), ticks: { x: [0, 5, 10], y: [0, 1] }, etiquetas: { x: 'x', y: R`\mu` } })];
      const t = ev(q(0), 0.1, 1);
      if (t > 0) N.push(curva((x) => [x, g(x)], DOM, { hasta: t, n: 240, color: AZUL, ancho: 3, brillo: true }));
      const uno = ev(q(1), 0, 0.7);
      if (uno > 0 && paso === 1) {
        const a = 0.5, s = semi(a);
        N.push(linea([0, a], [10, a], { color: BLANCO, ancho: 1.2, alfa: 0.6 * uno, discontinua: true }), punto([5 - s, a], { color: ORO, radio: 5, alfa: uno }), punto([5 + s, a], { color: ORO, radio: 5, alfa: uno }));
        N.push(poligono([[5 - s, 0], [5 + s, 0], [5 + s, a * ev(q(1), 0.3, 1)], [5 - s, a * ev(q(1), 0.3, 1)]], { color: ORO, alfa: 0.35 }));
        N.push(rotulo([5, a], R`\alpha \cdot \mathbf{1}_{A_\alpha}`, { clave: 'bloque', dy: 26, tam: 24, color: ORO, alfa: uno }));
      }
      if (paso >= 2) {
        const prog = ev(q(2), 0, 1);
        for (let k = 1; k <= n; k++) {
          const a = k / n;
          if (a >= 1) continue;
          const vis = ev(prog, (k - 1) / n, (k + 1) / n);
          if (vis <= 0) continue;
          const s = semi(a);
          N.push(poligono([[5 - s, 0], [5 + s, 0], [5 + s, a * vis], [5 - s, a * vis]], { color: ORO, alfa: Math.min(0.28, 2.6 / n) }));
        }
      }
      if (paso >= 3) {
        const si = ev(q(3), 0, 0.9);
        N.push(curva((x) => [x, esc(x, n)], DOM, { hasta: Math.max(si, 1e-3), n: 1600, color: ORO, ancho: 2.4 }));
        const x = e.x[0], m = g(x), r = esc(x, n), ap = ev(q(3), 0.5, 1);
        if (ap > 0) {
          N.push(punto([x, m], { color: AZUL, radio: 5.5, alfa: ap }), punto([x, r], { color: ORO, radio: 5.5, alfa: ap }), linea([x, 0], [x, r], { color: BLANCO, ancho: 1.2, alfa: 0.5 * ap, discontinua: true }));
          N.push(rotulo([9.8, 0.9], R`\mu - \text{silueta} = ${coma(m - r, 3)}`, { clave: 'dif', ancla: 'r', tam: 22, color: BLANCO, alfa: ap }));
          N.push(rotulo([9.8, 0.8], R`\text{cota } \tfrac{1}{n} = ${coma(1 / n, 3)}`, { clave: 'cot', ancla: 'r', tam: 22, color: ORO, alfa: ap }));
        }
      }
      return N;
    },
  },
  manipulacion: '<ul><li>Mueve «niveles» de 1 a 40. Con un solo nivel, se ve el conjunto clásico; con muchos, se recupera la curva.</li><li>Arrastra la línea vertical y compara el error con su cota.</li></ul>',
  rigor: [
    { tipo: 'DEF', titulo: 'Función indicadora', tex: R`Para un conjunto clásico $E$, $\mathbf{1}_E(x) = 1$ si $x \in E$ y $0$ si no. Con ella, $\alpha \cdot \mathbf{1}_{A_\alpha}$ es un conjunto difuso: un bloque de altura $\alpha$ sobre el corte.` },
    { tipo: 'TEO', titulo: 'Teorema de representación', tex: R`Para todo conjunto difuso $A$ y todo $x \in X$: $\ \mu_A(x) = \sup_{\alpha \in (0, 1]} \alpha \cdot \mathbf{1}_{A_\alpha}(x)$.`, valiente: true,
      cartelas: ['En un mundo de conjuntos sin borde…', 'alguien afirmó que bastan <em>bordes nítidos</em> para reconstruirlo todo…', 'nadie le creyó. Hasta que trajo un supremo.'],
      pasos: [
        { texto: R`Fijemos $x \in X$ y llamemos $m = \mu_A(x)$. Hay que demostrar que el supremo vale $m$. Separamos los niveles $\alpha$ en dos grupos.`, porque: 'Una igualdad de funciones se demuestra punto a punto.' },
        { texto: R`Si $\alpha > m$: entonces $\mu_A(x) < \alpha$, luego $x \notin A_\alpha$ y $\alpha \cdot \mathbf{1}_{A_\alpha}(x) = 0$.`, porque: 'Definición de corte: $x \in A_\alpha$ exige $\mu_A(x) \ge \alpha$.' },
        { texto: R`Si $0 < \alpha \le m$: entonces $\mu_A(x) \ge \alpha$, luego $x \in A_\alpha$ y $\alpha \cdot \mathbf{1}_{A_\alpha}(x) = \alpha$.`, porque: 'Definición de corte, de nuevo.' },
        { texto: R`Si $m = 0$, no hay niveles del segundo grupo: todos los valores son $0$ y el supremo es $0 = m$.`, porque: 'Solo actúa el primer caso, pues $\\alpha > 0 = m$ para todo $\\alpha \\in (0, 1]$.' },
        { texto: R`Si $m > 0$, los valores son $0$ (primer grupo) y todos los $\alpha \in (0, m]$. Su supremo es $m$, y se alcanza en $\alpha = m$.`, porque: '$m \\in (0, 1]$, así que $\\alpha = m$ es un nivel permitido, y ningún valor supera a $m$.' },
        { texto: R`En ambos casos, $\sup_{\alpha \in (0,1]} \alpha \cdot \mathbf{1}_{A_\alpha}(x) = m = \mu_A(x)$.`, porque: 'Como $x$ era arbitrario, la igualdad vale en todo $X$.' },
      ] },
    { tipo: 'PROP', titulo: 'Con finitos niveles', tex: R`Con los niveles $\alpha = \frac{k}{n}$, $k = 1, \dots, n$, la silueta $r_n(x) = \max_k \frac{k}{n} \mathbf{1}_{A_{k \div n}}(x)$ cumple $0 \le \mu_A(x) - r_n(x) < \frac{1}{n}$.`, pasos: [
      { texto: R`$x \in A_{k \div n} \iff \frac{k}{n} \le \mu_A(x) \iff k \le n\, \mu_A(x)$.`, porque: 'Definición de corte, multiplicando por $n > 0$.' },
      { texto: R`Por tanto, el mayor $k$ válido es $\lfloor n\, \mu_A(x) \rfloor$, y $r_n(x) = \frac{\lfloor n\, \mu_A(x) \rfloor}{n}$.`, porque: 'Definición de parte entera; si ningún $k \\ge 1$ vale, la parte entera es 0 y $r_n(x) = 0$.' },
      { texto: R`Como $t - 1 < \lfloor t \rfloor \le t$ para todo real $t$, con $t = n\, \mu_A(x)$ y dividiendo por $n$: $\mu_A(x) - \frac{1}{n} < r_n(x) \le \mu_A(x)$.`, porque: 'Propiedad de la parte entera. Reordenar da la cota.' },
    ] },
    { tipo: 'NOTA', titulo: 'Por qué importa', tex: R`Se puede trabajar con un conjunto difuso nivel a nivel, con herramientas clásicas, y recomponerlo al final. Lo usarán la aritmética de números difusos y el principio de extensión, en la región 4. En los libros se conoce también como teorema de descomposición.` },
  ],
  tecnicas: [
    { titulo: 'Parte el dominio del supremo', texto: 'Para calcular un supremo con una condición, separa los índices en los que la condición se cumple de los que no, y resuelve cada grupo.' },
    { titulo: 'Prueba de doble cota escondida', texto: 'Demostrar que un supremo vale $m$ es probar dos cosas: ningún valor lo supera, y hay valores que lo alcanzan o se le acercan.' },
  ],
  retos: [
    { id: 'niveles-necesarios', tipo: 'calcular', enunciado: R`Quieres que la silueta tenga un error estrictamente menor que $0{,}05$ en todo punto, sea cual sea el conjunto. ¿Cuál es el menor $n$ que lo garantiza con la cota $\mu_A - r_n < \frac{1}{n}$?`, respuesta: 20, tol: 0.4,
      pistas: [R`Basta $\frac{1}{n} \le 0{,}05$: la desigualdad de la cota ya es estricta.`], explicacion: R`$\frac{1}{20} = 0{,}05$, y como la cota es estricta, $n = 20$ basta.` },
    { id: 'demostrar-representacion', tipo: 'demostrar', enunciado: R`Demuestra la versión con cortes fuertes: $\mu_A(x) = \sup_{\alpha \in [0, 1)} \alpha \cdot \mathbf{1}_{A_{\alpha^+}}(x)$.`,
      pistas: ['Copia el esquema del teorema: fija $x$, sea $m = \\mu_A(x)$, y separa los niveles.', 'Ahora $x \\in A_{\\alpha^+}$ exige $\\alpha < m$: el supremo ya no se alcanza. ¿Sigue valiendo $m$?'],
      solucion: [
        { texto: R`Sea $m = \mu_A(x)$. Si $\alpha \ge m$, entonces $x \notin A_{\alpha^+}$ y el valor es $0$.`, porque: 'Definición de corte fuerte: $x \\in A_{\\alpha^+}$ exige $\\mu_A(x) > \\alpha$.' },
        { texto: R`Si $\alpha < m$, entonces $x \in A_{\alpha^+}$ y el valor es $\alpha$.`, porque: 'La misma definición.' },
        { texto: R`Si $m = 0$, todo $\alpha \in [0, 1)$ cumple $\alpha \ge m$: todos los valores son $0$, y el supremo es $0 = m$.`, porque: 'Solo se aplica el primer caso.' },
        { texto: R`Si $m > 0$, el conjunto de valores no nulos es $[0, m)$, cuyo supremo es $m$ aunque no se alcance.`, porque: 'El supremo de un intervalo $[0, m)$ es su extremo $m$.' },
      ] },
  ],
  referencias: ['G. J. Klir, B. Yuan, <em>Fuzzy Sets and Fuzzy Logic</em>, cap. 2 (teoremas de descomposición).', 'M. Navara, temario del curso <em>Fuzzy Logic</em>, CTU Praga: teorema de representación por cortes.'],
};
