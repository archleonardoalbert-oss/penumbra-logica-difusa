# Cálculo independiente, sin importar fuzzython: lo que debería salir en sample.py con temp = 33
def pl(P):
    def f(x):
        if x<=P[0][0]: return P[0][1]
        if x>=P[-1][0]: return P[-1][1]
        for (a,b),(c,d) in zip(P,P[1:]):
            if x<=c: return b+(d-b)*(x-a)/(c-a)
    return f
sh,us,la=pl([(0,1),(10,1),(15,0)]),pl([(10,0),(15,1),(25,1),(30,0)]),pl([(25,0),(30,1),(40,1)])
n=400000;xs=[40*i/n for i in range(n+1)]
for nom,act in (('MIN',min),('PROD',lambda a,b:a*b)):
    y=[max(act(sh(x),.2),act(us(x),.4),act(la(x),.6)) for x in xs]
    A=sum(y)*40/n; C=sum(a*b for a,b in zip(xs,y))*40/n/A
    acu=0;coa=None
    for a,b in zip(xs,y):
        acu+=b*40/n
        if acu>=A/2: coa=a;break
    M=max(y);pm=[a for a,b in zip(xs,y) if b>=M-1e-12]
    print(nom,'area',round(A,4),'COG',round(C,4),'COA',round(coa,4),'LM',round(pm[0],3),'RM',round(pm[-1],3),'continuo MM',round(sum(pm)/len(pm),3))
print('sugeno',(.4*(33*.3+1)+.6*(33*.6+2))/(.4+.6)); print('tsukamoto',(.2*17+.6*21)/.8)
