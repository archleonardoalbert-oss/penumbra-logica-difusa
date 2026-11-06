// Toda palabra técnica se explica aquí: en palabras, y con un ejemplo. Nada se da por sabido.
const R = String.raw;
export const GLOSARIO = {
  conjunto: { titulo: 'Conjunto', texto: 'Una colección de cosas: a cada cosa le preguntamos si está o no está.', ejemplo: 'Los días de la semana que empiezan por «m»: martes y miércoles.' },
  universo: { titulo: 'Universo', texto: 'Todo aquello de lo que estamos hablando en este momento. Lo que no esté aquí, ni se considera.', ejemplo: 'Si hablamos de alturas de personas, el universo son las alturas posibles, no los colores.' },
  funcion: { titulo: 'Función', texto: 'Una regla que, a cada cosa que le das, le responde con un solo resultado.', ejemplo: R`«El doble de»: le das 3, responde 6. Se escribe $f(3) = 6$.` },
  intervalo: { titulo: 'Intervalo', texto: 'Todos los números que hay entre dos dados, incluidos los decimales.', ejemplo: R`$[0, 1]$ contiene $0$, $0{,}5$, $0{,}731$ y $1$. Con corchete, el extremo cuenta. Con paréntesis, $(0, 1)$, no.` },
  grado: { titulo: 'Grado de pertenencia', texto: 'Un número de 0 a 1 que dice cuánto pertenece algo a un conjunto. 0 es nada, 1 es del todo.', ejemplo: 'Una persona de 1,74 m podría tener grado 0,23 en «alto».' },
  clasico: { titulo: 'Conjunto clásico', texto: 'El de toda la vida: cada cosa está dentro o fuera, sin términos medios. También se le llama «certero» o «nítido».', ejemplo: 'Los números pares: el 4 está, el 5 no.' },
  supremo: { titulo: 'Supremo', texto: 'El techo más bajo de un grupo de números: nadie lo supera, y no hay otro techo menor. Se parece al máximo, pero nadie del grupo tiene por qué alcanzarlo.', ejemplo: R`En $0{,}9$; $0{,}99$; $0{,}999$… el supremo es $1$, aunque ninguno vale 1. Se escribe $\sup$.` },
  subnormal: { titulo: 'Subnormal', texto: 'Un conjunto difuso en el que nada llega a pertenecer del todo: ningún grado alcanza 1.', ejemplo: 'Grados 0,2; 0,6; 0,3: el mayor es 0,6.' },
  implicacion: { titulo: 'Si y solo si', texto: 'Las dos cosas van juntas: si pasa una, pasa la otra, y al revés.', ejemplo: 'Un número es par si y solo si termina en 0, 2, 4, 6 u 8.' },
  demostracion: { titulo: 'Demostración', texto: 'Un razonamiento en el que cada paso sale de lo anterior o de una definición, de modo que nadie pueda negar el final.', ejemplo: 'Si $x$ es par, $x = 2k$; entonces $x + 2 = 2(k + 1)$, que también es par.' },
};
