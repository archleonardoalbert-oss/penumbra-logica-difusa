"""Saca un fotograma cada PASO segundos y marca como 'clave' los que cambian.

fotogramas/<video>/todos/t00h03m25s.jpg   todos, nombrados por su instante
fotogramas/<video>/clave/...              enlaces a los que muestran algo nuevo
Se ignora la webcam de la esquina y un cambio mínimo (el cursor).
Retomable: un vídeo ya terminado tiene su clave/.hecho y se salta.
"""
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from comun import FUENTES, nombre_corto, videos

PASO = 5
UMBRAL_PIXEL = 28       # diferencia de gris para contar un píxel como cambiado
UMBRAL_AREA = 0.0015    # fracción de píxeles cambiados para considerarlo nuevo


def gris(ruta: Path) -> np.ndarray:
    a = np.asarray(Image.open(ruta).convert("L").resize((640, 360)), dtype=np.int16).copy()
    a[int(360 * 0.84):, int(640 * 0.82):] = 0  # webcam y logotipo
    return a


def procesar(video: Path) -> tuple[str, int, int]:
    nombre = nombre_corto(video)
    base = FUENTES / "fotogramas" / nombre
    hecho = base / "clave" / ".hecho"
    if hecho.exists():
        return nombre, len(list((base / "todos").glob("*.jpg"))), len(list((base / "clave").glob("*.jpg")))
    shutil.rmtree(base, ignore_errors=True)
    todos, clave = base / "todos", base / "clave"
    todos.mkdir(parents=True)
    clave.mkdir()
    with tempfile.TemporaryDirectory(dir=base) as tmp:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"fps=1/{PASO}",
             "-q:v", "4", f"{tmp}/f%05d.jpg"], check=True)
        for f in sorted(Path(tmp).glob("f*.jpg")):
            s = (int(f.stem[1:]) - 1) * PASO
            f.rename(todos / f"t{s // 3600:02d}h{s % 3600 // 60:02d}m{s % 60:02d}s.jpg")
    previo, nclave = None, 0
    archivos = sorted(todos.glob("*.jpg"))
    for f in archivos:
        a = gris(f)
        if previo is None or (np.abs(a - previo) > UMBRAL_PIXEL).mean() > UMBRAL_AREA:
            (clave / f.name).hardlink_to(f)
            previo, nclave = a, nclave + 1
    hecho.touch()
    return nombre, len(archivos), nclave


if __name__ == "__main__":
    total = ntotal = 0
    for v in videos():
        n, t, c = procesar(v)
        total += t
        ntotal += c
        print(f"{n}: {t} fotogramas, {c} clave", flush=True)
    print(f"LISTO fotogramas: {total} en total, {ntotal} clave", flush=True)
