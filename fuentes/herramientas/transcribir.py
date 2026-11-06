"""Transcribe cada vídeo con faster-whisper (GPU) a .txt con marcas y .json.

Retomable: se escribe a un temporal y se renombra al terminar cada vídeo.
"""
import json
import os
import site
import subprocess
import sys
import time
from pathlib import Path

# Las librerías CUDA vienen en paquetes pip: hay que exponerlas antes de cargar nada.
if "LD_LIBRARY_PATH" not in os.environ or "nvidia" not in os.environ["LD_LIBRARY_PATH"]:
    p = Path(site.getsitepackages()[0]) / "nvidia"
    os.environ["LD_LIBRARY_PATH"] = f"{p}/cublas/lib:{p}/cudnn/lib"
    os.execv(sys.executable, [sys.executable, *sys.argv])

import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

from comun import FUENTES, marca, nombre_corto, videos  # noqa: E402

MODELO = "large-v3-turbo"
PROMPT = (
    "Curso de lógica difusa. Conjuntos difusos y conjuntos certeros, grado de membresía, "
    "funciones de membresía triangular, trapezoidal, gaussiana, campana generalizada, sigmoidal. "
    "Normas T, normas S, complemento difuso, Zadeh, Mamdani, Sugeno, producto cartesiano, "
    "composición max-min, principio de extensión, variable lingüística, modus ponens, MATLAB."
)


def main():
    salida = FUENTES / "transcripciones"
    salida.mkdir(exist_ok=True)
    lista = list(videos())
    if len(sys.argv) > 1:  # prueba: solo los que contengan este texto
        lista = [v for v in lista if sys.argv[1] in nombre_corto(v)]
    modelo = WhisperModel(MODELO, device="cuda", compute_type="int8_float16")
    print(f"Modelo {MODELO} cargado", flush=True)
    for i, v in enumerate(lista, 1):
        n = nombre_corto(v)
        txt, js = salida / f"{n}.txt", salida / f"{n}.json"
        if txt.exists() and js.exists():
            print(f"[{i}/{len(lista)}] ya estaba: {n}", flush=True)
            continue
        t0 = time.time()
        # El audio se lee con ffmpeg: faster-whisper 1.2.1 no es compatible con el PyAV actual.
        crudo = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(v), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
            check=True, stdout=subprocess.PIPE).stdout
        audio = np.frombuffer(crudo, dtype=np.float32)
        segs, info = modelo.transcribe(
            audio, language="es", beam_size=5, vad_filter=True,
            initial_prompt=PROMPT, condition_on_previous_text=False)
        datos = [{"ini": round(s.start, 2), "fin": round(s.end, 2), "texto": s.text.strip()} for s in segs]
        tmp = txt.with_suffix(".txt.tmp")
        tmp.write_text("".join(f"[{marca(d['ini'])}] {d['texto']}\n" for d in datos), encoding="utf-8")
        tmpj = js.with_suffix(".json.tmp")
        tmpj.write_text(json.dumps({"video": v.name, "duracion": info.duration, "segmentos": datos},
                                   ensure_ascii=False, indent=1), encoding="utf-8")
        tmpj.replace(js)
        tmp.replace(txt)
        dt = time.time() - t0
        print(f"[{i}/{len(lista)}] {n}: {info.duration:.0f}s de vídeo en {dt:.0f}s, {len(datos)} segmentos", flush=True)
    print("LISTO transcripciones", flush=True)


if __name__ == "__main__":
    main()
