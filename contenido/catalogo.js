// El mapa del curso: 8 regiones con sus conceptos. `temas` enlaza con los títulos de los vídeos que dieron el alcance.
const listo = (id, titulo, retos, temas = []) => ({ id, titulo, estado: 'listo', carga: () => import(`./parte${id.split('-')[0]}/${id}.js`), retos: retos.map((r) => ({ id: r })), temas });
const pend = (id, titulo, temas = []) => ({ id, titulo, estado: 'pendiente', retos: [], temas });

export const CATALOGO = [
  { id: 1, titulo: 'El borde', lema: 'Donde lo nítido empieza a deshacerse.', posicion: [0.16, 0.2], conceptos: [
    listo('1-1-quien-es-alto', '¿Quién es alto?', ['borrosidad', 'grado-174'], ['1.0 Conjuntos difusos (contenido)']),
    listo('1-2-monton', 'La paradoja del montón', ['verdad-tras-n', 'causa-paradoja']),
    listo('1-3-conjunto-difuso', 'Qué es un conjunto difuso', ['cerca-de-5', 'discreto-a-tabla'], ['1.1 Conjuntos certeros vs difusos']),
    listo('1-4-donde-vive', 'Dónde vive la lógica difusa', ['se-presta', 'decidir-ventilador'], ['Introducción al curso y aplicaciones']),
    listo('1-5-no-es-probabilidad', 'Pertenencia no es probabilidad', ['grado-o-azar', 'botellas']),
    listo('1-6-anatomia', 'Soporte, núcleo y altura', ['moldear-trapecio', 'calcular-anatomia']),
    listo('1-7-inclusion', 'Inclusión y cardinalidad', ['cardinal', 'inclusion', 'demostrar-inclusion']),
    listo('1-8-cortes-alfa', 'α-cortes', ['corte-triangulo', 'propiedad-monotonia']),
    listo('1-9-representacion', 'El teorema de representación', ['niveles-necesarios', 'demostrar-representacion']),
    listo('1-10-convexidad', 'Convexidad', ['contraejemplo', 'interseccion', 'demostrar-cortes-convexos']),
  ] },
  { id: 2, titulo: 'La forma', lema: 'Cada idea vaga tiene su curva.', posicion: [0.5, 0.15], conceptos: [
    listo('2-1-parametrizadas', 'Una curva con pocos botones', ['ajusta-triangulo', 'punto-triangulo', 'cuantos-numeros'], ['1.4 Funciones de membresía (1)']),
    listo('2-2-tipicas', 'Las cinco formas de siempre', ['elige-forma', 'calcula-gaussiana', 'sin-puntas'], ['1.4 Funciones de membresía típicas (2)']),
    listo('2-3-construirlas', 'De dónde salen los grados', ['jurado-suficiente', 'contar-votos', 'directo-o-indirecto']),
    listo('2-4-pendulo', 'Tu péndulo: darle palabras al ángulo', ['ajusta-angulo', 'grado-angulo']),
  ] },
  { id: 3, titulo: 'El álgebra', lema: 'Y, o, no: cuando dejan de ser únicos.', posicion: [0.84, 0.22], conceptos: [
    pend('3-1-zadeh', 'Las operaciones de Zadeh', ['1.2 Operaciones entre conjuntos difusos']),
    pend('3-2-leyes', 'Las leyes que se conservan', ['1.3 Propiedades de las operaciones difusas (1)']),
    pend('3-3-leyes-que-caen', 'Las leyes que caen', ['1.3 Propiedades de las operaciones difusas (2)']),
    pend('3-4-normas-t', 'Normas T', ['2.2.1 Normas T']),
    pend('3-5-normas-s', 'Normas S y dualidad', ['2.2.2 Normas S']),
    pend('3-6-complementos', 'Complementos', ['2.2.3 Complemento difuso']),
    pend('3-7-generadores', 'Generadores arquimedianos'),
    pend('3-8-parametrizados', 'Operadores parametrizados'),
  ] },
  { id: 4, titulo: 'Relaciones y extensión', lema: 'Cuando el grado une dos mundos.', posicion: [0.84, 0.54], conceptos: [
    pend('4-1-relaciones', 'Relaciones difusas', ['2.0 Otras operaciones difusas (contenido)', '2.1.1 Relaciones difusas']),
    pend('4-2-producto', 'Producto cartesiano', ['2.1.2 Producto cartesiano difuso']),
    pend('4-3-proyeccion', 'Proyección y extensión cilíndrica'),
    pend('4-4-composicion', 'Composición', ['2.1.3 Composición entre relaciones difusas']),
    pend('4-5-similitud', 'Similitud'),
    pend('4-6-extension-1d', 'Principio de extensión', ['2.3.1 Principio de extensión unidimensional']),
    pend('4-7-extension-nd', 'Extensión en varias variables', ['2.3.2 Principio de extensión multidimensional']),
    pend('4-8-numeros', 'Números difusos y su aritmética'),
  ] },
  { id: 5, titulo: 'Razonar', lema: 'Sacar conclusiones de lo que es casi cierto.', posicion: [0.5, 0.5], conceptos: [
    pend('5-1-clasica-difusa', 'Lógica clásica frente a difusa', ['3.0 Razonamiento difuso (contenido)', '3.1 Lógica clásica vs difusa']),
    pend('5-2-implicaciones', 'Implicaciones R, S y QL'),
    pend('5-3-linguistica', 'Variables lingüísticas y modificadores', ['3.2.1 Variable lingüística']),
    pend('5-4-reglas', 'Reglas si-entonces', ['3.2.2 Regla si-entonces']),
    pend('5-5-modus-ponens', 'Modus ponens generalizado', ['3.2.3 Modus ponens difuso']),
    pend('5-6-composicional', 'La regla composicional'),
    pend('5-7-ecuaciones', 'Ecuaciones relacionales'),
  ] },
  { id: 6, titulo: 'Sistemas', lema: 'De las reglas a una máquina que decide.', posicion: [0.16, 0.54], conceptos: [
    pend('6-1-mamdani', 'Mamdani'), pend('6-2-defuzzificacion', 'Defuzzificación'), pend('6-3-sugeno', 'Sugeno'),
    pend('6-4-tsukamoto', 'Tsukamoto'), pend('6-5-aproximacion', 'Aproximación universal'), pend('6-6-pendulo', 'El péndulo se sostiene'),
  ] },
  { id: 7, titulo: 'Aprender', lema: 'Reglas que se ajustan solas.', posicion: [0.3, 0.85], conceptos: [
    pend('7-1-c-medias', 'C-medias difusas'), pend('7-2-anfis', 'ANFIS'), pend('7-3-tipo-2', 'Conjuntos de tipo 2'), pend('7-4-celulas', 'Células de Concepto'),
  ] },
  { id: 8, titulo: 'Solo para valientes', lema: 'La lógica misma, sin red.', posicion: [0.72, 0.86], conceptos: [
    pend('8-1-bl', 'La lógica BL'), pend('8-2-lukasiewicz', 'Łukasiewicz, Gödel y producto'), pend('8-3-mtl', 'MTL'), pend('8-4-algebra', 'Semántica algebraica'), pend('8-5-completitud', 'Completitud'),
  ] },
];

export const todosLosConceptos = (cat = CATALOGO) => cat.flatMap((r) => r.conceptos);

export function buscarConcepto(id, cat = CATALOGO) {
  for (const region of cat) {
    const i = region.conceptos.findIndex((c) => c.id === id);
    if (i >= 0) return { region, concepto: region.conceptos[i], anterior: region.conceptos[i - 1] ?? null, siguiente: region.conceptos[i + 1] ?? null };
  }
  return null;
}
