"""Nombres estables para los vídeos del curso de Hackeando Tec."""
import re
import unicodedata
from pathlib import Path

VIDEOS = Path.home() / "Videos/Youtube/Hackeando Tec (HT)"
FUENTES = Path(__file__).resolve().parent.parent


def nombre_corto(ruta: Path) -> str:
    """'Lógica Difusa - 1.2 Operaciones ... [id].mp4' -> '1.2-operaciones-...'."""
    t = re.sub(r"\s*\[[^\]]+\]$", "", ruta.stem)
    t = re.sub(r"^Lógica Difusa\s*-\s*", "", t)
    t = re.sub(r"\s*-\s*Hackeand\w*(\s+Te\w*)?\s*$", "", t).strip()
    if t.startswith("Introducción"):
        t = "0.0 " + t
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9.]+", "-", t).strip("-")


def videos():
    """Todos los vídeos, en el orden del curso."""
    def clave(p):
        n = nombre_corto(p)
        return ([int(x) for x in n.split("-")[0].split(".")], n)
    return sorted(VIDEOS.glob("*.mp4"), key=clave)


def marca(seg: float) -> str:
    s = int(seg)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"
