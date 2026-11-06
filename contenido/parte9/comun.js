// Piezas comunes de las escenas del amanecer.
import { linea, punto } from '../../motor/primitivas.js';

const R = String.raw;
export const coma = (v, d = 2) => v.toFixed(d).replace('.', '{,}');
export const texto = (t) => R`\text{${t}}`;
/** Una flecha: del punto p, con vector v. Nace y acaba en puntos, para que se vea dónde empieza y dónde termina. */
export function flecha(p, v, { color, alfa = 1, ancho = 2.4 } = {}) {
  const q = [p[0] + v[0], p[1] + v[1]];
  return [punto(p, { color, radio: 3, alfa, halo: 0 }), linea(p, q, { color, ancho, alfa }), punto(q, { color, radio: 5, alfa, halo: 0 })];
}
