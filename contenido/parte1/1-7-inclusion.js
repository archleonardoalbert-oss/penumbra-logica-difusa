import { AZUL, BLANCO, ORO, ROJO, ROSA } from '../../motor/colores.js';
import { grado as gradoInclusion, gaussiana } from '../../nucleo/difuso.js';
import { curva, linea, marco, poligono, punto, rotulo } from '../../motor/primitivas.js';
import { ev } from '../../motor/tiempo.js';

const R = String.raw;
const coma = (v, d = 2) => v.toFixed(d).replace('.', '{,}');
const A = (e) => { const g = gaussiana(e.centroA, 1); return (x) => e.alturaA * g(x); };
const B = (e) => gaussiana(5, e.anchoB);
const DOM = [0, 10];

export default {
  id: '1-7-inclusion',
  titulo: 'Inclusión y cardinalidad',
  puente: 'Has comparado conjuntos enteros. Ahora, la idea más potente de esta región: cortar un conjunto difuso para convertirlo en clásicos.',
  pregunta: 'Sin borde, ¿qué significa que un conjunto esté dentro de otro? ¿Y cuántos elementos tiene algo que se tiene «un poco»?',
  escena: {
    id: 'inclusion', formato: 'plano', W: 1100, H: 540,
    ejes: { x: DOM, y: [0, 1], caja: { x: 110, y: 70, w: 860, h: 390 } },
    entradas: [
      { id: 'centroA', tipo: 'deslizador', etiqueta: 'centro de A', min: 1, max: 9, paso: 0.05, valor: 3.5 },
      { id: 'alturaA', tipo: 'deslizador', etiqueta: 'altura de A', min: 0.2, max: 1, paso: 0.01, valor: 0.8 },
      { id: 'anchoB', tipo: 'deslizador', etiqueta: 'anchura de B', min: 0.6, max: 4, paso: 0.05, valor: 1.6 },
    ],
    pasos: [
      { dur: 2000, texto: 'Dos conjuntos, $A$ en azul y $B$ en rosa. En el mundo clásico, $A \\subseteq B$ quiere decir: todo lo que está en $A$, está en $B$.' },
      { dur: 2600, texto: 'La generalización natural: en cada punto, $A$ no puede superar a $B$. La curva azul debe quedar siempre por debajo de la rosa. Donde se sale, lo marcamos en rojo.' },
      { dur: 2600, texto: 'Esa exigencia es brutal: un punto que se sale por una milésima lo estropea todo. Por eso se mide también un <em>grado de inclusión</em>: qué parte de $A$ cabe en $B$.' },
      { dur: 1800, texto: 'Y el tamaño: el cardinal sigma de un conjunto suma sus grados, como si cada elemento contara lo que pertenece. Aquí, con $X$ continuo, es el área bajo la curva.' },
    ],
    primitivas({ q, e }) {
      const a = A(e), b = B(e);
      const N = [marco({ x: DOM, y: [0, 1] }, { alfa: ev(q(0), 0, 0.3), ticks: { x: [0, 5, 10], y: [0, 1] }, etiquetas: { x: 'x', y: R`\mu` } })];
      const t = ev(q(0), 0.1, 1);
      if (t > 0) N.push(curva((x) => [x, a(x)], DOM, { hasta: t, n: 240, color: AZUL, ancho: 3.2, brillo: true }), curva((x) => [x, b(x)], DOM, { hasta: t, n: 240, color: ROSA, ancho: 3.2, brillo: true }));
      const v = ev(q(1), 0.2, 1);
      if (v > 0) {
        for (let i = 0; i < 200; i++) {
          const x0 = i / 20, x1 = (i + 1) / 20, a0 = a(x0), a1 = a(x1), b0 = b(x0), b1 = b(x1);
          if (a0 > b0 && a1 > b1) N.push(poligono([[x0, b0], [x1, b1], [x1, a1], [x0, a0]], { color: ROJO, alfa: 0.5 * v }));
        }
      }
      const xs = Array.from({ length: 2001 }, (_, i) => i / 200);
      const peor = xs.reduce((m, x) => (a(x) - b(x) > a(m) - b(m) ? x : m), 0), dentro = a(peor) <= b(peor) + 1e-9;
      if (v > 0) {
        N.push(rotulo([9.2, 0.92], dentro ? R`A \subseteq B` : R`A \not\subseteq B`, { clave: 'inc', tam: 30, color: dentro ? ORO : ROJO, alfa: v }));
        if (!dentro) N.push(punto([peor, a(peor)], { color: BLANCO, radio: 5, alfa: v }), punto([peor, b(peor)], { color: BLANCO, radio: 5, alfa: v }), linea([peor, a(peor)], [peor, b(peor)], { color: BLANCO, ancho: 1.6, alfa: v }));
      }
      const g = ev(q(2), 0.2, 1);
      if (g > 0) N.push(rotulo([9.2, 0.76], R`S(A, B) = ${coma(gradoInclusion(a, b, DOM, 800))}`, { clave: 'gra', ancla: 'r', dx: 64, tam: 24, color: ORO, alfa: g }));
      const c = ev(q(3), 0, 1);
      if (c > 0) {
        const paso = 10 / 800; let ca = 0; for (let i = 0; i < 800; i++) ca += a((i + 0.5) * paso) * paso;
        N.push(rotulo([9.2, 0.6], R`|A| = ${coma(ca)}`, { clave: 'car', ancla: 'r', dx: 64, tam: 24, color: AZUL, alfa: c }));
      }
      return N;
    },
  },
  manipulacion: '<ul><li>Mueve el centro y la altura de $A$, y ensancha $B$, hasta lograr que el rojo desaparezca.</li><li>Observa cómo sube el grado $S(A, B)$ mucho antes de que la inclusión estricta se cumpla.</li></ul>',
  rigor: [
    { tipo: 'DEF', titulo: 'Inclusión (Zadeh)', tex: R`$A \subseteq B$ si y solo si $\mu_A(x) \le \mu_B(x)$ para todo $x \in X$.` },
    { tipo: 'DEF', titulo: 'Grado de inclusión (Kosko)', tex: R`En un universo finito y con $A$ no vacío, $S(A, B) = \dfrac{\sum_x \min(\mu_A(x), \mu_B(x))}{\sum_x \mu_A(x)}$. Con $X$ continuo, se usan integrales.` },
    { tipo: 'DEF', titulo: 'Cardinal sigma', tex: R`En un universo finito, $|A| = \sum_{x \in X} \mu_A(x)$. Si $A$ es clásico, es el número de sus elementos.` },
    { tipo: 'PROP', titulo: 'Coherencia', tex: R`$S(A, B) = 1$ si y solo si $A \subseteq B$.`, pasos: [
      { texto: R`Para todo $x$, $\min(\mu_A(x), \mu_B(x)) \le \mu_A(x)$, con igualdad si y solo si $\mu_A(x) \le \mu_B(x)$.`, porque: 'Propiedad del mínimo.' },
      { texto: R`Sumando, $\sum_x \min(\mu_A(x), \mu_B(x)) \le \sum_x \mu_A(x)$, y las sumas coinciden si y solo si hay igualdad en todos los términos.`, porque: 'Una suma de términos no negativos $\mu_A(x) - \min(\mu_A(x), \mu_B(x))$ vale 0 solo si todos valen 0.' },
      { texto: R`Por tanto, $S(A, B) = 1$ equivale a $\mu_A(x) \le \mu_B(x)$ para todo $x$, que es $A \subseteq B$.`, porque: 'Se multiplica por $\\sum_x \\mu_A(x) > 0$, y se aplica la definición de inclusión.' },
    ] },
  ],
  tecnicas: [
    { titulo: 'De la suma a cada término', texto: 'Si una suma de cantidades no negativas vale 0, cada una vale 0. Es el modo estándar de pasar de una igualdad global a una afirmación punto a punto.' },
    { titulo: 'Relaja lo binario con un cociente', texto: 'Una relación todo o nada puede volverse gradual midiendo qué fracción de lo que debería cumplirla la cumple de verdad.' },
  ],
  retos: [
    { id: 'cardinal', tipo: 'calcular', enunciado: R`¿Cuánto vale $|A|$ si $A = \{(a, 0{,}2),\ (b, 1),\ (c, 0{,}5),\ (d, 0{,}3)\}$?`, respuesta: 2, tol: 0.001, pistas: ['Suma los grados.'], explicacion: R`$0{,}2 + 1 + 0{,}5 + 0{,}3 = 2$.` },
    { id: 'inclusion', tipo: 'calcular', enunciado: R`En $\{x, y, z\}$, con grados $A = (0{,}5;\ 0{,}8;\ 0{,}2)$ y $B = (0{,}4;\ 1;\ 0{,}2)$, ¿cuánto vale $S(A, B)$? Da dos decimales.`, respuesta: 0.9333, tol: 0.006,
      pistas: [R`Los mínimos son $0{,}4$, $0{,}8$ y $0{,}2$.`, R`El denominador es $0{,}5 + 0{,}8 + 0{,}2$.`], explicacion: R`$\frac{1{,}4}{1{,}5} \approx 0{,}93$: casi todo $A$ cabe en $B$, aunque $A \not\subseteq B$.` },
    { id: 'demostrar-inclusion', tipo: 'demostrar', enunciado: R`Demuestra que $A \subseteq B$ si y solo si $\mu_{A \cap B} = \mu_A$, donde $\mu_{A \cap B}(x) = \min(\mu_A(x), \mu_B(x))$.`,
      pistas: ['Dos conjuntos difusos son iguales si lo son punto a punto: fija un $x$.', 'Para números reales, $\\min(a, b) = a$ equivale a $a \\le b$.'],
      solucion: [
        { texto: R`Fijemos $x \in X$ y escribamos $a = \mu_A(x)$, $b = \mu_B(x)$.`, porque: 'Dos conjuntos difusos son iguales cuando sus funciones coinciden en cada punto.' },
        { texto: R`Para números reales, $\min(a, b) = a \iff a \le b$.`, porque: 'Si $a \\le b$, el mínimo es $a$. Y si $\\min(a, b) = a$, por ser mínimo, $a \\le b$.' },
        { texto: R`Por tanto, $\mu_{A \cap B}(x) = \mu_A(x)$ para todo $x$ equivale a $\mu_A(x) \le \mu_B(x)$ para todo $x$, que es $A \subseteq B$.`, porque: 'Se cuantifica sobre todo $x$ en los dos lados de la equivalencia.' },
      ] },
  ],
  referencias: ['L. A. Zadeh, «Fuzzy sets» (1965).', 'B. Kosko, «Fuzzy entropy and conditioning», <em>Information Sciences</em> 40 (1986).', 'M. Navara, temario del curso <em>Fuzzy Logic</em>, CTU Praga.'],
};
