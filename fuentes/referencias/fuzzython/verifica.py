# Comprueba ejecutando fuzzython lo que doc.md afirma por lectura. AÚN SIN EJECUTAR: requiere autorización.
# Uso, en una carpeta vacía: python3 verifica.py <ruta-al-repo-fuzzython>
import sys, time, contextlib, io
sys.path.insert(0, sys.argv[1])
def caso(nombre, f):
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf): r = f()
        print(f'[{nombre}] -> {r!r}' + (f'   (imprime: {buf.getvalue().strip()[:90]!r})' if buf.getvalue().strip() else ''))
    except BaseException as e:
        print(f'[{nombre}] LANZA {type(e).__name__}: {str(e)[:110]}')
from interval import Interval
from adjective import Adjective
from variable import Variable
from ruleblock import RuleBlock
from systems.mamdani import MamdaniSystem
from systems.sugeno import SugenoSystem
from systems.tsukamoto import TsukamotoSystem
from fsets.fuzzy_set import FuzzySet
from fsets.polygon import Polygon
from fsets.trapezoid import Trapezoid
from fsets.triangular import Triangular
from fsets.gaussian import Gaussian
from fsets.singleton import Singleton
from fsets.sfunction import SFunction
from fsets.zfunction import ZFunction
from fsets.pifunction import PiFunction
from fsets.polynomial import Polynomial
from norms import norms as N
from rules.rule import Rule
def base():
    cold=Adjective('cold',Polygon((0,1),(15,1),(20,0))); normal=Adjective('normal',Trapezoid((15,0),(20,1),(30,1),(35,0))); hot=Adjective('hot',Polygon((30,0),(35,1),(40,1)))
    temp=Variable('temp','C',cold,normal,hot)
    short=Adjective('short',Polygon((0,1),(10,1),(15,0))); usual=Adjective('usual',Trapezoid((10,0),(15,1),(25,1),(30,0))); large=Adjective('large',Polygon((25,0),(30,1),(40,1)))
    return dict(temp=temp,cold=cold,normal=normal,hot=hot,tm=Variable('tm','min',short,usual,large,defuzzification='COG',default=0),short=short,usual=usual,large=large)
REG=['if temp is cold or temp is normal then tm is short with 0.5','if temp is normal then tm is usual','if temp is hot then tm is large']
def mam(reglas=REG, metodo='COG', **k):
    s=base(); s['tm'].defuzzification=metodo; b=RuleBlock('b',**k); b.add_rules(*reglas,scope=s); return MamdaniSystem('m',b)
def sug(reg):
    s=base(); s['p']=Variable('p','',Adjective('a',Polygon((0,0),(10,1)))); b=RuleBlock('b'); b.add_rules(*reg,scope=s); return SugenoSystem('s',b)
def tsu(reg):
    s=base(); s['short']=Adjective('short',Polygon((0,1),(15,1),(25,0))); s['large']=Adjective('large',Polygon((15,0),(25,1),(40,1))); s['tm']=Variable('tm','min',s['short'],s['large'],defuzzification='COG',default=0); b=RuleBlock('b'); b.add_rules(*reg,scope=s); return TsukamotoSystem('t',b)
TN=(N.minimum,N.maximum,N.zadeh_complement)
caso('F1 compute sin parche', lambda: mam().compute({'temp':33}))
if not hasattr(time,'clock'): time.clock=time.perf_counter
caso('2.2 Mamdani, esperado 24.144', lambda: mam().compute({'temp':33}))
for m,e in [('COA',26.0),('LM',28),('RM',40),('CM',34),('MM',32.667)]: caso(f'2.2 {m}, esperado {e}', lambda m=m: mam(metodo=m).compute({'temp':33}))
caso('2.2 Larsen, esperado 24.416', lambda: mam(activation='PROD').compute({'temp':33}))
caso('2.3 Sugeno, esperado 17.44', lambda: sug(['if temp is cold then z = temp*0.1','if temp is normal then z = temp*0.3 + 1','if temp is hot then z = temp*0.6 + 2']).compute({'temp':33}))
caso('2.4 Tsukamoto, esperado 20', lambda: tsu(['t:if temp is cold then tm is short','t:if temp is normal then tm is large with 0.5','t:if temp is hot then tm is large']).compute({'temp':33}))
caso('F2 Trapezoid.COG', lambda: Trapezoid((0,0),(1,1),(2,1),(3,0)).COG())
caso('F2 PROD con una regla activa', lambda: mam(['if temp is normal then tm is usual'],activation='PROD').compute({'temp':25}))
caso('F3 PiFunction', lambda: PiFunction(5,2)(5))
caso('F4 Z: call y membership', lambda: (lambda z:(z(8),z.membership(8)))(ZFunction((0,0),5,(10,1))))
caso('F4 Singleton.membership', lambda: Singleton(3,.8).membership(3))
caso('F5 S recortada', lambda: (lambda s:[round(s(x),3) for x in (5,8,9.99,10)])(SFunction((0,0),5,(10,1)).minimize(.5)))
caso('F5 Z recortada: tipo', lambda: type(ZFunction((0,0),5,(10,1)).minimize(.5)).__name__)
caso('F7 ACCU igual en mismo adjetivo', lambda: [mam(['if temp is normal then tm is usual','if temp is hot then tm is usual'],accumulation=a).compute({'temp':33}) for a in ('MAX','BSUM')])
caso('F8 otra variable en Sugeno', lambda: sug(['if temp is hot then z = p*2']).compute({'temp':33,'p':1}))
caso('F9 "is" dentro de un nombre', lambda: Rule.parse('if temp is hot then z = dist*2',base()))
caso('F10 complemento de gaussiana', lambda: Gaussian(0,1).complement()(0))
caso('F11 cnorm ignorada', lambda: Polygon((0,.5),(1,.5)).complement(lambda x:.123)._points)
caso('F12 norma inexistente en ACT', lambda: mam(activation='NOEXISTE').compute({'temp':33}))
caso('F13 input_adj', lambda: Rule.parse('if temp is hot and temp is cold then tm is large',base(),*TN).input_adj())
caso('F14 Polynomial con tupla', lambda: Polynomial(1,0,interval=(0,1)))
caso('F14 str(Polynomial)', lambda: str(Polynomial(1,0,interval=Interval(0,1))))
caso('F15 middle(2,4)', lambda: Interval(2,4).middle)
caso('F16 eq tupla', lambda: Interval(2,4)==(2,4))
caso('F17 gaussianas separadas', lambda: Gaussian(0,1).union(Gaussian(10,1)).COG())
caso('F18 hueco', lambda: (lambda u:(u(3),u.area()))(Polygon((0,1),(2,1)).union(Polygon((4,1),(6,1)))))
caso('F19 área de 1', lambda: [FuzzySet(lambda x:1,Interval(0,1)).area(r) for r in (3,7,10,49,100,1000)])
caso('F21 borde vertical', lambda: Trapezoid((0,0),(0,1),(2,1),(3,0)))
caso('7 mayúsculas', lambda: Rule.parse('IF temp IS hot THEN tm IS large',base()))
caso('7 not ( ) minúscula', lambda: str(Rule.parse('if not (temp is hot) then tm is large',base(),*TN)))
caso('7 tsukamoto sin t:', lambda: tsu(['if temp is hot then tm is large']).compute({'temp':33}))
caso('8 entrada triangular', lambda: mam().compute({'temp':Triangular((30,0),(33,1),(36,0))}))
caso('8 singleton 0,5', lambda: mam().compute({'temp':Singleton(33,.5)}))
caso('5 norma FAND(.5,1)', lambda: N.fuzzy_and(.5,1))
caso('9 dump', lambda: mam().dump_())
