import { curva, marco } from '../../motor/primitivas.js';
export default {
  id: 'demo', titulo: 'Concepto de prueba', pregunta: '¿Se ve todo en su orden?',
  escena: { id: 'demo', formato: '3d', W: 800, H: 500, render3d: { cx: 400, cy: 280, S: 240 },
    entradas: [{ id: 'b', tipo: 'deslizador', etiqueta: 'b', min: 0, max: 1, valor: 0.5 }],
    pasos: [{ dur: 300, texto: 'Primer paso con $\\mu$.' }, { dur: 300, texto: 'Segundo.' }],
    primitivas: () => [marco({ x: [0, 1], y: [0, 1], z: [0, 1] }), curva((u) => [u, 1, u * u], [0, 1])] },
  manipulacion: 'Mueve el deslizador.',
  rigor: [{ tipo: 'DEF', tex: 'Un conjunto difuso es $\\mu : X \\to [0,1]$.' },
    { tipo: 'TEO', titulo: 'Prueba', tex: 'Algo cierto.', valiente: true, cartelas: ['a', 'b', 'c'], pasos: [{ texto: 'Paso $x$.', porque: 'Porque sí.' }] }],
  tecnicas: [{ titulo: 'Una técnica', texto: 'Se usa así.' }],
  retos: [
    { id: 'c', tipo: 'calcular', enunciado: '¿Cuánto es $0{,}5 + 0{,}25$?', respuesta: 0.75, tol: 0.01, pistas: ['Suma.', 'Da más de 0,5.'] },
    { id: 'e', tipo: 'elegir', enunciado: '¿Cuál?', opciones: ['Esta no', 'Esta sí'], correcta: 1 },
    { id: 'm', tipo: 'manipular', enunciado: 'Pon b en 1.', precision: (e) => e.b },
    { id: 'd', tipo: 'demostrar', enunciado: 'Demuestra algo.', solucion: [{ texto: 'Así.' }] },
  ],
};
