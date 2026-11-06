// El paisaje de la portada, en WebGL2: montañas con sombras de borde suave, niebla en los valles, un camino que fluye y faros en las cimas.
// El sentido del color es el del curso: azul y turquesa para lo que aún está por explorar, oro solo para lo que dominas.
const ESCZ = 0.46, MALLA = 460;

const CIELO = `
vec3 cielo(vec3 v,vec3 sol){
 float e=max(v.z,0.),s=max(dot(v,sol),0.);
 vec3 c=mix(vec3(.0085,.019,.044),vec3(.0012,.0028,.009),smoothstep(0.,.26,e));
 c+=vec3(.10,.17,.27)*exp(-e*30.)*.07;
 c+=vec3(.42,.52,.70)*pow(s,40.)*.07;
 c+=vec3(.86,.90,1.)*pow(s,400.)*.3;
 return c;}`;

const VS_TERRENO = `#version 300 es
precision highp float;
in vec2 q;uniform mat4 uVP;uniform sampler2D uAlt;uniform float uSube;
out vec3 vP;
void main(){float h=texture(uAlt,q).r*uSube*${ESCZ.toFixed(2)};vec2 p=q*3.-1.;vP=vec3(p,h);gl_Position=uVP*vec4(vP,1.);}`;

const FS_TERRENO = `#version 300 es
precision highp float;precision highp sampler2D;
in vec3 vP;uniform sampler2D uAlt,uRuido;uniform vec3 uCam,uSol;uniform float uSube,uT;uniform vec4 uFoco;uniform float uPasos;
out vec4 o;
${CIELO}
float alt(vec2 p){return texture(uAlt,(p+1.)/3.).r*uSube*${ESCZ.toFixed(2)};}
float iso(float v,float paso){float x=v/paso,w=max(fwidth(x),1e-4);return 1.-smoothstep(0.,1.4,abs(fract(x-.5)-.5)/w);}
void main(){
 vec2 p=vP.xy;float z=vP.z,hn=z/${ESCZ.toFixed(2)}/max(uSube,.02);
 float e=.0055;vec3 n=normalize(vec3(alt(p-vec2(e,0.))-alt(p+vec2(e,0.)),alt(p-vec2(0.,e))-alt(p+vec2(0.,e)),2.*e));
 vec3 grano=texture(uRuido,p*7.).rgb-.5,fino=texture(uRuido,p*31.).rgb-.5;
 vec3 nd=normalize(n+vec3(grano.xy*.16+fino.xy*.12,0.));
 float dom=texture(uAlt,(p+1.)/3.).g;
 vec3 v=normalize(uCam-vP);float dist=length(uCam-vP);
 // penumbra: la luz se tapa poco a poco, y cuanto más lejos está lo que tapa, más ancho es el borde
 float luz=1.;{vec3 r=vP+vec3(n.xy*.004,.003);float t=.012;for(int i=0;i<int(uPasos);i++){vec3 s=r+uSol*t;float d=s.z-alt(s.xy);luz=min(luz,7.5*d/t);if(luz<.001)break;t+=clamp(d*.75,.007,.055);if(t>1.1)break;}luz=clamp(luz,0.,1.);luz=luz*luz*(3.-2.*luz);}
 float dif=max(dot(nd,uSol),0.);
 float pendiente=1.-n.z;
 float oc=0.;for(int i=0;i<4;i++){float a=float(i)*1.5708+.6;oc+=max(alt(p+vec2(cos(a),sin(a))*.035)-z,0.);}oc=exp(-oc*6.5);
 vec3 roca=mix(vec3(.022,.052,.105),vec3(.075,.235,.285),smoothstep(.08,.72,hn));
 roca=mix(roca,vec3(.020,.038,.075),smoothstep(.12,.55,pendiente)*.55);
 roca*=.82+.5*grano.b;
 vec3 oro=vec3(.86,.60,.13);
 roca=mix(roca,oro*(.62+.62*grano.b)*(.75+.5*smoothstep(.25,.75,hn)),dom*.92);
 vec3 lunar=vec3(.72,.88,1.)*2.8,ambiente=vec3(.04,.08,.16)*(.45+.55*nd.z)+vec3(.016,.034,.07)*max(dot(nd,v),0.);
 vec3 c=roca*(lunar*dif*luz+ambiente*oc*1.6+vec3(.16,.10,.024)*dom*(.4+.6*oc));
 c+=vec3(.26,.40,.62)*pow(1.-max(dot(n,v),0.),4.)*.12*oc;
 // curvas de nivel, como en un mapa: más vivas junto a lo que miras
 float cerca=exp(-dot(p-uFoco.xy,p-uFoco.xy)/.028)*uFoco.w;
 float dentro=smoothstep(-.02,.06,p.x)*smoothstep(1.02,.94,p.x)*smoothstep(-.02,.06,p.y)*smoothstep(1.02,.94,p.y);
 float linea=iso(hn,.07)*smoothstep(.1,.16,hn);
 c+=mix(vec3(.16,.50,.54),vec3(1.,.74,.26),dom)*linea*(.05*dentro+.36*cerca+.1*dom*dentro)*exp(-dist*.5);
 c+=mix(vec3(.05,.16,.22),vec3(.42,.28,.05),dom)*cerca*.55*(.35+dif);
 // bruma de los valles, arrastrada muy despacio
 vec2 w=p*2.1+vec2(uT*.006,-uT*.004);float n1=texture(uRuido,w).r,n2=texture(uRuido,w*2.3-vec2(uT*.009,0.)).g,bruma=smoothstep(.34,.72,n1*.65+n2*.35);
 float valle=smoothstep(.13,.05,hn)*bruma;
 c=mix(c,vec3(.05,.10,.19)*(.3+.7*luz),valle*.55);
 // lo lejano se disuelve en el cielo: el terreno no tiene borde
 vec3 h=cielo(-v,uSol);
 float r=length(p-.5),nieb=1.-exp(-pow(max(dist-1.9,0.)*.55,1.6));
 nieb=max(nieb,smoothstep(.95,1.28,r));
 if(nieb>.992)discard;
 c=mix(c,h,clamp(nieb,0.,1.));
 o=vec4(c,1.);}`;

const VS_PANTALLA = `#version 300 es
out vec2 u;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);u=p*.5+.5;gl_Position=vec4(p,.9999,1.);}`;

const FS_CIELO = `#version 300 es
precision highp float;
in vec2 u;uniform mat4 uIVP;uniform vec3 uCam,uSol;uniform sampler2D uRuido;uniform float uT;out vec4 o;
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
  vec3 lu=vec3(1.,.97,.9)*(.72+2.6*(mar-.5));
  c=mix(c,lu*(.012+1.25*pen)+vec3(.075,.022,.016)*(1.-pen),disco);
 }
 o=vec4(c,1.);}`;

const VS_CAMINO = `#version 300 es
precision highp float;
in vec4 a;uniform mat4 uVP;uniform sampler2D uAlt;uniform float uSube,uAncho,uZ;
out vec2 w;
void main(){vec2 p=a.xy;w=vec2(a.z,a.w);float h=texture(uAlt,(p+1.)/3.).r*uSube*${ESCZ.toFixed(2)};gl_Position=uVP*vec4(p,h+uZ,1.);}`;

const FS_CAMINO = `#version 300 es
precision highp float;
in vec2 w;uniform float uT,uHecho,uFuerza,uAparece;out vec4 o;
void main(){
 float d=abs(w.y),u=w.x,hecho=step(u,uHecho);
 if(u>uAparece)discard;
 float nucleo=smoothstep(.34,.12,d),halo=exp(-d*d*5.);
 float pulso=pow(.5+.5*sin(u*70.-uT*1.1),7.);
 vec3 oro=vec3(1.,.74,.24),frio=vec3(.62,.80,.95);
 float trazos=smoothstep(.34,.42,abs(fract(u*46.)-.5));
 vec3 c=mix(frio*(nucleo*1.1*trazos+halo*.07),oro*(nucleo*(1.+1.6*pulso)+halo*(.16+.34*pulso)),hecho);
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
in vec2 u;uniform sampler2D uTex,uBri;uniform float uExpo,uT;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec3 c=texture(uTex,u).rgb+texture(uBri,u).rgb*.85;
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

export function crearPaisaje(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  const hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
  const pT = programa(gl, VS_TERRENO, FS_TERRENO), pC = programa(gl, VS_PANTALLA, FS_CIELO), pR = programa(gl, VS_CAMINO, FS_CAMINO), pF = programa(gl, VS_FARO, FS_FARO), pB = programa(gl, VS_PANTALLA, FS_BRILLO), pS = programa(gl, VS_PANTALLA, FS_FINAL);
  const ruido = texturaRuido(gl), alt = gl.createTexture(), vacioVAO = gl.createVertexArray();

  // la malla del terreno
  const vaoT = gl.createVertexArray(); gl.bindVertexArray(vaoT);
  const v = new Float32Array((MALLA + 1) * (MALLA + 1) * 2), idx = new Uint32Array(MALLA * MALLA * 6);
  for (let j = 0, k = 0; j <= MALLA; j++) for (let i = 0; i <= MALLA; i++) { v[k++] = i / MALLA; v[k++] = j / MALLA; }
  for (let j = 0, k = 0; j < MALLA; j++) for (let i = 0; i < MALLA; i++) { const a = j * (MALLA + 1) + i, b = a + 1, c = a + MALLA + 1, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const qT = gl.getAttribLocation(pT.p, 'q'); gl.enableVertexAttribArray(qT); gl.vertexAttribPointer(qT, 2, gl.FLOAT, false, 0, 0);

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
  function fijarCampo(datos, N) {
    gl.bindTexture(gl.TEXTURE_2D, alt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, N, N, 0, gl.RG, gl.FLOAT, datos);
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
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
  let esc = null, b1 = null, b2 = null;
  function ajustar(w, h) {
    if (esc && esc.w === w && esc.h === h) return;
    canvas.width = w; canvas.height = h;
    for (const x of [esc, b1, b2]) x?.borrar();
    esc = crearDestino(w, h, true); b1 = crearDestino(w >> 2 || 1, h >> 2 || 1, false); b2 = crearDestino(w >> 2 || 1, h >> 2 || 1, false);
  }
  const t2 = (u, unidad, tex) => { gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u, unidad); };

  /** e: { vp, ojo, sol, sube, t, expo, foco:[x,y,_,fuerza], hecho, aparece, faros:Float32Array(n×6), pasos } */
  function dibujar(e) {
    const { vp, ojo, sol } = e;
    gl.bindFramebuffer(gl.FRAMEBUFFER, esc.fb); gl.viewport(0, 0, esc.w, esc.h);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.depthMask(true); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // cielo
    gl.disable(gl.DEPTH_TEST); gl.useProgram(pC.p); gl.bindVertexArray(vacioVAO);
    gl.uniformMatrix4fv(pC.u.uIVP, false, inversa(vp)); gl.uniform3fv(pC.u.uCam, ojo); gl.uniform3fv(pC.u.uSol, sol); gl.uniform1f(pC.u.uT, e.t); t2(pC.u.uRuido, 1, ruido);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // terreno
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.useProgram(pT.p); gl.bindVertexArray(vaoT);
    gl.uniformMatrix4fv(pT.u.uVP, false, vp); gl.uniform3fv(pT.u.uCam, ojo); gl.uniform3fv(pT.u.uSol, sol); gl.uniform1f(pT.u.uSube, e.sube); gl.uniform1f(pT.u.uT, e.t); gl.uniform4fv(pT.u.uFoco, e.foco); gl.uniform1f(pT.u.uPasos, e.pasos);
    t2(pT.u.uAlt, 0, alt); t2(pT.u.uRuido, 1, ruido);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
    // camino: encendido sobre el suelo y, muy tenue, a través de las montañas
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    if (nCamino) {
      gl.useProgram(pR.p); gl.bindVertexArray(vaoR);
      gl.uniformMatrix4fv(pR.u.uVP, false, vp); gl.uniform1f(pR.u.uSube, e.sube); gl.uniform1f(pR.u.uZ, 0.0085); gl.uniform1f(pR.u.uT, e.t); gl.uniform1f(pR.u.uHecho, e.hecho); gl.uniform1f(pR.u.uAparece, e.aparece); t2(pR.u.uAlt, 0, alt);
      gl.uniform1f(pR.u.uFuerza, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nCamino);
      gl.disable(gl.DEPTH_TEST); gl.uniform1f(pR.u.uFuerza, 0.1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nCamino); gl.enable(gl.DEPTH_TEST);
    }
    // faros
    gl.useProgram(pF.p); gl.bindVertexArray(vaoF);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufF); gl.bufferData(gl.ARRAY_BUFFER, e.faros, gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(pF.u.uVP, false, vp); gl.uniform2f(pF.u.uRes, canvas.clientWidth || esc.w, canvas.clientHeight || esc.h); gl.uniform1f(pF.u.uT, e.t);
    const n = e.faros.length / 6;
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1f(pF.u.uHaz, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    gl.uniform1f(pF.u.uHaz, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    gl.disable(gl.BLEND); gl.depthMask(true);
    // resplandor
    gl.useProgram(pB.p); gl.bindVertexArray(vacioVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b1.fb); gl.viewport(0, 0, b1.w, b1.h); t2(pB.u.uTex, 0, esc.t); gl.uniform2f(pB.u.uDir, 2 / b1.w, 0); gl.uniform1f(pB.u.uCorte, hdr ? 0.75 : 0.6); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b2.fb); t2(pB.u.uTex, 0, b1.t); gl.uniform2f(pB.u.uDir, 0, 2 / b1.h); gl.uniform1f(pB.u.uCorte, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // final
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(pS.p); t2(pS.u.uTex, 0, esc.t); t2(pS.u.uBri, 1, b2.t); gl.uniform1f(pS.u.uExpo, e.expo); gl.uniform1f(pS.u.uT, e.t);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { gl, ajustar, dibujar, fijarCampo, fijarCamino };
}
