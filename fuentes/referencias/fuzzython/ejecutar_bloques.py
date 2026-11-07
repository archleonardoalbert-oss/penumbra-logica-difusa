# Ejecuta con el fuzzython real cada bloque de código del Horizonte y escribe lo que imprime.
# Lo que ve el alumno como salida sale de aquí: nunca se copia a mano.
# Uso, en una carpeta vacía: python3 -W ignore ejecutar_bloques.py <repo-fuzzython> <bloques.json> <salidas.js>
import contextlib, io, json, sys, time
repo, entrada, salida = sys.argv[1:4]
sys.path.insert(0, repo); time.clock = time.perf_counter
R = {}
for parada in json.load(open(entrada, encoding='utf-8')):
    ns = {'__name__': '__main__'}
    for codigo in parada['bloques']:
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf): exec(compile(codigo, parada['id'], 'exec'), ns)
        except Exception as e:
            raise SystemExit(f"{parada['id']}: {type(e).__name__}: {e}\n{codigo}")
        R[codigo] = buf.getvalue().rstrip('\n').expandtabs(4)
with open(salida, 'w', encoding='utf-8') as f:
    f.write('// Generado por fuentes/referencias/fuzzython/ejecutar_bloques.py: es lo que imprime el fuzzython real. No editar a mano.\nexport const SALIDAS = ' + json.dumps(R, ensure_ascii=False, indent=0) + ';\n')
print(len(R), 'bloques ejecutados')
