# Penumbra

Un curso visual de lógica difusa: un camino por un terreno, de lo que tiene borde a lo que no. Funciona sin conexión.

```
./abrir-penumbra
```

Hace falta Python 3 para servirlo y un navegador con WebGL2. Sin WebGL2, el texto y los retos sin escena siguen disponibles.

## Cómo está hecho

- `contenido/catalogo.js`: las 8 regiones y sus paradas. `contenido/parte1/*.js`: un concepto por archivo. `contenido/glosario.js`: toda palabra técnica.
- `nucleo/`: matemáticas, progreso y calificación, sin navegador.
- `motor/`: una escena es una función pura `(paso, p, entradas) → primitivas`, en coordenadas del modelo. La dibujan tres renderizadores: 3D y niebla en WebGL2, y plano en Canvas 2D.

## Añadir un concepto

1. Crea `contenido/parteN/<id>.js` y regístralo en el catálogo, con sus retos.
2. En `entender`, el orden es fijo: idea → ejemplo con números → símbolos leídos pieza a pieza → definición formal. Las palabras técnicas van entre `[[ ]]`.
3. Toda línea se define por puntos del modelo: una prueba comprueba que cada extremo cae sobre algo.

## Pruebas

```
node --test 'tests/*.test.mjs'
node tests/navegador.mjs [filtro]
```

Las de navegador usan `playwright-core` instalado en `.superpowers/dev/` y el Chromium de `~/.cache/ms-playwright`.

## Fuentes

El alcance sale de los títulos del curso en vídeo de Hackeando Tec. El contenido se contrasta con Zimmermann, *Fuzzy Set Theory and Its Applications* (4.ª ed.), Klir y Yuan, y los temarios de CTU Praga, TU Dresden y UNAM; cada concepto cita las suyas. Las explicaciones son propias.
