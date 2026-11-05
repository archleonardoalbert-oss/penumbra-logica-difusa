// Escena mínima para probar el motor de pasos.
import { curva, linea, marco, punto } from '../../motor/primitivas.js';
import { ev } from '../../motor/tiempo.js';

export default {
  id: 'demo',
  formato: 'plano',
  W: 800,
  H: 400,
  ejes: { x: [0, 10], y: [0, 1], caja: { x: 90, y: 40, w: 660, h: 310 } },
  entradas: [
    { id: 'b', tipo: 'deslizador', etiqueta: 'b', min: 0, max: 1, paso: 0.01, valor: 0.5 },
    { id: 'f', tipo: 'expresion', etiqueta: 'μ(x)', vars: ['x'], valor: 'x / 10', dominio: [0, 10] },
    { id: 'sonda', tipo: 'arrastre', valor: [5, 0.5], region: { x: [0, 10], y: [0, 1] } },
  ],
  pasos: [{ dur: 800, texto: 'Primero, los ejes.' }, { dur: 800, texto: 'Luego, la curva.' }, { dur: 800, texto: 'Y al final, la sonda.' }],
  primitivas({ q, e }) {
    const r = [marco({ x: [0, 10], y: [0, 1] }, { alfa: ev(q(0), 0, 1) })];
    if (q(1) > 0) r.push(curva((x) => [x, e.f(x)], [0, 10], { hasta: Math.max(q(1), 1e-3), color: [88, 196, 221], ancho: 3 }));
    if (q(2) > 0) {
      const x = e.sonda[0], y = e.f(x);
      r.push(punto([x, y], { alfa: q(2) }), linea([x, y], [x, 0], { alfa: q(2) }));
    }
    return r;
  },
};
