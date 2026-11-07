// Piezas de las escenas del Horizonte.
import { curva, poligono as poli } from '../../motor/primitivas.js';
const R = String.raw;
export const coma = (v, d = 2) => v.toFixed(d).replace('.', '{,}');
/** Una curva de fuzzython, dibujada por sus puntos: con sus extremos a la vista. */
export const trazar = (P, dom, op = {}) => curva((x) => [x, P.val(x)], dom, { n: 240, ancho: 2.8, tol: 1, ...op });
export const relleno = (P, dom, op = {}) => { const xs = [dom[0], ...P.puntos.map((q) => q[0]).filter((x) => x > dom[0] && x < dom[1]), dom[1]]; return poli([[dom[0], 0], ...xs.map((x) => [x, P.val(x)]), [dom[1], 0]], op); };
export { R };
