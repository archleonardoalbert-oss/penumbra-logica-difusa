# Ejecuta el fuzzython real y guarda sus resultados: lo que muestra el curso y lo que debe reproducir nucleo/fuzzython.js.
# Uso, en una carpeta vacía: python3 fijar.py <repo-fuzzython> <salida.json>
import sys, time, json, io, contextlib
sys.path.insert(0, sys.argv[1]); time.clock = time.perf_counter
from interval import Interval
from adjective import Adjective
from variable import Variable
from ruleblock import RuleBlock
from systems.mamdani import MamdaniSystem
from systems.sugeno import SugenoSystem
from systems.tsukamoto import TsukamotoSystem
from fsets.polygon import Polygon
from fsets.trapezoid import Trapezoid
from fsets.triangular import Triangular
from fsets.gaussian import Gaussian
from fsets.singleton import Singleton
from fsets.sfunction import SFunction
from fsets.fuzzy_set import FuzzySet
from norms import norms as N
R = {}
def callado(f):
    b = io.StringIO()
    with contextlib.redirect_stdout(b): r = f()
    return r
def puntos(p): return [list(map(float, q)) for q in p._points]
tri = Polygon((0, 0), (5, 1), (10, 0)); tra = Polygon((0, 0), (2, 1), (6, 1), (10, 0)); hombro = Polygon((0, 1), (4, 1), (8, 0))
R['eval'] = {n: [p(x) for x in (-1, 0, 1, 2.5, 5, 7, 10, 12)] for n, p in (('tri', tri), ('tra', tra), ('hombro', hombro))}
R['minimizar'] = puntos(tri.minimize(0.4)); R['producto'] = puntos(tri._operation(N.algebraic_product, 0.4))
a, b = Polygon((0, 0), (4, 1), (8, 0)), Polygon((2, 0), (6, 1), (10, 0))
R['union'] = puntos(a.union(b)); R['inter'] = puntos(a.intersect(b)); R['comp'] = puntos(~a)
m = a.minimize(0.7).union(b.minimize(0.3))
R['defuzz'] = {k: getattr(m, k)() for k in ('COG', 'COA', 'CM', 'MM', 'LM', 'RM')}; R['area'] = m.area()
R['gauss'] = [Gaussian(0, 1)(x) for x in (0, 1, 2)]; R['s'] = [SFunction((0, 0), 5, (10, 1))(x) for x in (0, 2.5, 5, 7.5, 10)]
R['normas'] = {k: N.get_norm(k)(0.5, 0.7) for k in ('MIN', 'PROD', 'BDIF', 'DPROD', 'EPROD', 'FAND', 'MAX', 'ASUM', 'BSUM', 'DSUM', 'ESUM', 'FOR', 'NSUM')}
def base():
    cold = Adjective('cold', Polygon((0, 1), (15, 1), (20, 0))); normal = Adjective('normal', Trapezoid((15, 0), (20, 1), (30, 1), (35, 0))); hot = Adjective('hot', Polygon((30, 0), (35, 1), (40, 1)))
    temp = Variable('temp', 'C', cold, normal, hot); short = Adjective('short', Polygon((0, 1), (10, 1), (15, 0))); usual = Adjective('usual', Trapezoid((10, 0), (15, 1), (25, 1), (30, 0))); large = Adjective('large', Polygon((25, 0), (30, 1), (40, 1)))
    minutes = Variable('minutes', 'min', short, usual, large, defuzzification='COG', default=0); return dict(cold=cold, normal=normal, hot=hot, temp=temp, short=short, usual=usual, large=large, minutes=minutes)
REG = ['if temp is cold or temp is normal then minutes is short with 0.5', 'if temp is normal then minutes is usual', 'if temp is hot then minutes is large']
TEMPS = (5, 15, 17.5, 20, 25, 30, 33, 35, 39)
def mam(t, **k):
    s = base(); bl = RuleBlock('b', **k); bl.add_rules(*REG, scope=s); return callado(lambda: MamdaniSystem('m', bl).compute({'temp': t}))['b']['minutes']
R['accu'] = {f'{ac}_{op}_{t}': mam(t, activation=ac, accumulation=op) for ac in ('MIN', 'PROD') for op in ('BSUM', 'ASUM') for t in TEMPS}
R['mamdani'] = {str(t): mam(t) for t in TEMPS}; R['larsen'] = {str(t): mam(t, activation='PROD') for t in TEMPS}
def sug(t):
    s = base(); bl = RuleBlock('b'); bl.add_rules('if temp is cold then z = temp*0.1', 'if temp is normal then z = temp*0.3 + 1', 'if temp is hot then z = temp*0.6 + 2', scope=s); return callado(lambda: SugenoSystem('s', bl).compute({'temp': t}))['b']
R['sugeno'] = {str(t): sug(t) for t in TEMPS}
def tsu(t):
    s = base(); s['short'] = Adjective('short', Polygon((0, 1), (15, 1), (25, 0))); s['large'] = Adjective('large', Polygon((15, 0), (25, 1), (40, 1))); s['minutes'] = Variable('minutes', 'min', s['short'], s['large'], defuzzification='COG', default=0); bl = RuleBlock('b')
    for r in ('t:if temp is cold then minutes is short', 't:if temp is normal then minutes is large with 0.5', 't:if temp is hot then minutes is large'): bl.add_rule(r, s)
    return callado(lambda: TsukamotoSystem('t', bl).compute({'temp': t}))['b']
R['tsukamoto'] = {str(t): tsu(t) for t in TEMPS}
def difusa(e):
    s = base(); bl = RuleBlock('b'); bl.add_rules(*REG, scope=s); return callado(lambda: MamdaniSystem('m', bl).compute({'temp': e}))['b']['minutes']
R['difusa_tri'] = difusa(Triangular((30, 0), (33, 1), (36, 0))); R['difusa_sing'] = difusa(Singleton(33, 0.5))
s0 = base(); bl0 = RuleBlock('first', operators=('MIN', 'MAX', 'ZADEH'), activation='MIN', accumulation='MAX'); bl0.add_rules(*REG, scope=s0); R['dump'] = MamdaniSystem('ms1', bl0).dump_()
json.dump(R, open(sys.argv[2], 'w'), indent=0)
print('OK', len(R))
