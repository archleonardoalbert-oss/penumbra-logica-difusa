# fuzzython: documentación interna

Documentación que el proyecto no tiene, sacada de leer todo su código. Es material de trabajo: todavía no forma parte del curso.

- **Qué se ha leído:** todo el código, salvo `store/FCLLexer.py` y `store/FCLParser.py`, que ANTLR genera a partir de `store/FCL.g` (esa gramática sí). Versión: commit `9650204` (2018-05-02), con el código casi igual desde 2013. `v0.1.0` es su única versión. PyPI también lista `Fuzzython 0.1.0`.
- **Autores:** Carloluis Evelio Rodríguez Pérez, Yudivián Almeida Cruz y Nayla López Gil (MATCOM, Universidad de La Habana).
- **Licencia:** tipo BSD: permite redistribuir conservando el aviso de copyright. Antes de copiar código, leer `LICENSE`.

> **Estado de la verificación (2026-11-06).** Ejecutado con Python 3.14 y `verifica.py`. **Se confirman los ejemplos de la sección 2 y los fallos F1–F5, F7–F11 y F13–F19, además de F12 en `ACT` y F21; F6 se confirma por sus efectos.** Sigue sin ejecutarse la lectura de FCL (`store/reader.py`), porque requiere el runtime `antlr3` con el parche que indica su código: lo que dice la sección 9 sobre leer FCL, y F23, son de lectura. `dump_()` sí se ejecutó. F20 se ve en el `MM` de la sección 2.2. El fallo de `AND` en F12 es también de lectura. F22 se ejecutó el 2026-11-07 (ver tabla).

---

## 1. En una página

fuzzython construye **sistemas de inferencia difusa** de tipo Mamdani, Sugeno y Tsukamoto. Se pueden describir en Python, con reglas escritas como texto, o en un archivo FCL (*Fuzzy Control Language*, de la norma IEC 61131-7), con extensiones propias.

```
Conjunto difuso (fsets/)      forma de la función de pertenencia
   └─ Adjetivo (adjective)    nombre + conjunto:  «caliente»
        └─ Variable (variable) nombre + adjetivos + método de desdifusión
             └─ Predicado (predicate)  «temp is caliente»
                  └─ Operadores (operators/)  árbol AND / OR / NOT
                       └─ Regla (rules/)      SI árbol ENTONCES consecuente, con peso
                            └─ Bloque (ruleblock)  reglas + normas compartidas
                                 └─ Sistema (systems/)  compute(entradas)

Normas (norms/)      T, S y complementos; se buscan por nombre
Intervalo (interval) el dominio donde se integra y se busca el máximo
FCL (store/)         lee archivos FCL; System.dump() los escribe
```

### Estructura de carpetas

| Ruta | Contenido |
|---|---|
| `fsets/` | `FuzzySet` y sus 10 formas |
| `norms/norms.py` | las normas y `get_norm` |
| `norms/max1.py` | ejemplo de norma añadida en su propio archivo |
| `operators/` | `And`, `Or`, `Not`, y el analizador de antecedentes |
| `rules/` | `Rule`, `MRule`, `SRule`, `TRule`, y el analizador de reglas |
| `systems/` | `System`, `MamdaniSystem`, `SugenoSystem`, `TsukamotoSystem` |
| `store/` | gramática ANTLR, lexer y parser generados, y `reader.py` |
| `adjective.py`, `variable.py`, `predicate.py`, `ruleblock.py`, `interval.py`, `utils.py` | módulos sueltos en la raíz |
| `sample.py` | el único ejemplo del proyecto |

No hay pruebas automáticas ni documentación, aparte del README y de los comentarios.

---

## 2. Empezar

### 2.1 Instalar: el primer obstáculo

Ni `pip install` ni `import fuzzython` son la vía práctica:

- Los módulos se importan como `from fsets.fuzzy_set import ...` o `from interval import ...`, de modo que **la raíz del repositorio tiene que estar en `sys.path`**.
- `setup.py` usa `find_packages()`, que no incluye los módulos sueltos de la raíz, e importa `distutils`, retirado en Python 3.12.
- **`compute()` usa `time.clock`, retirado en Python 3.8.** Los tres sistemas llevan el decorador `@timer` en `compute`, así que en un Python actual todos fallan al calcular.
- `antlr3` (solo para leer FCL) no está declarado como dependencia, y `store/reader.py` avisa de un error de la versión 3.5 que hay que corregir a mano.

Arranque mínimo, sin tocar el repositorio:

```python
import sys, time
time.clock = time.perf_counter           # sustituye lo que Python retiró en 3.8
sys.path.insert(0, 'ruta/a/fuzzython')   # la raíz del repositorio
```

### 2.2 Mamdani completo

```python
from adjective import Adjective
from fsets.polygon import Polygon
from fsets.trapezoid import Trapezoid
from ruleblock import RuleBlock
from systems.mamdani import MamdaniSystem
from variable import Variable

cold   = Adjective('cold',   Polygon((0, 1), (15, 1), (20, 0)))
normal = Adjective('normal', Trapezoid((15, 0), (20, 1), (30, 1), (35, 0)))
hot    = Adjective('hot',    Polygon((30, 0), (35, 1), (40, 1)))
temp   = Variable('temp', '°C', cold, normal, hot)     # la unidad es obligatoria para poder pasar adjetivos

short = Adjective('short', Polygon((0, 1), (10, 1), (15, 0)))
usual = Adjective('usual', Trapezoid((10, 0), (15, 1), (25, 1), (30, 0)))
large = Adjective('large', Polygon((25, 0), (30, 1), (40, 1)))
minutes = Variable('minutes', 'min', short, usual, large, defuzzification='COG', default=0)

scope = locals()     # las reglas nombran objetos de este diccionario
block = RuleBlock('first', operators=('MIN', 'MAX', 'ZADEH'), activation='MIN', accumulation='MAX')
block.add_rules(
    'if temp is cold or temp is normal then minutes is short with 0.5',
    'if temp is normal then minutes is usual',
    'if temp is hot then minutes is large',
    scope=scope)

MamdaniSystem('ms1', block).compute({'temp': 33})
```

**Qué calcula, con `temp = 33`:**

| Paso | Cuenta | Resultado |
|---|---|---|
| Pertenencia | `normal(33)` $= \frac{35 - 33}{5}$, `hot(33)` $= \frac{33 - 30}{5}$, `cold(33)` | $0{,}4$; $0{,}6$; $0$ |
| Regla 1 | $\max(0;\ 0{,}4) \cdot 0{,}5$ | `short` $= 0{,}2$ |
| Regla 2 | $0{,}4$ | `usual` $= 0{,}4$ |
| Regla 3 | $0{,}6$ | `large` $= 0{,}6$ |
| Activación | cada conjunto se recorta a su fuerza | |
| Acumulación | máximo de los tres recortes | área $16{,}2$ |
| Desdifusión | centro de gravedad | $\approx 24{,}144$ |

**Salida obtenida:** `{'first': {'minutes': 24.144...}}`. Es un diccionario de bloques, y dentro, de variables.

Otros métodos sobre el mismo conjunto, ejecutados y coincidentes con el cálculo independiente de `propio.py`:

| Método | Obtenido | Nota |
|---|---|---|
| `COG` | $24{,}144$ | |
| `COA` | $26{,}0$ | |
| `LM`, `RM`, `CM` | $28$, $40$, $34$ | |
| `MM` | $32{,}667$ | Promedia solo vértices ($28, 30, 40$); la media real de la meseta es $34$ |

Con `activation='PROD'` (Larsen): `COG` $\approx 24{,}416$; `COA` $\approx 26{,}02$.

### 2.3 Sugeno

```python
from systems.sugeno import SugenoSystem
block = RuleBlock('second', operators=('MIN', 'MAX', 'ZADEH'), activation='MIN')
block.add_rules(
    'if temp is cold then z = temp*0.1',
    'if temp is normal then z = temp*0.3 + 1',
    'if temp is hot then z = temp*0.6 + 2',
    scope=scope)
SugenoSystem('ss1', block).compute({'temp': 33})
```

Obtenido: `{'second': 17.44}`, porque $\frac{0{,}4 \cdot 10{,}9 + 0{,}6 \cdot 21{,}8}{0{,}4 + 0{,}6} = 17{,}44$. El resultado se indexa **por bloque**, y la `z` se descarta: es solo un adorno de la sintaxis.

### 2.4 Tsukamoto

Las reglas llevan el prefijo `t:`. Los consecuentes deben ser **monótonos**:

```python
from systems.tsukamoto import TsukamotoSystem
short = Adjective('short', Polygon((0, 1), (15, 1), (25, 0)))
large = Adjective('large', Polygon((15, 0), (25, 1), (40, 1)))
minutes = Variable('minutes', 'min', short, large, defuzzification='COG', default=0)
scope = locals()
block = RuleBlock('third')
block.add_rule('t:if temp is cold then minutes is short', scope)
block.add_rule('t:if temp is normal then minutes is large with 0.5', scope)
block.add_rule('t:if temp is hot then minutes is large', scope)
TsukamotoSystem('tsk', block).compute({'temp': 33})
```

Obtenido: `{'third': 20.00000007}` (bisección con tolerancia), porque $\frac{0{,}2 \cdot 17 + 0{,}6 \cdot 21}{0{,}8} = 20$.

---

## 3. Cómo calcula: los tres modelos

Los tres hacen `reset()`, luego `fuzzify(entradas)`, y luego lo suyo. **`fuzzify` no calcula grados**: solo guarda el valor en `variable.value`. Los grados se calculan al evaluar cada regla.

| | Mamdani | Sugeno | Tsukamoto |
|---|---|---|---|
| Clase de regla | `MRule` | `SRule` | `TRule` |
| Consecuente | lista de predicados | texto con una expresión | un predicado monótono |
| Fuerza de la regla | antecedente $\cdot$ peso | igual | igual |
| Por regla | recorta el conjunto de salida | evalúa la expresión con `eval` | busca el $x$ con $\mu(x) = w$, por bisección |
| Combina | `ACCU` y desdifusión | $\frac{\sum_r w_r z_r}{\sum_r w_r}$ | $\frac{\sum_r w_r x_r}{\sum_r w_r}$ |
| Salida | `{bloque: {variable: valor}}` | `{bloque: valor}` | `{bloque: valor}` |
| Si nada dispara | el `default` de la variable, e imprime un error | `0` | `0` |
| Usa `outputs=` | sí: `{nombre: Variable}` | no | no |

### Dos detalles que cambian resultados

1. **El peso multiplica.** $w_r = \text{antecedente} \cdot \text{peso}$. En Tsukamoto, ese producto también decide el $x$, de modo que el peso cambia dos cosas a la vez: dónde cae $x$ y cuánto pesa.
2. **`ACCU` no actúa entre reglas con el mismo adjetivo.** La fuerza del adjetivo se queda con el máximo (`adjective.py:56`), sea cual sea `accumulation`. Las reglas 1 y 2 sobre `usual` se combinan siempre con máximo; `ACCU` solo opera entre adjetivos distintos. Con `BSUM` no se obtiene la suma acotada que dicta la teoría.

### Estado compartido

La fuerza y el conjunto activado viven **dentro del `Adjective`**. Por eso un sistema no es seguro con hilos, y dos sistemas que comparten adjetivos o variables se interfieren. Tampoco lo evita `compute`: solo resetea los de sus propios bloques.

---

## 4. Referencia: conjuntos difusos (`fsets/`)

### 4.1 `FuzzySet`: la base

```python
FuzzySet(function, interval, tnorm=None, snorm=None, cnorm=None)
```

`function` es cualquier función de un número. `interval` es un `Interval`, donde se integra y se busca el máximo. Por defecto: `MIN`, `MAX`, `ZADEH`.

| Grupo | Métodos | Notas |
|---|---|---|
| Pertenencia | `s(x)`, `s.membership(x)` | |
| Conjuntos | `intersect`, `union`, `complement`, y `&`, `\|`, `~` | Admiten otra norma |
| Varios a la vez | `FuzzySet.conjunction(*s, tnorm=)`, `disjunction(*s, snorm=)` | Con `reduce` |
| Grado con otro conjunto | `fuzzify_with(otro)` | $\sup_x T(\mu(x), \mu'(x))$, en 100 muestras |
| Desdifusión | `COG`, `COA`, `CM`, `MM`, `LM`, `RM` | La sección 6 las detalla |
| Con un número o función | `activate(norma, v)`, `minimize`, `maximize` | Lo que usa la activación |
| Aritmética | `+ - * / **`, también por la derecha | Punto a punto. El resultado puede salir de $[0, 1]$; no se comprueba |
| Numéricos | `area(res)`, `area_(a, b)`, `coordinates(res)` | Trapecios; 100 tramos por defecto (`_RESOLUTION_`) |

### 4.2 Las formas

| Clase | Constructor | Fórmula o forma | Intervalo |
|---|---|---|---|
| `Polygon` | `Polygon((x, y), ...)` | Tramos rectos, ordenados. Fuera, constante | Del primer al último $x$ |
| `Trapezoid` | `Trapezoid(a, b, c, d)`, puntos `(x, y)` | Cuatro puntos | $[a_x, d_x]$ |
| `Triangular` | `Triangular(a, b, c=None)`, o `built_from(xmin, xmid, xmax, ymin=0, ymax=1)` | Sin `c`, simétrico | $[a_x, c_x]$ |
| `Gaussian` | `Gaussian(center, width, height=1)` | $h\, e^{-\frac{(x - c)^2}{2 w^2}}$ | $[c - w,\ c + w]$ |
| `Gamma` | `Gamma(value, k, interval)` | $0$ si $x \le v$; si no, $1 - e^{-k (x - v)^2}$ | El que se dé |
| `Singleton` | `Singleton(x=0.0, y=1.0)` | $y$ solo en $x$ | $[x, x]$ |
| `SFunction` | `SFunction(a, b, c)`; `a` y `c` puntos, `b` número | Cuadrática en S | $[a_x, c_x]$ |
| `ZFunction` | Igual, ver abajo | $1 - S(x)$ | $[a_x, c_x]$ |
| `PiFunction` | `PiFunction(center, delta, min_=0, max_=1)` | S hasta el centro, Z después | $[c - \delta,\ c + \delta]$ |
| `Polynomial` | `Polynomial(*coef, interval=)`, de mayor a menor | Horner invertido | El que se dé |

**Cuidado con cada una:**

- **`Gamma`:** su comentario la describe como una V; el código la hace de un solo lado. El nombre no corresponde a la función Γ clásica.
- **`Gaussian`:** su intervalo cubre solo $\pm 1$ desviación. Al recortarla, el resultado se integra solo ahí. Y aunque se haya construido con `height`, todas sus desdifusiones devuelven `center`.
- **`ZFunction`:** el comentario dice que `a` es el máximo, pero la fórmula es $1 - S$. Para que baje de 1 a 0 hay que pasar `a=(ax, 0)` y `c=(cx, 1)`, al contrario de lo que dice.
- **`SFunction`:** `b` solo decide dónde se cambia de rama, y la fórmula no lo usa. Si $b$ no está en el centro de $[a_x, c_x]$, la curva da un salto. Las coordenadas `y` solo actúan fuera del intervalo.
- **`Polygon`:** fuera de sus puntos, se prolonga **constante**, no vale 0. `Polygon((0, 1), (10, 0.5))(-5)` da $1$.
- **`Trapezoid` y `Triangular`:** `add_point`, `add_points` y `clear` **devuelven otro objeto** y no cambian el original; en `Polygon` sí lo cambian.
- **Grado de `Polynomial`:** `grade` es el número de coeficientes, no el grado matemático: $x^2$ da 3.

### 4.3 Solo en `Polygon` y `Polygon.Rect`

`Polygon` calcula de forma **exacta** lo que `FuzzySet` aproxima: integra cada tramo, y `merge_points` añade los cruces entre dos polígonos, de modo que `&` y `|` dan otro polígono sin perder precisión. Además: `create_from(f, a, b, sampling)` (muestrear cualquier función), `clear`, `get_polygon`, y el acceso `p[i]`.

`Polygon.Rect(m, n)` es la recta $y = m x + n$, con `build_from(p1, p2)`, `intersect`, `get_x(y)`, `area(a, b)`.

---

## 5. Referencia: normas (`norms/norms.py`)

| Nombre | Fórmula | Función | ¿Es norma de verdad? |
|---|---|---|---|
| `MIN` | $\min(x, y)$ | `minimum` | Sí; admite más argumentos |
| `PROD` | $x y$ | `algebraic_product` | Sí |
| `BDIF` | $\max(0, x + y - 1)$ | `bounded_difference` | Sí (Łukasiewicz) |
| `DPROD` | $y$ si $x = 1$; $x$ si $y = 1$; si no, $0$ | `drastic_product` | Sí |
| `EPROD` | $\frac{x y}{1 + (1 - x)(1 - y)}$ | `einstein_product` | Sí |
| `FAND` | $(1 - p) \min(x, y) + p \frac{x + y}{2}$; $p = 0{,}5$ | `fuzzy_and` | **No**: `FAND(0,5; 1)` da $0{,}625$, no $0{,}5$ |
| `MAX` | $\max(x, y)$ | `maximum` | Sí |
| `ASUM` | $x + y - x y$ | `algebraic_sum` | Sí |
| `BSUM` | $\min(1, x + y)$ | `bounded_sum` | Sí |
| `DSUM` | Dual de `DPROD` | `drastic_sum` | Sí |
| `ESUM` | $\frac{x + y}{1 + x y}$ | `einstein_sum` | Sí |
| `FOR` | $p \max(x, y) + (1 - p) \frac{x + y}{2}$ | `fuzzy_or` | **No**: tampoco tiene neutro $0$ |
| `NSUM` | $\frac{x + y}{\max(1, x + y)}$ | `normalised_sum` | Sí, pero con dos argumentos **es igual a `BSUM`**: si $x + y \ge 1$ da $1$, y si no, $x + y$. No normaliza sobre todas las reglas, como hace la `NSUM` de la literatura |
| `ZADEH` | $1 - x$ | `zadeh_complement` | Complemento |
| `SUGENO` | $\frac{1 - x}{1 + \lambda x}$; $\lambda = 0$ | `sugeno_complement` | Complemento |
| `YAGER` | $(1 - x^w)^{\frac{1}{w}}$; $w = 1$ | `yager_complement` | Complemento |

- **Pares que se completan solos en FCL:** `MIN–MAX`, `PROD–ASUM`, `BDIF–BSUM`, `DPROD–DSUM`, `EPROD–ESUM`, `FAND–FOR`.
- **Parámetros:** por nombre, `SUGENO` y `YAGER` usan siempre $\lambda = 0$ y $w = 1$, así que **ambos equivalen a `ZADEH`**. Para otro parámetro hay que asignar una función a `block.not_` antes de añadir las reglas, porque `add_rule` copia la norma al crear los nodos.
- **`get_norm(nombre)`:** busca por nombre registrado o por nombre de la función en Python. Si no la encuentra, importa `norms.<nombre en minúsculas>`. Y si tampoco, **imprime un aviso y devuelve `None`**: no lanza ningún error (ver F12).

---

## 6. Referencia: desdifusión

Se elige con el texto de `defuzzification`, en mayúsculas exactas. `Variable.defuzzify` hace `getattr(conjunto, método)()`, así que cualquier método sin argumentos serviría.

| Nombre | Significado | `FuzzySet` | `Polygon` |
|---|---|---|---|
| `COG` | $\frac{\int x\, \mu(x)\, dx}{\int \mu(x)\, dx}$ | Trapecios, 100 tramos | Exacto |
| `COA` | $x$ que parte el área en dos | Bisección, con tolerancia $10^{-7}$ en áreas | Bisección con áreas exactas |
| `LM` | Primer máximo | Muestreado | Entre vértices |
| `RM` | Último máximo | Muestreado; nunca mira $x = b$ | Entre vértices |
| `CM` | $\frac{LM + RM}{2}$ | Heredado | Heredado |
| `MM` | Media de los puntos de máximo | Muestreado | **Solo vértices**: sesgado, ver 2.2 |
| `COGS` | $\frac{\sum_i s_i w_i}{\sum_i w_i}$ | Solo `Singleton`: lo hace `Variable.defuzzify` y omite los demás | |

**Si algo falla aquí, no se entera nadie.** `Variable.defuzzify` envuelve todo en un `except Exception` que imprime el error y devuelve `default`, que es `None` si no se fijó. Un error real y «ninguna regla disparó» dan la misma salida. Revisar lo que imprime.

---

## 7. Referencia: reglas en Python

### Gramática

```
regla         ->  [prefijo ':'] 'if' antecedente ' then ' consecuente
prefijo       ->  's' | 't'            (sin él: se decide por el contenido)
consecuente   ->  salida 'is' adj {',' salida 'is' adj} ['with' peso]     Mamdani
                | nombre '=' expresión ['with' peso]                      Sugeno
antecedente   ->  término {'or' término}
término       ->  factor {'and' factor}
factor        ->  var 'is' ['not'] adj | '(' antecedente ')' | 'NOT' '(' antecedente ')'
```

`and` tiene preferencia sobre `or`.

### Las sutilezas

| Elemento | Regla real |
|---|---|
| `if`, ` then `, `with`, `is` del consecuente | Solo en **minúsculas**; ` then ` con un espacio a cada lado |
| `and`, `or`, `is`, `not` del antecedente | Cualquier mayúscula |
| `NOT (` | **Solo en mayúsculas**: `not (` da error, y `is not` funciona en cualquier forma |
| Nombres | Son **claves de `scope`**, no el `.name` de los objetos. Dos variables no pueden tener un adjetivo `low` con el mismo nombre de Python |
| Separación | Por espacios: `temp is(hot)` no funciona como se espera |
| ¿Sugeno o Mamdani? | Si `is` no aparece **como texto** en el consecuente, es Sugeno (F9) |
| Consecuente negado | Da error: no se permite |
| Peso | Afecta a toda la regla, aunque vaya tras una salida; el último gana. `with 2` se acepta sin comprobar; en cambio, `rule.weight = 2` se ignora en silencio |
| Sugeno: variables | **Solo las del antecedente de esa regla**, por el `eval` (F8) |
| Sugeno: operaciones | `+ - * /`, también entre variables. No `**` ni `-x` |
| `t:` | Obligatorio con `TsukamotoSystem`: sin él, se crea una `MRule` y el sistema falla al desempaquetar |
| Sistema equivocado | Una regla Sugeno en Mamdani no aporta salida. Una Mamdani en Sugeno lanza un error |

### API

- **`Rule.parse(texto, scope, tnorm, snorm, cnorm)`:** el analizador; **las normas se pasan aquí**.
- **`Rule.get_rule(antecedente, consecuente, peso)`:** elige la clase según el tipo del consecuente: `list` da `MRule`; `Predicate` da `TRule`; otra cosa, `SRule`.
- **`RuleBlock(nombre, operators=(AND, OR, NOT), activation='MIN', accumulation='MAX')`:** con `add_rule(texto, scope)`, `add_rules(*textos, scope=)` y `addrule(objeto)`.
- **Consultas:** `input_vars`, `output_vars`, `inputs`, `outputs`, `predicates`, `output_adj`. `input_adj` falla con árboles (F13).
- **Árbol a mano:** `And(p, q)`, `Or(p, q)`, `Not(p)`, con `Predicate(var, adj)`; se inspecciona con `print_tree()`, `leaves()` y `evaluate()`.

---

## 8. Entradas difusas: la función que el README no menciona

`Predicate.evaluate` llama a `Adjective.membership`, y si el valor es un `FuzzySet`, usa `fuzzify_with`. Por tanto, se puede pasar un conjunto como entrada:

```python
mamdani.compute({'temp': Triangular((30, 0), (33, 1), (36, 0))})   # «unos 33 grados»
mamdani.compute({'temp': Singleton(33, 0.5)})                      # 33, con grado 0,5
```

Con el ejemplo de 2.2 dan $23{,}255$ y $23{,}348$, frente a $24{,}144$ de la entrada exacta.

El grado es $\sup_x T(\mu_A(x), \mu_{\text{entrada}}(x))$: la composición sup-min de la inferencia composicional. Entre polígonos se calcula exacto; en otros casos, con 100 muestras. En Sugeno solo sirve para el antecedente: si la expresión del consecuente usa esa variable, falla, porque `float()` no admite un conjunto.

---

## 9. FCL: archivos de sistema

```python
from store.reader import load_from_file, load_from_string
sistema = load_from_file('sistema.fcl')     # devuelve None si falla, e imprime el error
sistema.dump('salida.fcl')
```

```
FUNCTION_BLOCK _SUGENO_ nombre           (* tipo opcional; sin él, Mamdani *)
    VAR_INPUT temp: REAL; END_VAR
    VAR_OUTPUT tiempo: REAL; END_VAR

    FUZZIFY temp
        TERM frio := (0, 1) (15, 1) (20, 0);
        TERM medio := Trapezoid((15, 0), (20, 1), (30, 1), (35, 0));
    END_FUZZIFY

    DEFUZZIFY tiempo
        TERM corto := (0, 1) (10, 1) (15, 0);
        METHOD: COG;
        DEFAULT := 0;                    (* obligatorio; NC significa «ninguno» *)
    END_DEFUZZIFY

    RULEBLOCK primero
        AND: MIN;                        (* el par OR se completa solo *)
        ACT: MIN;
        ACCU: MAX;                       (* obligatorio *)
        RULE 1: IF temp IS frio THEN tiempo IS corto WITH 0.5;
    END_RULEBLOCK
END_FUNCTION_BLOCK
```

| Extensión o diferencia | Detalle |
|---|---|
| Tipo de sistema | `_SUGENO_`, `_TSUKAMOTO_`, y `_MAMDAMI_`, **con esa errata**; `_MAMDANI_` no se reconoce |
| Conjuntos con nombre | `Nombre(params)`: importa `fsets.<nombre en minúsculas>` y construye la clase |
| Parámetros admitidos | Números o pares `(x, y)` |
| Consecuentes Sugeno | Expresiones con `+ - * ** / //` |
| Norma | Cualquier identificador que `get_norm` encuentre |
| Comentarios | `(* ... *)` |
| Números | Sin exponente: `1e-5` no es válido |
| `RANGE` | Se lee y **se descarta** |
| Sin `ACT` en Mamdani | Sin activación: todas las salidas dan `default` (F12) |

**`dump()` no siempre puede volver a leerse:**

- Solo escribe `AND`, `ACT` y `ACCU`: se pierden `OR` y `NOT` si no son el par por defecto.
- `Trapezoid` y `Triangular` se escriben como puntos, y vuelven como `Polygon`.
- `Gaussian` y `Gamma` escriben su `Interval`, que la gramática no admite.
- `str(Polynomial)` lanza un error.
- `default=None` no escribe `DEFAULT`, que es obligatorio.

---

## 10. Cómo se extiende

| Quiero añadir | Pasos |
|---|---|
| **Una norma** | Decorar con `@norm(type_='SNORM', name='MIA')`. Ponerla en `norms/norms.py`, o en `norms/mia.py`, con el nombre del archivo igual al de la norma en minúsculas. `get_norm('MIA')` ya la encuentra |
| **Un conjunto** | Heredar de `FuzzySet`; llamar a `super().__init__(None, intervalo)`; definir `__call__`, y **también `membership = __call__`** (F4). Para usarlo desde FCL: archivo `fsets/<clase en minúsculas>.py`, y un `__str__` que FCL entienda |
| **Una desdifusión** | Un método sin argumentos en `FuzzySet`, y `defuzzification='MI_METODO'` |
| **Un modelo de inferencia** | Heredar de `System` e implementar `inference` y `compute`; si hace falta, una clase de `Rule` con su `compute`. Para FCL: tocar `get_system` en `FCL.g` y regenerar con ANTLR |

---

## 11. Fallos encontrados

Severidad: **alta** si impide o falsea un cálculo normal, **media** si afecta a una función concreta, **baja** si es una rareza.

| Id | Lugar | Qué pasa | Efecto | Severidad |
|---|---|---|---|---|
| F1 | `utils.py:29,31` | `time.clock` no existe desde Python 3.8 | Todo `compute()` lanza `AttributeError` | **Alta** |
| F2 | `fsets/trapezoid.py:50,56,62,68` | `sum(b[0]+c[0])` suma un número, no una lista: lanza `TypeError` | `COG`, `COA`, `CM` y `MM` de un trapecio de meseta plana fallan. Con `PROD` y una sola regla activa, la salida es `default`, sin aviso claro | **Alta** |
| F3 | `fsets/pifunction.py:33` | Pasa números a `SFunction`, que espera puntos | `PiFunction` no se puede evaluar | **Alta** |
| F4 | `fsets/sfunction.py:44`, `singleton`, `pifunction` | `membership = __call__` se enlaza a la clase donde está escrito | `ZFunction.membership` da la S; `Singleton.membership` y `PiFunction.membership` dan siempre $0$. `fuzzify_with` usa `membership` | **Alta** para entradas difusas |
| F5 | `fsets/sfunction.py:73,81` | `_operation` con un número solo cambia los extremos, y crea siempre una `SFunction` | `minimize` no recorta la S; en `ZFunction` devuelve una S. **Mamdani con estas formas da resultados falsos sin avisar** | **Alta** |
| F6 | `variable.py:70` | `except Exception` y `print` | Cualquier error en la desdifusión se convierte en `default` | **Alta** para depurar |
| F7 | `adjective.py:56` | La fuerza de un mismo adjetivo se combina con máximo | `ACCU` no se aplica entre reglas con igual consecuente (sección 3) | **Media**: diseño discutible |
| F8 | `rules/srule.py:15,28,31` | `eval` usa solo las variables del antecedente, y **ejecuta cualquier código** | `NameError` si el consecuente usa otra entrada. **Nunca cargar reglas ni FCL de origen desconocido** | **Alta** |
| F9 | `rules/parser.py:35` | `not IS in then_` busca «is» como texto | `z = dist*2` se toma por Mamdani y falla. Afecta a cualquier nombre que contenga «is» | **Media** |
| F10 | `fsets/fuzzy_set.py:108,395` | `complement` y `coordinates` usan `self.function`, que es `None` en las subclases | `~Gaussian(...)` falla al evaluarse | **Media** |
| F11 | `fsets/polygon.py:59` | Ignora el argumento `cnorm` | `complement(mi_norma)` usa la del objeto | **Media** |
| F12 | `norms/norms.py`, `get_norm` | Devuelve `None` si no encuentra la norma | Una errata en `AND` cae a `MIN` sin error; en `ACT`, todo da `default` | **Media** |
| F13 | `rules/rule.py:50` | Errata: `p.adective` | `input_adj()` falla si el antecedente es un árbol | **Baja** |
| F14 | `fsets/polynomial.py:18,189` | Falta importar `Interval`; `join` sobre números | `Polynomial(..., interval=(a, b))` y `str(p)` fallan | **Media** |
| F15 | `interval.py:47` | `(max - min) / 2` | `middle` da la mitad del ancho, no el punto medio. Nadie lo usa dentro | **Baja** |
| F16 | `interval.py:164` | Compara `_min` dos veces | `Interval(2, 4) == (2, 4)` da `False` | **Baja** |
| F17 | `fsets/fuzzy_set.py:222…393` y `interval.py` | Una unión disjunta da un `Compound`, cuyo `__iter__` produce intervalos | Entre conjuntos no poligonales, `a, b = self.interval` rompe `COG` y similares. La salida es `default` por F6 | **Alta** con gaussianas separadas |
| F18 | `Polygon.union` | Une los puntos de ambos con rectas | Dos polígonos separados de borde no nulo inventan área en el hueco | **Media** |
| F19 | `fsets/fuzzy_set.py` | `a += step` acumula error de redondeo | `area` puede dar un paso de más: el área de $1$ en $[0, 1]$ da $1{,}143$ con resolución 7 y $1{,}1$ con 10. Con la de por defecto, 100, el error es despreciable. `Polygon` no acumula | **Media** con resolución baja |
| F20 | `Polygon.MM` | Promedia vértices | Mesetas con vértices desiguales dan un valor sesgado (2.2) | **Media** |
| F21 | Borde vertical | `Rect.build_from` divide por $x_2 - x_1$ | `Trapezoid((0, 0), (0, 1), ...)` lanza `ZeroDivisionError`. Para una pared, usar `Polygon((0, 1), ...)`, que se prolonga constante | **Media** |
| F22 | `TRule.get_strength_x` | Bisección que supone monotonía | Con consecuente no monótono, el resultado es arbitrario, sin error. Ejecutado: con `Polygon((0, 0), (20, 1), (40, 0))` da `0` a 17, 18 y 19 grados | **Media** |
| F23 | `store/FCL.g:87,158,287,303,305` | `_MAMDAMI_`; `ACT` opcional sin valor por defecto; `WITH nombre` usa un `scope` inexistente; `RANGE` se descarta | Sección 9 | **Media** |

| F24 | `fsets/*.py` | Los dibujos ASCII de los comentarios contienen `\\_` | Python 3.14 avisa con `SyntaxWarning`; en una versión futura será un error de sintaxis | **Baja** |

Además, sin ser fallos: `README` escribe «Mandani», y `SUGENO`/`YAGER` por nombre son `ZADEH` disfrazados (sección 5).

---

## 12. Recetas para no tropezar

1. **Usar `Polygon` para todo**, también trapecios y triángulos si se va a desdifusar directamente: es exacto y evita F2, F3, F5 y F17.
2. **Fijar siempre `defuzzification` y `default`** en las salidas, y usar un `default` imposible, como `float('nan')`, para distinguir un error de un resultado.
3. **No usar `ZFunction`, `SFunction` ni `PiFunction` en consecuentes de Mamdani.** Para esas formas: `Polygon.create_from(f, a, b, 100)`.
4. **Escribir las reglas en minúsculas**, salvo `NOT (`. Y evitar nombres que contengan «is».
5. **En Sugeno, poner en el antecedente** todas las variables de la expresión.
6. **Un `RuleBlock` y un conjunto de `Adjective` por sistema.**
7. **No cargar FCL ni reglas de nadie en quien no se confíe**: se ejecutan con `eval`.

---

## 13. Comparación con lo que dice la teoría

| Tema | Teoría | fuzzython |
|---|---|---|
| Acumulación | Sobre todas las reglas | Máximo dentro del adjetivo, y `ACCU` entre adjetivos |
| Peso de regla | Varía según el autor | Multiplica el antecedente |
| Tsukamoto | Consecuente monótono | Lo supone y no lo comprueba |
| Sugeno | $z = f(x)$, de cualquier entrada | Solo entradas nombradas en esa regla |
| Normas | Conmutativas, asociativas, monótonas, con neutro | `FAND` y `FOR` no lo son |
| Entrada difusa | Composición sup-T | Sí, y de forma exacta entre polígonos |
| Salida varias a la vez | Normal en Mamdani | Sí en Mamdani; una por bloque en Sugeno y Tsukamoto |

---

## 14. Plan de la documentación pública (próximo paso)

| Sección de la doc | Parada del curso que la apoya |
|---|---|
| Instalar y primer sistema | `6-1-mamdani` |
| Conjuntos y formas | `1-3-conjunto-difuso`, `2-1-parametrizadas`, `2-2-tipicas` |
| Normas y complementos | `3-4-normas-t`, `3-5-normas-s`, `3-6-complementos`, `3-8-parametrizados` |
| Reglas y variables lingüísticas | `5-3-linguistica`, `5-4-reglas` |
| Entradas difusas | `5-5-modus-ponens`, `5-6-composicional` |
| Desdifusión | `6-2-defuzzificacion` |
| Sugeno y Tsukamoto | `6-3-sugeno`, `6-4-tsukamoto` |
| Un sistema entero: el péndulo | `6-6-pendulo`, `6-7-diseno` |
| Fallos y recetas | Sección propia: no hay parada equivalente |

**Fuentes:** el código del repositorio [yudivian/fuzzython](https://github.com/yudivian/fuzzython), la ficha de [PyPI](https://pypi.org/project/fuzzython/) y, para FCL, el [manual de jFuzzyLogic](https://jfuzzylogic.sourceforge.net/html/manual.html) y la [página de cumplimiento de FFLL](https://ffll.sourceforge.net/ffll_and_fcl.htm). El texto oficial de IEC 61131-7 no es gratuito y no se ha consultado.
