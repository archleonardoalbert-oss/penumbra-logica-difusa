import { APAGADO, AZUL, BLANCO, GRIS2, ORO } from '../../motor/colores.js';
import { curva, linea, marco, poligono, punto, rotulo } from '../../motor/primitivas.js';
import { ev, mix, mixc } from '../../motor/tiempo.js';

const R = String.raw;
const GENTE = [150, 158, 165, 172, 179, 181, 188, 196, 205];
const ancho = (b) => Math.max(0.04, b * 8);
const mu = (x, b) => 1 / (1 + Math.exp(Math.max(-40, Math.min(40, -(x - 180) / ancho(b)))));
const coma = (v) => v.toFixed(2).replace('.', '{,}');
const color = (v) => mixc(AZUL, ORO, v);

function persona(h, v, a, k) {
  const alto = ((h - 110) * 1.1) / 250, base = -0.74, cuerpo = mixc(APAGADO, ORO, v), x = h, ms = 0.55;
  return [
    poligono([[x - ms, base], [x + ms, base], [x + ms, base + alto - 0.04], [x - ms, base + alto - 0.04]], { color: cuerpo, alfa: a }),
    punto([x, base + alto], { radio: 7.5, color: cuerpo, alfa: a, halo: 26 * v }),
    rotulo([x, base - 0.07], coma(v), { clave: `v${k}`, tam: 14, color: mixc(GRIS2, ORO, v), alfa: a, dx: h === 179 ? -14 : h === 181 ? 14 : 0 }),
  ];
}

export default {
  id: '1-1-quien-es-alto',
  titulo: '¿Quién es alto?',
  pregunta: 'Si mides 181 cm eres alto. ¿Y con 179? Dos centímetros, menos que el grosor de un dedo. ¿De verdad cambia algo?',
  escena: {
    id: 'quien-es-alto', formato: 'plano', W: 1100, H: 560,
    ejes: { x: [140, 210], y: [0, 1], caja: { x: 130, y: 90, w: 840, h: 250 } },
    entradas: [
      { id: 'borrosidad', tipo: 'deslizador', etiqueta: 'borrosidad', min: 0, max: 1, paso: 0.01, valor: 0.35 },
      { id: 'altura', tipo: 'arrastre', eje: 'x', valor: [172, 0.5], region: { x: [140, 210], y: [0, 1] } },
    ],
    pasos: [
      { dur: 2200, texto: 'Un conjunto clásico exige una frontera. Pongámosla en 180 cm: por debajo, fuera; por encima, dentro.' },
      { dur: 2400, texto: 'Mira qué hace esa frontera. Con 179 cm estás fuera; con 181 cm, dentro. Dos personas casi iguales reciben respuestas opuestas.' },
      { dur: 2800, texto: 'Deja que el borde se derrita. Ya no preguntamos <em>si</em> perteneces, sino <em>cuánto</em>. Fíjate en la fórmula: el conjunto $\\{0, 1\\}$ se abre en el intervalo $[0, 1]$.' },
      { dur: 1600, texto: 'Ahora cada altura tiene su grado, y a alturas parecidas les tocan grados parecidos. Quien pertenece más, brilla más.' },
    ],
    primitivas({ q, paso, e }) {
      const b = paso >= 2 ? e.borrosidad * ev(q(2), 0, 1) : 0, N = [];
      N.push(marco({ x: [140, 210], y: [0, 1] }, { alfa: ev(q(0), 0, 0.3), ticks: { x: [140, 150, 160, 170, 180, 190, 200, 210], y: [0, 1] }, etiquetas: { x: R`\text{altura (cm)}`, y: R`\mu` }, colorY: ORO }));
      const traz = ev(q(0), 0.15, 1);
      if (traz > 0) {
        N.push(curva((x) => [x, mu(x, b)], [140, 210], { hasta: Math.max(traz, 1e-3), n: 420, ancho: 3.4, brillo: true, colorPor: (p, r) => color((p[1] + r[1]) / 2) }));
      }
      GENTE.forEach((h, k) => { const a = ev(q(0), 0.45 + k * 0.04, 0.8 + k * 0.02); if (a > 0) N.push(...persona(h, mu(h, b), a, k)); });
      const ll = paso === 1 ? ev(q(1), 0, 0.2) : 0;
      if (ll > 0) {
        N.push(punto([179, mu(179, 0)], { radio: 8, color: AZUL, alfa: ll }), punto([181, mu(181, 0)], { radio: 8, color: ORO, alfa: ll }));
        N.push(rotulo([179, 0], R`179\text{ cm} \to 0`, { clave: 'l179', dx: -24, dy: -24, ancla: 'r', tam: 22, color: AZUL, alfa: ll }));
        N.push(rotulo([181, 1], R`181\text{ cm} \to 1`, { clave: 'l181', dx: 24, dy: -22, ancla: 'l', tam: 22, color: ORO, alfa: ll }));
      }
      // la fórmula que se abre
      const fa = ev(q(0), 0.5, 0.9);
      if (fa > 0) {
        const m = paso >= 2 ? ev(q(2), 0.1, 0.9) : 0, X = 146, Y = 0.82;
        N.push(rotulo([X, Y], R`\mu(x) \in`, { clave: 'f0', ancla: 'l', tam: 32, alfa: fa }));
        N.push(rotulo([155, Y], R`\{`, { clave: 'f1', tam: 32, alfa: fa * (1 - m) }));
        N.push(rotulo([155, Y], '[', { clave: 'f2', tam: 32, alfa: fa * m }));
        const c0 = 156.9, c1 = mix(159.7, 171, m);
        N.push(rotulo([c0, Y], '0', { clave: 'f3', tam: 32, color: AZUL, alfa: fa }));
        N.push(rotulo([c1, Y], '1', { clave: 'f4', tam: 32, color: ORO, alfa: fa }));
        if (m < 1) N.push(rotulo([158.3, Y - 0.015], ',', { clave: 'f5', tam: 32, alfa: fa * (1 - m) }));
        N.push(rotulo([c1 + 1.8, Y], R`\}`, { clave: 'f6', tam: 32, alfa: fa * (1 - m) }));
        N.push(rotulo([c1 + 1.8, Y], ']', { clave: 'f7', tam: 32, alfa: fa * m }));
        if (m > 0.02) N.push(curva((u) => [u, Y], [c0 + 1.2, c1 - 1.2], { n: 40, ancho: 6, colorPor: (p) => color((p[0] - c0) / (c1 - c0 || 1)), alfa: fa * m }));
      }
      const s = paso >= 3 ? ev(q(3), 0, 0.6) : 0;
      if (s > 0) {
        const x = e.altura[0], v = mu(x, e.borrosidad), cl = color(v);
        N.push(linea([x, v], [x, 0], { color: BLANCO, ancho: 1.3, alfa: 0.55 * s, discontinua: true }), linea([x, v], [140, v], { color: cl, ancho: 1.5, alfa: 0.8 * s, discontinua: true }));
        N.push(punto([x, v], { color: cl, radio: 7.5, alfa: s }));
        N.push(rotulo([x, v], R`\mu(${x.toFixed(0)}) = ${coma(v)}`, { clave: 'sonda', dx: 20, dy: 26, ancla: 'l', tam: 23, color: cl, alfa: s }));
      }
      return N;
    },
  },
  manipulacion: `<ul>
    <li>Mueve «borrosidad» hasta 0: vuelves al mundo clásico y el salto reaparece.</li>
    <li>En el último paso, arrastra la línea vertical y lee el grado de cada altura.</li>
    <li>Busca el punto donde dos personas vecinas ya no se distinguen.</li></ul>`,
  rigor: [
    { tipo: 'DEF', titulo: 'Función característica', tex: R`Un conjunto clásico $A$ de un universo $X$ se describe por $\chi_A : X \to \{0, 1\}$, con $\chi_A(x) = 1$ si $x \in A$ y $\chi_A(x) = 0$ si $x \notin A$.` },
    { tipo: 'DEF', titulo: 'Conjunto difuso (Zadeh, 1965)', tex: R`Un conjunto difuso $A$ de $X$ es una función $\mu_A : X \to [0, 1]$. El número $\mu_A(x)$ es el <em>grado de pertenencia</em> de $x$ a $A$.` },
    { tipo: 'EJ', titulo: 'La curva de esta escena', tex: R`$\mu(x) = \dfrac{1}{1 + e^{-(x - 180) \,\div\, w}}$, donde $w > 0$ mide la borrosidad. Cuando $w \to 0^+$, $\mu(x) \to 0$ si $x < 180$ y $\mu(x) \to 1$ si $x > 180$: el conjunto clásico es el caso límite.` },
    { tipo: 'NOTA', tex: R`El número exacto no es lo importante: 0,62 o 0,64 dicen casi lo mismo. Lo que aporta el modelo es la forma de la gradación. Elegir la curva es modelar, y depende del contexto: «alto» no significa lo mismo entre jugadores de baloncesto.` },
  ],
  tecnicas: [
    { titulo: 'Cambiar $\\{0, 1\\}$ por $[0, 1]$', texto: 'Casi todo el curso nace de este gesto. Al generalizar una definición clásica, pregúntate qué pasa en los valores intermedios y comprueba que los extremos 0 y 1 devuelven lo clásico.' },
    { titulo: 'Busca la discontinuidad absurda', texto: 'Si un cambio mínimo en la entrada produce un salto total en la salida, y eso no refleja el fenómeno, el modelo binario está imponiendo una frontera que no existe.' },
  ],
  retos: [
    { id: 'borrosidad', tipo: 'manipular', enunciado: R`Sube la borrosidad hasta que 179 cm y 181 cm difieran en menos de $0{,}1$ de grado.`,
      precision: (e) => (Math.abs(mu(181, e.borrosidad) - mu(179, e.borrosidad)) < 0.1 ? 1 : 0.5 * (1 - Math.min(1, Math.abs(mu(181, e.borrosidad) - mu(179, e.borrosidad))))),
      prueba: { borrosidad: 0.9 }, pistas: ['Las dos están en la zona más empinada de la curva: mira la pendiente en 180.'],
      explicacion: 'Cuanto más suave es la curva, menos importa un centímetro.' },
    { id: 'grado-174', tipo: 'calcular', enunciado: R`Con $w = 5$, ¿cuánto vale $\mu(174) = \dfrac{1}{1 + e^{-(174 - 180) \,\div\, 5}}$? Da dos decimales.`,
      respuesta: 0.2315, tol: 0.006, pistas: [R`El exponente es $-(-6) \div 5 = 1{,}2$.`, R`$e^{1{,}2} \approx 3{,}32$.`], explicacion: R`$\mu(174) = \frac{1}{1 + 3{,}32} \approx 0{,}23$.` },
  ],
  referencias: ['L. A. Zadeh, «Fuzzy sets», <em>Information and Control</em> 8 (1965), 338–353.'],
};
