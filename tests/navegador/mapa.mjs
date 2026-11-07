import { t, afirmar } from '../banco.mjs';

const abrir = async (ir, pg) => { await pg.emulateMedia({ reducedMotion: 'reduce' }); await ir('index.html'); await pg.waitForFunction(() => window.mapa); };
const moverA = async (pg, id) => { const [x, y] = await pg.evaluate((i) => mapa.aPantalla(i), id); await pg.mouse.move(x, y); return [x, y]; };

t('mapa: elegido un capítulo, pasar el ratón por otro no cambia sus temas', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const [x, y] = await moverA(pg, 1);
  await pg.mouse.click(x, y);
  await pg.waitForFunction(() => document.querySelector('.mapa-panel h2')?.textContent.includes('El borde'));
  await pg.waitForTimeout(1200);
  for (const id of [3, 5, 2, 6]) { await moverA(pg, id); await pg.waitForTimeout(60); }
  afirmar((await pg.textContent('.mapa-panel h2')).includes('El borde'), 'el capítulo cambió con solo pasar el ratón');
  afirmar(await pg.locator('.mapa-panel li').count() === 10, 'cambiaron los temas');
});

t('mapa: sin nada elegido, pasar el ratón tampoco cambia el panel, y resalta en el propio mapa', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const antes = await pg.textContent('.mapa-panel');
  await moverA(pg, 3);
  await pg.waitForTimeout(100);
  afirmar((await pg.textContent('.mapa-panel')) === antes, 'el panel cambió');
  afirmar((await pg.locator('.mapa-rotulo.activa').textContent()).includes('El álgebra'), 'no se resalta en el mapa');
});

t('mapa: clic abre sus conceptos, con enlace y grado', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const [x, y] = await moverA(pg, 1);
  await pg.mouse.click(x, y);
  afirmar(await pg.locator('.mapa-conceptos a[href="concepto.html?c=1-1-quien-es-alto"]').count() === 1, 'sin enlace al concepto');
  afirmar(await pg.locator('.mapa-panel li').count() === 10, 'no están los 10');
});

t('mapa: la región 6 enlaza todas sus paradas, sin ninguna pendiente', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const [x, y] = await moverA(pg, 6);
  await pg.mouse.click(x, y);
  afirmar(await pg.locator('.mapa-panel li a').count() === 7, 'faltan enlaces');
  afirmar(!(await pg.textContent('.mapa-panel')).includes('aún no'), 'dice que falta algo');
});

t('mapa: el progreso se refleja, y empezar de cero pide confirmación y lo borra', async ({ pg, ir }) => {
  await pg.addInitScript(() => { if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.setItem('penumbra-progreso-v1', JSON.stringify({ '1-1-quien-es-alto': { borrosidad: 1, 'grado-174': 1 } })); } });
  await abrir(ir, pg);
  await pg.mouse.click(...(await moverA(pg, 1)));
  await pg.waitForFunction(() => document.querySelector('.mapa-panel')?.textContent.includes('0,10'));
  await pg.click('text=Empezar de cero');
  afirmar((await pg.evaluate(() => localStorage.getItem('penumbra-progreso-v1'))) !== null, 'borró sin confirmar');
  await pg.click('text=Sí, borrar todo');
  afirmar((await pg.evaluate(() => localStorage.getItem('penumbra-progreso-v1'))) === null, 'no borró');
  await pg.waitForFunction(() => document.querySelector('.mapa-panel')?.textContent.includes('0,00'));
});

t('mapa: arrastrar gira la cámara y no abre nada', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const antes = await pg.evaluate(() => mapa.camara().yaw);
  const [x, y] = await moverA(pg, 5);
  await pg.mouse.down(); await pg.mouse.move(x + 60, y + 10); await pg.mouse.up();
  afirmar((await pg.evaluate(() => mapa.camara().yaw)) !== antes, 'no gira');
  afirmar(await pg.locator('.mapa-panel li').count() === 0, 'abrió la lista');
});

t('mapa: sin WebGL2 hay una lista normal', async ({ pg, ir }) => {
  await pg.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (k, ...r) { return k === 'webgl2' ? null : o.call(this, k, ...r); };
  });
  await ir('index.html');
  await pg.waitForSelector('.mapa-lista');
  afirmar(await pg.locator('.mapa-lista a[href="concepto.html?c=1-8-cortes-alfa"]').count() === 1, 'sin enlaces');
  afirmar(await pg.locator('.mapa-lista h2').count() === 13, 'faltan regiones');
});

t('mapa: de entrada dice cuál es tu siguiente parada, y lleva a ella', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const txt = await pg.textContent('.mapa-panel');
  afirmar(txt.includes('Tu siguiente parada') && txt.includes('¿Quién es alto?'), txt);
  await pg.click('.mapa-panel .boton-seguir');
  await pg.waitForURL(/c=1-1-quien-es-alto/);
});

t('mapa: dominado un concepto, la parada pasa a la siguiente', async ({ pg, ir }) => {
  await pg.addInitScript(() => localStorage.setItem('penumbra-progreso-v1', JSON.stringify({ '1-1-quien-es-alto': { borrosidad: 1, 'grado-174': 1 } })));
  await abrir(ir, pg);
  afirmar((await pg.textContent('.mapa-panel')).includes('La paradoja del montón'), 'no avanzó');
});

t('mapa: la GPU y JS calculan la misma altura', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const { alturaMapa } = await import('../../motor/alturaMapa.js');
  const { CATALOGO } = await import('../../contenido/catalogo.js');
  for (const [x, y] of [[0.16, 0.2], [0.33, 0.41], [0.77, 0.63], [0.05, 0.95]]) {
    const r = await pg.evaluate(([a, b]) => mapa.campo(a, b), [x, y]);
    const js = alturaMapa(r.x, r.y, Array(8).fill(0), CATALOGO.filter((c) => !c.lado));
    afirmar(Math.abs(r.valor[0] - js) < 2e-3, `(${x}, ${y}): GPU ${r.valor[0]}, JS ${js}`);
  }
});
t('mapa: la primera vez nace de su fórmula, se puede saltar, y no se repite en la sesión', async ({ pg, ir }) => {
  await ir('index.html');
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.evaluate(() => mapa.modo())) === 'nace', 'no nace');
  await pg.evaluate(() => mapa.fijarT(5));
  afirmar((await pg.textContent('.nace-formula')).includes('z'), 'sin fórmula');
  await pg.click('.nace-saltar');
  afirmar((await pg.evaluate(() => mapa.modo())) === 'normal', 'no saltó');
  afirmar(await pg.locator('.mapa-nace').count() === 0, 'quedó la capa');
  await pg.reload();
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.evaluate(() => mapa.modo())) === 'normal', 'se repitió');
});
t('mapa: el viaje lleva a la parada de destino, y se puede saltar', async ({ pg, ir }) => {
  await ir('index.html?viaje=2-1-parametrizadas');
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.evaluate(() => mapa.modo())) === 'viaje', 'no viaja');
  afirmar((await pg.textContent('.viaje-tarjeta')).includes('Capítulo 2'), 'sin tarjeta');
  await pg.keyboard.press('Escape');
  await pg.waitForURL(/c=2-1-parametrizadas/);
});
t('mapa: la última parada de un capítulo viaja; Enter también avanza desde «Lo siguiente»', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await ir('concepto.html?c=1-10-convexidad#llegada');
  await pg.waitForFunction(() => window.pagina);
  afirmar((await pg.textContent('#llegada .boton-seguir')).includes('La forma'), 'no anuncia el capítulo');
  afirmar((await pg.getAttribute('#llegada .boton-seguir', 'href')).includes('viaje='), 'no viaja');
  await pg.goto('about:blank');
  await ir('concepto.html?c=1-1-quien-es-alto#llegada');
  await pg.waitForFunction(() => window.pagina);
  await pg.keyboard.press('ArrowRight');
  await pg.waitForURL(/c=1-2-monton/);
});

t('mapa: sin GPU, en reposo no dibuja nada', async ({ pg, ir }) => {
  await pg.addInitScript(() => sessionStorage.setItem('penumbra-mapa-nacio', '1'));
  await ir('index.html');
  await pg.waitForFunction(() => window.mapa);
  await pg.waitForTimeout(9000); // con CPU, cada cuadro de la entrada tarda: hay que dejarla acabar
  const n = await pg.evaluate(() => new Promise((res) => {
    const gl = document.querySelector('.mapa-lienzo canvas').getContext('webgl2'); let k = 0;
    for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced']) { const o = gl[f].bind(gl); gl[f] = (...a) => { k++; return o(...a); }; }
    setTimeout(() => res(k), 700);
  }));
  afirmar(n === 0, `${n} dibujos en reposo`);
});

t('mapa: en la sombra de la luna hay una luz; tocarla lleva al amanecer', async ({ pg, ir }) => {
  await abrir(ir, pg);
  await pg.waitForTimeout(300);
  afirmar((await pg.evaluate(() => { const c = document.querySelector('.mapa-chispa'); return !c.hidden; })), 'no se ve la luz');
  await pg.evaluate(() => document.querySelector('.mapa-chispa').click());
  await pg.waitForURL(/lado=alba/);
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.textContent('.mapa-indice')).includes('La neurona difusa'), 'no es el amanecer');
  afirmar((await pg.textContent('.mapa-cabecera')).includes('A'), 'sin título');
});
t('mapa: el cruce nace de la red, se puede saltar y deja el amanecer', async ({ pg, ir }) => {
  await ir('index.html?lado=alba&cruce=1');
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.evaluate(() => mapa.modo())) === 'cruce', 'no cruza');
  await pg.evaluate(() => mapa.fijarT(30));
  await pg.click('.mapa-cruce .nace-saltar');
  afirmar((await pg.evaluate(() => mapa.modo())) === 'normal', 'no saltó');
  afirmar(await pg.locator('.mapa-cruce').count() === 0, 'quedó la capa');
});

t('mapa: la Luna no se desplaza con el tiempo, y no lleva cartel', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const pos = async (v) => { await pg.evaluate((x) => mapa.fijarT(x), v); await pg.waitForTimeout(250); return pg.evaluate(() => document.querySelector('.mapa-chispa').style.transform); };
  const a = await pos(13), b = await pos(53);
  afirmar(a === b, `se mueve: ${a} y ${b}`);
  afirmar(await pg.locator('.luna-pista').count() === 0, 'sigue el cartel');
});

t('mapa: desde el amanecer se llega al Horizonte, y se puede volver', async ({ pg, ir }) => {
  await ir('index.html?lado=alba');
  await pg.waitForFunction(() => window.mapa);
  afirmar(await pg.locator('a[href="horizonte.html"]').count() === 1, 'sin enlace al Horizonte');
  await ir('horizonte.html');
  afirmar(await pg.locator('a.volver[href="index.html?lado=alba"]').count() === 1, 'sin vuelta');
});
