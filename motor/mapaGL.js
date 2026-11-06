// El paisaje de la portada, en WebGL2: montañas con sombras de borde suave, niebla en los valles, un camino que fluye y faros en las cimas.
// El sentido del color es el del curso: azul y turquesa para lo que aún está por explorar, oro solo para lo que dominas.
import { ANCHO_CIMA, BASE, OCTAVAS, SIGMA, campoMapa, DOMINIO, DOMINIO_CERCA } from './alturaMapa.js';

const ESCZ = 0.46;

const CIELO = `
vec3 cielo(vec3 v,vec3 sol){
 float e=max(v.z,0.),s=max(dot(v,sol),0.);
 vec3 c=mix(vec3(.0048,.011,.027),vec3(.0008,.0018,.006),smoothstep(0.,.14,e));
 c+=vec3(.10,.17,.27)*exp(-e*30.)*.07;
 c+=vec3(.42,.52,.70)*pow(s,40.)*.07;
 c+=vec3(.86,.90,1.)*pow(s,400.)*.3;
 return c;}`;

// La altura se lee siempre de una textura: la del mapa hecho o, mientras nace, la que se recalcula una vez por cuadro.
const ALTURA = `
uniform sampler2D uCerca,uLejos;
vec4 campo(vec2 p){vec2 u=(p+.1)/1.2;if(u.x>.004&&u.y>.004&&u.x<.996&&u.y<.996)return texture(uCerca,u);return texture(uLejos,(p+1.)/3.);}
float alt(vec2 p){return campo(p).r*${ESCZ.toFixed(2)};}`;

const VS_TERRENO = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 q;uniform mat4 uVP;uniform vec4 uMalla;
${ALTURA}
out vec3 vP;
void main(){vec2 p=uMalla.xy+q*uMalla.zw;vP=vec3(p,alt(p));gl_Position=uVP*vec4(vP,1.);}`;

const FS_TERRENO = `#version 300 es
precision highp float;precision highp sampler2D;
in vec3 vP;uniform sampler2D uRuido,uLuzC,uLuzL;uniform vec3 uCam,uSol;uniform float uT,uMat,uCaja,uBarrido,uEsLejos;uniform vec4 uFoco;
out vec4 o;
${ALTURA}
${CIELO}
float iso(float v,float paso){float x=v/paso,w=max(fwidth(x),1e-4);return 1.-smoothstep(0.,1.4,abs(fract(x-.5)-.5)/w);}
vec3 escala(float v){vec3 a=vec3(.102,.212,.463),b=vec3(.227,.698,.675),c=vec3(.957,.827,.271);return v<.5?mix(a,b,v*2.):mix(b,c,(v-.5)*2.);}
void main(){
 vec2 p=vP.xy;float z=vP.z;
 // el mapa cercano tapa al lejano; el solape evita rendijas
 if(uEsLejos>.5&&p.x>-.085&&p.y>-.085&&p.x<1.085&&p.y<1.085)discard;
 // mientras nace, solo existe el cuadrado de la función
 float caja=uCaja*1.7;if(p.x<-caja||p.y<-caja||p.x>1.+caja||p.y>1.+caja)discard;
 if(uMat<.01&&p.y>uBarrido)discard;
 float hn=z/${ESCZ.toFixed(2)};
 vec3 v=normalize(uCam-vP);float dist=length(uCam-vP);
 float e=mix(.0016,.0062,smoothstep(.9,2.6,dist));vec3 n=normalize(vec3(alt(p-vec2(e,0.))-alt(p+vec2(e,0.)),alt(p-vec2(0.,e))-alt(p+vec2(0.,e)),2.*e));
 // detalle fino: tres escalas de roca, que se apagan con la distancia para no centellear
 float deta=exp(-dist*.42);
 vec3 g1=texture(uRuido,p*5.).rgb-.5,g2=texture(uRuido,p*23.).rgb-.5,g3=texture(uRuido,p*97.).rgb-.5;
 vec3 nd=normalize(n+vec3(g1.xy*.14+g2.xy*.2*deta+g3.xy*.26*deta,0.));
 float grieta=smoothstep(.0,.09,abs(g2.b))*.55+smoothstep(.0,.05,abs(g3.g))*.45;
 float dom=campo(p).g;
 vec3 c;
 // la sombra y la oclusión ya están calculadas en una textura: no dependen de la cámara
 vec2 lu=(p+.1)/1.2;vec2 lm=(lu.x>.004&&lu.y>.004&&lu.x<.996&&lu.y<.996)?texture(uLuzC,lu).rg:texture(uLuzL,(p+1.)/3.).rg;
 float luz=lm.r,oc=lm.g;
 float dif=max(dot(nd,uSol),0.),pendiente=1.-n.z;
 vec3 roca=mix(vec3(.018,.044,.092),vec3(.085,.25,.30),smoothstep(.08,.72,hn));
 roca=mix(roca,vec3(.016,.030,.062),smoothstep(.12,.55,pendiente)*.6);
 roca*=(.74+.62*g1.b+.5*g2.b*deta)*(.62+.5*grieta);
 vec3 oro=vec3(.86,.60,.13);
 roca=mix(roca,oro*(.62+.62*g1.b)*(.75+.5*smoothstep(.25,.75,hn))*(.7+.4*grieta),dom*.92);
 vec3 lunar=vec3(.72,.88,1.)*2.9,ambiente=vec3(.04,.08,.16)*(.45+.55*nd.z)+vec3(.016,.034,.07)*max(dot(nd,v),0.);
 c=roca*(lunar*dif*luz+ambiente*oc*1.7+vec3(.16,.10,.024)*dom*(.4+.6*oc));
 c+=vec3(.26,.40,.62)*pow(1.-max(dot(n,v),0.),4.)*.12*oc;
 float cerca=exp(-dot(p-uFoco.xy,p-uFoco.xy)/.028)*uFoco.w;
 float dentro=smoothstep(-.02,.06,p.x)*smoothstep(1.02,.94,p.x)*smoothstep(-.02,.06,p.y)*smoothstep(1.02,.94,p.y);
 float linea=iso(hn,.07)*smoothstep(.1,.16,hn);
 c+=mix(vec3(.16,.50,.54),vec3(1.,.74,.26),dom)*linea*(.05*dentro+.36*cerca+.1*dom*dentro)*exp(-dist*.5);
 c+=mix(vec3(.05,.16,.22),vec3(.42,.28,.05),dom)*cerca*.55*(.35+dif);
 vec2 w=p*2.1+vec2(uT*.006,-uT*.004);float n1=texture(uRuido,w).r,n2=texture(uRuido,w*2.3-vec2(uT*.009,0.)).g,bruma=smoothstep(.34,.72,n1*.65+n2*.35);
 float valle=smoothstep(.13,.05,hn)*bruma;
 c=mix(c,vec3(.05,.10,.19)*(.3+.7*luz),valle*.5);
 vec3 h=cielo(-v,uSol);
 float r=length(p-.5),nieb=1.-exp(-pow(max(dist-1.9,0.)*.55,1.6));
 nieb=max(nieb,smoothstep(.95,1.28,r))*uMat;
 if(nieb>.992)discard;
 c=mix(c,h,clamp(nieb,0.,1.));
 // la función desnuda: su color es su valor, y sobre ella la rejilla de x e y y las curvas de nivel
 if(uMat<.999){
  vec2 gr=abs(fract(p*20.+.5)-.5)/max(fwidth(p*20.),vec2(1e-5));float rej=1.-smoothstep(0.,1.1,min(gr.x,gr.y));
  vec2 gm=abs(fract(p*4.+.5)-.5)/max(fwidth(p*4.),vec2(1e-5));float rejM=1.-smoothstep(0.,1.3,min(gm.x,gm.y));
  float lum=.32+.8*max(dot(n,normalize(vec3(.45,-.5,.75))),0.);
  vec3 f=pow(escala(clamp((hn-.04)/.5,0.,1.)),vec3(2.2))*lum*1.5;
  f=mix(f,vec3(.8),rej*.1+rejM*.26);f=mix(f,vec3(.02,.03,.06),iso(hn,.05)*smoothstep(.07,.1,hn)*.6);
  float borde=max(max(-p.x,p.x-1.),max(-p.y,p.y-1.));
  if(uMat<.01&&borde>.0)discard;
  c=mix(f,c,uMat);
 }
 o=vec4(c,1.);}`;

// El terreno se calcula en la GPU, de una vez: es la misma fórmula que alturaMapa.js, píxel a píxel, pero en milésimas en vez de segundos.
const FS_HORNEAR = `#version 300 es
precision highp float;precision highp int;
in vec2 u;uniform vec4 uReg[8];uniform vec4 uDom;out vec4 o;
float h2(int i,int j){uint h=uint(i)*374761393u+uint(j)*668265263u;h=(h^(h>>13))*1274126177u;h=h^(h>>16);return float(h)/4294967295.;}
float valor(vec2 p){vec2 f=floor(p),d=p-f;ivec2 q=ivec2(f);d=d*d*(3.-2.*d);float a=h2(q.x,q.y),b=h2(q.x+1,q.y),c=h2(q.x,q.y+1),e=h2(q.x+1,q.y+1);return a+(b-a)*d.x+(c-a)*d.y+(a-b-c+e)*d.x*d.y;}
void main(){
 vec2 p=uDom.xy+(u-.5/uDom.z)*uDom.z/(uDom.z-1.)*uDom.w;
 float s=0.,dos=0.,a=.5,f=7.,peso=1.;vec2 P=p;
 for(int k=0;k<${OCTAVAS};k++){float n=1.-abs(2.*valor(vec2(P.x*f+11.3*float(k),P.y*f-7.1*float(k)))-1.),v=n*n*peso;s+=v*a;peso=min(1.,v*2.2);a*=.5;f*=2.03;if(k==1)dos=s;P=vec2(P.x*.86-P.y*.5,P.x*.5+P.y*.86);}
 float m=0.,ce=0.,dom=0.;
 for(int i=0;i<8;i++){vec2 d=p-uReg[i].xy;float d2=dot(d,d);m+=uReg[i].z*exp(-d2/${(2 * SIGMA * SIGMA).toFixed(6)});ce=max(ce,exp(-d2/${(2 * ANCHO_CIMA * ANCHO_CIMA).toFixed(7)}));dom=max(dom,uReg[i].w*exp(-d2/${(2 * (SIGMA * 1.7) ** 2).toFixed(6)}));}
 float r=length(p-.5),l=clamp((r-.7)/.5,0.,1.);l=l*l*(3.-2.*l);
 o=vec4(clamp(${BASE.toFixed(3)}+m+l*(.08+.5*s)+(1.-ce)*s*(.04+.5*min(1.,m*2.)),0.,1.),min(1.,dom),dos,s);}`;

// Mientras nace: los mismos términos, con cada campana a su altura de ese instante; la roca ya está calculada.
const FS_NACER = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 u;uniform sampler2D uFuente;uniform vec4 uReg[8];uniform vec4 uDom;uniform float uBase,uRoca2,uRoca5,uFondo;out vec4 o;
void main(){
 vec4 t=texture(uFuente,u);vec2 p=uDom.xy+u*uDom.w;
 float m=0.,ce=0.;
 for(int i=0;i<8;i++){vec2 d=p-uReg[i].xy;float d2=dot(d,d);m+=uReg[i].z*exp(-d2/${(2 * SIGMA * SIGMA).toFixed(6)});ce=max(ce,exp(-d2/${(2 * ANCHO_CIMA * ANCHO_CIMA).toFixed(7)}));}
 float c=mix(t.b*uRoca2,t.a,uRoca5),r=length(p-.5),l=clamp((r-.7)/.5,0.,1.);l=l*l*(3.-2.*l);
 o=vec4(clamp(${BASE.toFixed(3)}*uBase+m+l*(.08+.5*t.a)*uFondo+(1.-ce)*c*(.04+.5*min(1.,m*2.)),0.,1.),t.g,t.b,t.a);}`;

// La penumbra, una sola vez y guardada: para cada punto del suelo, cuánta luz le llega y cuánto lo tapan sus vecinos.
const FS_LUZ = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 u;uniform vec3 uSol;uniform vec4 uDom;uniform float uPasos;out vec4 o;
${ALTURA}
void main(){
 vec2 p=uDom.xy+u*uDom.w;float z=alt(p),e=.0022;
 vec3 n=normalize(vec3(alt(p-vec2(e,0.))-alt(p+vec2(e,0.)),alt(p-vec2(0.,e))-alt(p+vec2(0.,e)),2.*e));
 float luz=1.;{vec3 r=vec3(p,z)+vec3(n.xy*.003,.0022);float t=.006;for(int i=0;i<int(uPasos);i++){vec3 s=r+uSol*t;float d=s.z-alt(s.xy);luz=min(luz,7.5*d/t);if(luz<.001)break;t+=clamp(d*.7,.0045,.05);if(t>1.1)break;}luz=clamp(luz,0.,1.);luz=luz*luz*(3.-2.*luz);}
 float oc=0.;for(int i=0;i<6;i++){float a=float(i)*1.047+.6;vec2 di=vec2(cos(a),sin(a));oc+=max(alt(p+di*.022)-z,0.)+.6*max(alt(p+di*.06)-z,0.);}
 o=vec4(luz,exp(-oc*4.2),0.,1.);}`;

const VS_PANTALLA = `#version 300 es
out vec2 u;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);u=p*.5+.5;gl_Position=vec4(p,.9999,1.);}`;

const FS_CIELO = `#version 300 es
precision highp float;
in vec2 u;uniform mat4 uIVP;uniform vec3 uCam,uSol;uniform sampler2D uRuido;uniform float uT,uCielo;out vec4 o;
${CIELO}
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
void main(){
 vec4 a=uIVP*vec4(u*2.-1.,1.,1.);vec3 v=normalize(a.xyz/a.w-uCam);
 vec3 c=cielo(v,uSol);
 vec2 g=vec2(atan(v.y,v.x)*92.,v.z*92.),id=floor(g),f=fract(g)-.5;float h=h21(id);
 float e=step(.9,h)*smoothstep(.05+.09*pow(h21(id+3.),3.),.0,length(f+vec2(h21(id+7.),h21(id+9.))*.7-.35));
 c+=vec3(.82,.90,1.)*e*(.6+.3*sin(uT*.5+h*80.))*smoothstep(.015,.2,v.z)*.9;
 // la luna, a medio eclipsar: una penumbra de verdad, de borde suave, que la cruza muy despacio
 vec3 luna=normalize(vec3(uSol.xy,uSol.z*.17));float ang=acos(clamp(dot(v,luna),-1.,1.)),R=.027;
 if(ang<R*1.1){
  vec3 x=normalize(cross(luna,vec3(0.,0.,1.))),y=cross(x,luna);vec2 q=vec2(dot(v-luna,x),dot(v-luna,y))/R;
  float disco=smoothstep(1.,.93,length(q)),mar=texture(uRuido,q*.11+.3).r*.6+texture(uRuido,q*.31).g*.4;
  vec2 cSombra=vec2(.86-.22*sin(uT*.018),.2);float pen=smoothstep(.62,1.5,length(q-cSombra));
  vec3 lu=vec3(1.,.97,.9)*(.74+1.5*(mar-.5));
  c=mix(c,lu*(.012+1.25*pen)+vec3(.075,.022,.016)*(1.-pen),disco);
 }
 o=vec4(c*uCielo,1.);}`;

const VS_CAMINO = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec4 a;uniform mat4 uVP;uniform float uZ;
${ALTURA}
out vec2 w;
void main(){vec2 p=a.xy;w=vec2(a.z,a.w);gl_Position=uVP*vec4(p,alt(p)+uZ,1.);}`;

const FS_CAMINO = `#version 300 es
precision highp float;
in vec2 w;uniform float uT,uHecho,uFuerza,uAparece;uniform vec2 uCometa;out vec4 o;
void main(){
 float d=abs(w.y),u=w.x,hecho=step(u,uHecho);
 if(u>uAparece)discard;
 float nucleo=smoothstep(.34,.12,d),halo=exp(-d*d*5.);
 float pulso=pow(.5+.5*sin(u*70.-uT*1.1),7.);
 vec3 oro=vec3(1.,.74,.24),frio=vec3(.62,.80,.95);
 float trazos=smoothstep(.34,.42,abs(fract(u*46.)-.5));
 vec3 c=mix(frio*(nucleo*1.1*trazos+halo*.07),oro*(nucleo*(1.+1.6*pulso)+halo*(.16+.34*pulso)),hecho);
 float col=u-uCometa.x,cabeza=exp(-col*col*9000.)*uCometa.y,estela=step(col,0.)*exp(col*26.)*uCometa.y;
 c+=vec3(1.,.86,.5)*(nucleo*(9.*cabeza+1.6*estela)+halo*(3.4*cabeza+.42*estela));
 o=vec4(c*uFuerza,0.);}`;

const VS_FARO = `#version 300 es
precision highp float;
in vec2 q;in vec3 iP;in vec3 iD;uniform mat4 uVP;uniform vec2 uRes;uniform float uHaz;
out vec2 v;out vec3 d;
void main(){vec4 c=uVP*vec4(iP,1.);d=iD;v=q;float g=iD.x,act=iD.y;
 vec2 tam=uHaz>.5?vec2(6.+5.*g+5.*act,(34.+96.*g+44.*act)):vec2(24.+20.*g+30.*act);
 vec2 base=uHaz>.5?vec2(q.x,(q.y+1.)):q;
 c.xy+=base*tam/uRes*2.*c.w;c.z-=.002*c.w;gl_Position=c;}`;

const FS_FARO = `#version 300 es
precision highp float;
in vec2 v;in vec3 d;uniform float uHaz,uT;out vec4 o;
void main(){float g=d.x,act=d.y,sig=d.z;
 vec3 oro=vec3(1.,.74,.26),frio=vec3(.62,.84,1.);vec3 col=mix(frio,oro,smoothstep(.0,.25,g)*.9+sig*.9);
 if(uHaz>.5){float y=(v.y+1.)*.5,a=exp(-v.x*v.x*14.)*pow(1.-y,2.4)*smoothstep(0.,.02,y);o=vec4(col*a*(.24+.55*g+.5*act+.6*sig),0.);return;}
 float r=length(v),puls=sig*(.5+.5*sin(uT*1.7));
 float nuc=smoothstep(.13,.03,r),hal=exp(-r*r*7.)*(1.-smoothstep(.8,1.,r));
 o=vec4(col*(nuc*(1.4+act+g*.6)+hal*(.18+.36*act+.3*g+.4*puls)),0.);}`;

const FS_BRILLO = `#version 300 es
precision highp float;
in vec2 u;uniform sampler2D uTex;uniform vec2 uDir;uniform float uCorte;out vec4 o;
void main(){vec3 c=vec3(0.);float pesos[5]=float[](.227,.195,.122,.054,.016);
 for(int i=-4;i<=4;i++){vec3 s=texture(uTex,u+uDir*float(i)).rgb;c+=max(s-uCorte,0.)*pesos[abs(i)];}
 o=vec4(c,1.);}`;

const FS_FINAL = `#version 300 es
precision highp float;
in vec2 u;uniform sampler2D uTex,uBri;uniform float uExpo,uT;uniform vec2 uPx;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 // bajar de resolución con cuatro muestras, y afilar: todo el detalle que cabe en cada píxel de pantalla
 vec3 c0=texture(uTex,u).rgb,cr=texture(uTex,u+uPx*vec2(1.,0.)).rgb,cl=texture(uTex,u-uPx*vec2(1.,0.)).rgb,cu=texture(uTex,u+uPx*vec2(0.,1.)).rgb,cd=texture(uTex,u-uPx*vec2(0.,1.)).rgb;
 vec3 c=c0+(c0-(cr+cl+cu+cd)*.25)*.85;c=max(c,vec3(0.));
 c+=texture(uBri,u).rgb*.55;
 vec2 q=u-vec2(.46,.5);c*=1.-.62*smoothstep(.34,.95,length(q*vec2(1.,1.15)));
 c=aces(c*1.05*uExpo);c=pow(c,vec3(1./2.2));
 c+=(h(u*vec2(1731.,977.)+fract(uT))-.5)/120.;
 o=vec4(c,1.);}`;

// ------------------------------------------------------------------- matrices
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mult = (a, b) => { const r = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = s; } return r; };
export function inversa(m) {
  const A = Array.from({ length: 4 }, (_, i) => [m[i], m[i + 4], m[i + 8], m[i + 12], i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let f = c + 1; f < 4; f++) if (Math.abs(A[f][c]) > Math.abs(A[p][c])) p = f;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    for (let k = 0; k < 8; k++) A[c][k] /= d;
    for (let f = 0; f < 4; f++) if (f !== c) { const x = A[f][c]; for (let k = 0; k < 8; k++) A[f][k] -= x * A[c][k]; }
  }
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[j * 4 + i] = A[i][j + 4];
  return r;
}

/** Cámara orbital que mira a `objetivo`. `corrimiento` desplaza la imagen en horizontal: deja sitio al panel. */
export function camaraMapa({ yaw, pitch, dist, objetivo, aspecto, corrimiento = 0, alzado = 0 }) {
  const ojo = [objetivo[0] + dist * Math.cos(pitch) * Math.sin(yaw), objetivo[1] - dist * Math.cos(pitch) * Math.cos(yaw), objetivo[2] + dist * Math.sin(pitch)];
  const f = norm(sub(objetivo, ojo)), s = norm(cruz(f, [0, 0, 1])), up = cruz(s, f);
  const V = new Float32Array([s[0], up[0], -f[0], 0, s[1], up[1], -f[1], 0, s[2], up[2], -f[2], 0, -pt(s, ojo), -pt(up, ojo), pt(f, ojo), 1]);
  const fy = 1 / Math.tan((38 * Math.PI) / 360), near = 0.04, far = 20;
  const P = new Float32Array([fy / aspecto, 0, 0, 0, 0, fy, 0, 0, corrimiento, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
  P[8] = -corrimiento; P[9] = -alzado;
  return { ojo, vp: mult(P, V) };
}
export function proyectar(vp, [x, y, z]) {
  const X = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], Y = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], W = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  return [(X / W + 1) / 2, (1 - Y / W) / 2];
}

function programa(gl, vs, fs) {
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

function texturaRuido(gl) {
  const N = 256, d = new Uint8Array(N * N * 4), cap = (x, y, f, k) => { // ruido periódico suave, por capas
    let s = 0, a = 0.5;
    for (let o = 0; o < 4; o++) { const F = f << o, i = Math.floor(x * F), j = Math.floor(y * F), u = x * F - i, v = y * F - j, U = u * u * (3 - 2 * u), V = v * v * (3 - 2 * v); const r = (p, q) => { const P = ((p % F) + F) % F, Q = ((q % F) + F) % F; let h = (Math.imul(P + k * 57, 73856093) ^ Math.imul(Q + o * 131, 19349663)) | 0; h = Math.imul(h ^ (h >>> 15), 2654435761); return ((h ^ (h >>> 13)) >>> 0) / 4294967295; }; s += a * (r(i, j) * (1 - U) * (1 - V) + r(i + 1, j) * U * (1 - V) + r(i, j + 1) * (1 - U) * V + r(i + 1, j + 1) * U * V); a *= 0.5; }
    return s / 0.9375;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / N, y = j / N; d[(j * N + i) * 4] = cap(x, y, 8, 1) * 255; d[(j * N + i) * 4 + 1] = cap(x, y, 16, 2) * 255; d[(j * N + i) * 4 + 2] = cap(x, y, 32, 3) * 255; d[(j * N + i) * 4 + 3] = 255; }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return t;
}

export function crearPaisaje(canvas, { software = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  const hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
  const pT = programa(gl, VS_TERRENO, FS_TERRENO), pC = programa(gl, VS_PANTALLA, FS_CIELO), pR = programa(gl, VS_CAMINO, FS_CAMINO), pF = programa(gl, VS_FARO, FS_FARO), pB = programa(gl, VS_PANTALLA, FS_BRILLO), pS = programa(gl, VS_PANTALLA, FS_FINAL);
  const ruido = texturaRuido(gl), texCerca = gl.createTexture(), texLejos = gl.createTexture(), vacioVAO = gl.createVertexArray();
  const anis = gl.getExtension('EXT_texture_filter_anisotropic');
  if (anis) { gl.bindTexture(gl.TEXTURE_2D, ruido); gl.texParameterf(gl.TEXTURE_2D, anis.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }

  const qT = gl.getAttribLocation(pT.p, 'q');
  /** Una malla regular de n×n cuadrados, en [0, 1]². */
  function crearMalla(n) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const v = new Float32Array((n + 1) * (n + 1) * 2), idx = new Uint32Array(n * n * 6);
    for (let j = 0, k = 0; j <= n; j++) for (let i = 0; i <= n; i++) { v[k++] = i / n; v[k++] = j / n; }
    for (let j = 0, k = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(qT); gl.vertexAttribPointer(qT, 2, gl.FLOAT, false, 0, 0);
    return { vao, cuantos: idx.length };
  }
  const mallaCerca = crearMalla(740), mallaLejos = crearMalla(320);

  // los faros: un cuadrado, repetido en cada cima
  const vaoF = gl.createVertexArray(); gl.bindVertexArray(vaoF);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const qF = gl.getAttribLocation(pF.p, 'q'); gl.enableVertexAttribArray(qF); gl.vertexAttribPointer(qF, 2, gl.FLOAT, false, 0, 0);
  const bufF = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufF);
  const iP = gl.getAttribLocation(pF.p, 'iP'), iD = gl.getAttribLocation(pF.p, 'iD');
  gl.enableVertexAttribArray(iP); gl.vertexAttribPointer(iP, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(iP, 1);
  gl.enableVertexAttribArray(iD); gl.vertexAttribPointer(iD, 3, gl.FLOAT, false, 24, 12); gl.vertexAttribDivisor(iD, 1);

  const vaoR = gl.createVertexArray(); let nCamino = 0;
  function fijarCamino(puntos, largo) {
    // cinta sobre el suelo: cada punto da dos vértices, a los lados de la dirección del camino
    const n = puntos.length, d = new Float32Array(n * 2 * 4);
    for (let i = 0; i < n; i++) {
      const a = puntos[Math.max(0, i - 1)], b = puntos[Math.min(n - 1, i + 1)], t = norm([b[0] - a[0], b[1] - a[1], 0]), u = i / (n - 1);
      for (const [k, s] of [[0, -1], [1, 1]]) d.set([puntos[i][0] - t[1] * s * largo, puntos[i][1] + t[0] * s * largo, u, s], (i * 2 + k) * 4);
    }
    gl.bindVertexArray(vaoR);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pR.p, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 4, gl.FLOAT, false, 0, 0);
    nCamino = n * 2;
  }
  const pH = hdr ? programa(gl, VS_PANTALLA, FS_HORNEAR) : null, fbH = gl.createFramebuffer();
  const pN = hdr ? programa(gl, VS_PANTALLA, FS_NACER) : null, pL = programa(gl, VS_PANTALLA, FS_LUZ);
  const N_NACE = 1024, N_NACE_L = 384, N_LUZ = software ? 768 : 1536, N_LUZ_L = 512, PASOS = software ? 14 : 28;
  let texNaceC = null, texNaceL = null, huellaNace = '', usarNace = false;
  const nuevaLuz = (N) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, N, N, 0, gl.RG, gl.UNSIGNED_BYTE, null); for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w); return t; };
  let luzC = nuevaLuz(N_LUZ), luzCaux = nuevaLuz(N_LUZ), luzL = nuevaLuz(N_LUZ_L), luzLaux = nuevaLuz(N_LUZ_L);
  let trozo = -1;
  const BANDAS = 24;
  /** La penumbra de un trozo del mapa, sobre la textura de reserva. Sin trozo, todo de golpe. */
  function pasadaLuz(tex, N, a, b, sol, fila0 = 0, filas = N) {
    gl.useProgram(pL.p); gl.bindVertexArray(vacioVAO); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbH); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, N, N); gl.enable(gl.SCISSOR_TEST); gl.scissor(0, fila0, N, filas);
    gl.uniform3fv(pL.u.uSol, sol); gl.uniform4f(pL.u.uDom, a, a, 0, b - a); gl.uniform1f(pL.u.uPasos, PASOS);
    t2(pL.u.uCerca, 6, texCerca); t2(pL.u.uLejos, 7, texLejos);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function hornearLuz(sol) {
    pasadaLuz(luzC, N_LUZ, DOMINIO_CERCA[0], DOMINIO_CERCA[1], sol);
    pasadaLuz(luzL, N_LUZ_L, DOMINIO[0], DOMINIO[1], sol);
    trozo = -1;
  }
  /** La luz se mueve muy despacio: se rehace por bandas, repartida entre muchos cuadros, y se cambia de golpe al acabar. Devuelve true al cambiar. */
  function avanzarLuz(sol) {
    if (trozo < 0) trozo = 0;
    const f0 = Math.floor((trozo * N_LUZ) / BANDAS), f1 = Math.floor(((trozo + 1) * N_LUZ) / BANDAS);
    pasadaLuz(luzCaux, N_LUZ, DOMINIO_CERCA[0], DOMINIO_CERCA[1], sol, f0, f1 - f0);
    if (++trozo < BANDAS) return false;
    pasadaLuz(luzLaux, N_LUZ_L, DOMINIO[0], DOMINIO[1], sol);
    [luzC, luzCaux] = [luzCaux, luzC]; [luzL, luzLaux] = [luzLaux, luzL];
    trozo = -1;
    return true;
  }
  /** Mientras nace: la altura de este instante, una vez por cuadro y solo si ha cambiado. Todo lo demás la lee de aquí. */
  function hornearNace(gu, regs) {
    if (!pN) return;
    const k = `${gu.base}|${gu.roca2}|${gu.roca5}|${gu.caja}|${gu.s.join()}`;
    usarNace = true;
    if (k === huellaNace) return;
    huellaNace = k;
    if (!texNaceC) { texNaceC = gl.createTexture(); prepararTex(texNaceC, N_NACE, null); texNaceL = gl.createTexture(); prepararTex(texNaceL, N_NACE_L, null); }
    gl.useProgram(pN.p); gl.bindVertexArray(vacioVAO); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.uniform4fv(pN.u['uReg[0]'], regs); gl.uniform1f(pN.u.uBase, gu.base); gl.uniform1f(pN.u.uRoca2, gu.roca2); gl.uniform1f(pN.u.uRoca5, gu.roca5); gl.uniform1f(pN.u.uFondo, gu.caja);
    const pases = [[texNaceC, N_NACE, DOMINIO_CERCA, texCerca]];
    if (gu.caja > 0) pases.push([texNaceL, N_NACE_L, DOMINIO, texLejos]);
    for (const [t, N, [a, b], fuente] of pases) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbH); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, N, N); gl.uniform4f(pN.u.uDom, a, a, 0, b - a); t2(pN.u.uFuente, 5, fuente); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  const terminarNace = () => { usarNace = false; for (const t of [texNaceC, texNaceL]) if (t) gl.deleteTexture(t); texNaceC = texNaceL = null; huellaNace = ''; };
  const N_CERCA = 1280, N_LEJOS = 512;
  const prepararTex = (t, N, datos) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, N, N, 0, gl.RGBA, gl.FLOAT, datos);
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  };
  /** `regs`: por región, x, y, altura a y grado. Si la GPU no puede escribir en coma flotante, lo calcula JS, con menos resolución. */
  function fijarCampo(regs, regiones, grados) {
    if (!pH) { prepararTex(texCerca, 512, campoMapa(regiones, grados, 512, DOMINIO_CERCA)); prepararTex(texLejos, 256, campoMapa(regiones, grados, 256, DOMINIO)); return; }
    gl.useProgram(pH.p); gl.bindVertexArray(vacioVAO); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.uniform4fv(pH.u['uReg[0]'], regs);
    for (const [t, N, [a, b]] of [[texCerca, N_CERCA, DOMINIO_CERCA], [texLejos, N_LEJOS, DOMINIO]]) {
      prepararTex(t, N, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbH); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, N, N); gl.uniform4f(pH.u.uDom, a, a, N, b - a); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /** Lee lo horneado en un punto del mapa cercano: sirve para comprobar que la GPU y JS calculan lo mismo. */
  function leerCampo(x, y) {
    const [a, b] = DOMINIO_CERCA, i = Math.round(((x - a) / (b - a)) * (N_CERCA - 1)), j = Math.round(((y - a) / (b - a)) * (N_CERCA - 1)), d = new Float32Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbH); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texCerca, 0);
    gl.readPixels(i, j, 1, 1, gl.RGBA, gl.FLOAT, d); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { valor: Array.from(d), x: a + (i * (b - a)) / (N_CERCA - 1), y: a + (j * (b - a)) / (N_CERCA - 1) };
  }

  // destinos de dibujo: la escena, en alto rango si se puede, y dos capas a un cuarto para el resplandor
  const crearDestino = (w, h, conProfundidad) => {
    const t = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, x] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, x);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    let rb = null;
    if (conProfundidad) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    return { t, fb, rb, w, h, borrar() { gl.deleteTexture(t); gl.deleteFramebuffer(fb); if (rb) gl.deleteRenderbuffer(rb); } };
  };
  let esc = null, base = null, b1 = null, b2 = null, baseValida = false;
  /** El lienzo, a los píxeles de la pantalla; la escena, con más: lo que sobra se convierte en nitidez al bajar. */
  function ajustar(cw, ch, w, h) {
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (esc && esc.w === w && esc.h === h) return;
    for (const x of [esc, base, b1, b2]) x?.borrar();
    baseValida = false;
    esc = crearDestino(w, h, true); base = crearDestino(w, h, true); b1 = crearDestino(w >> 2 || 1, h >> 2 || 1, false); b2 = crearDestino(w >> 2 || 1, h >> 2 || 1, false);
  }
  const usarAltura = (P) => { t2(P.u.uCerca, 6, usarNace ? texNaceC : texCerca); t2(P.u.uLejos, 7, usarNace && texNaceL ? texNaceL : texLejos); };
  const t2 = (u, unidad, tex) => { gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u, unidad); };

  /** e: { vp, ojo, sol, sube, t, expo, foco:[x,y,_,fuerza], hecho, aparece, faros:Float32Array(n×6), pasos } */
  function dibujar(e) {
    const { vp, ojo, sol } = e;
    // el fondo (cielo y terreno) se guarda aparte: si nada lo ha movido, se reutiliza, y solo se redibuja lo que brilla encima
    if (e.rehacer !== false || !baseValida) {
      baseValida = true;
      gl.bindFramebuffer(gl.FRAMEBUFFER, base.fb); gl.viewport(0, 0, base.w, base.h);
      gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.depthMask(true); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST); gl.useProgram(pC.p); gl.bindVertexArray(vacioVAO);
      gl.uniformMatrix4fv(pC.u.uIVP, false, inversa(vp)); gl.uniform3fv(pC.u.uCam, ojo); gl.uniform3fv(pC.u.uSol, sol); gl.uniform1f(pC.u.uT, e.t); gl.uniform1f(pC.u.uCielo, e.nace?.cielo ?? 1); t2(pC.u.uRuido, 1, ruido);
      if ((e.nace?.cielo ?? 1) > 0) gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.useProgram(pT.p);
      gl.uniformMatrix4fv(pT.u.uVP, false, vp); gl.uniform3fv(pT.u.uCam, ojo); gl.uniform3fv(pT.u.uSol, sol); gl.uniform1f(pT.u.uT, e.t); gl.uniform4fv(pT.u.uFoco, e.foco);
      gl.uniform1f(pT.u.uMat, e.nace?.mat ?? 1); gl.uniform1f(pT.u.uCaja, e.nace?.caja ?? 1); gl.uniform1f(pT.u.uBarrido, e.nace ? -0.02 + 1.04 * e.nace.plano : 9);
      t2(pT.u.uRuido, 1, ruido); t2(pT.u.uLuzC, 2, luzC); t2(pT.u.uLuzL, 3, luzL); usarAltura(pT);
      gl.bindVertexArray(mallaCerca.vao); gl.uniform4f(pT.u.uMalla, -0.1, -0.1, 1.2, 1.2); gl.uniform1f(pT.u.uEsLejos, 0); gl.drawElements(gl.TRIANGLES, mallaCerca.cuantos, gl.UNSIGNED_INT, 0);
      if ((e.nace?.caja ?? 1) > 0) { gl.bindVertexArray(mallaLejos.vao); gl.uniform4f(pT.u.uMalla, -1, -1, 3, 3); gl.uniform1f(pT.u.uEsLejos, 1); gl.drawElements(gl.TRIANGLES, mallaLejos.cuantos, gl.UNSIGNED_INT, 0); }
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, base.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, esc.fb);
    gl.blitFramebuffer(0, 0, base.w, base.h, 0, 0, esc.w, esc.h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, esc.fb); gl.viewport(0, 0, esc.w, esc.h);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    // camino: encendido sobre el suelo y, muy tenue, a través de las montañas
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    if (nCamino) {
      gl.useProgram(pR.p); gl.bindVertexArray(vaoR);
      gl.uniformMatrix4fv(pR.u.uVP, false, vp); gl.uniform1f(pR.u.uZ, 0.0085); gl.uniform1f(pR.u.uT, e.t); gl.uniform1f(pR.u.uHecho, e.hecho); gl.uniform1f(pR.u.uAparece, e.aparece); gl.uniform2fv(pR.u.uCometa, e.cometa ?? [0, 0]); usarAltura(pR);
      gl.uniform1f(pR.u.uFuerza, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nCamino);
      gl.disable(gl.DEPTH_TEST); gl.uniform1f(pR.u.uFuerza, 0.1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nCamino); gl.enable(gl.DEPTH_TEST);
    }
    // faros
    gl.useProgram(pF.p); gl.bindVertexArray(vaoF);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufF); gl.bufferData(gl.ARRAY_BUFFER, e.faros, gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(pF.u.uVP, false, vp); gl.uniform2f(pF.u.uRes, canvas.clientWidth || esc.w, canvas.clientHeight || esc.h); gl.uniform1f(pF.u.uT, e.t);
    const n = e.faros.length / 6;
    gl.disable(gl.DEPTH_TEST);
    if ((e.nace?.camino ?? 1) > 0) {
      gl.uniform1f(pF.u.uHaz, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      gl.uniform1f(pF.u.uHaz, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    gl.disable(gl.BLEND); gl.depthMask(true);
    // resplandor
    gl.useProgram(pB.p); gl.bindVertexArray(vacioVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b1.fb); gl.viewport(0, 0, b1.w, b1.h); t2(pB.u.uTex, 0, esc.t); gl.uniform2f(pB.u.uDir, 2 / b1.w, 0); gl.uniform1f(pB.u.uCorte, hdr ? 1.05 : 0.8); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b2.fb); t2(pB.u.uTex, 0, b1.t); gl.uniform2f(pB.u.uDir, 0, 2 / b1.h); gl.uniform1f(pB.u.uCorte, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // final
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(pS.p); t2(pS.u.uTex, 0, esc.t); t2(pS.u.uBri, 1, b2.t); gl.uniform1f(pS.u.uExpo, e.expo); gl.uniform1f(pS.u.uT, e.t); gl.uniform2f(pS.u.uPx, 1 / canvas.width, 1 / canvas.height);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { gl, ajustar, dibujar, fijarCampo, fijarCamino, leerCampo, hornearLuz, avanzarLuz, hornearNace, terminarNace };
}
