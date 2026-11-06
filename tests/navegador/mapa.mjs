import { t, afirmar } from '../banco.mjs';

const abrir = async (ir, pg) => { await ir('index.html'); await pg.waitForFunction(() => window.mapa); };
const moverA = async (pg, id) => { const [x, y] = await pg.evaluate((i) => mapa.aPantalla(i), id); await pg.mouse.move(x, y); return [x, y]; };

t('mapa: pasar el ratón por una región muestra título, lema y grado', async ({ pg, ir }) => {
  await abrir(ir, pg);
  await moverA(pg, 3);
  await pg.waitForFunction(() => document.querySelector('.mapa-panel h2')?.textContent.includes('El álgebra'));
  const txt = await pg.textContent('.mapa-panel');
  afirmar(txt.includes('Y, o, no') && txt.includes('0,00'), txt);
});

t('mapa: clic abre sus conceptos, con enlace y grado', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const [x, y] = await moverA(pg, 1);
  await pg.mouse.click(x, y);
  afirmar(await pg.locator('.mapa-panel a[href="concepto.html?c=1-1-quien-es-alto"]').count() === 1, 'sin enlace al concepto');
  afirmar(await pg.locator('.mapa-panel li').count() === 10, 'no están los 10');
});

t('mapa: las regiones pendientes indican que aún no están, sin enlace roto', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const [x, y] = await moverA(pg, 6);
  await pg.mouse.click(x, y);
  afirmar(await pg.locator('.mapa-panel li a').count() === 0, 'hay enlaces a lo que no existe');
  afirmar((await pg.textContent('.mapa-panel')).includes('aún no'), 'no lo avisa');
});

t('mapa: el progreso se refleja, y empezar de cero pide confirmación y lo borra', async ({ pg, ir }) => {
  await pg.addInitScript(() => { if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.setItem('penumbra-progreso-v1', JSON.stringify({ '1-1-quien-es-alto': { borrosidad: 1, 'grado-174': 1 } })); } });
  await abrir(ir, pg);
  await moverA(pg, 1);
  await pg.waitForFunction(() => document.querySelector('.mapa-panel')?.textContent.includes('0,10'));
  await pg.click('text=Empezar de cero');
  afirmar((await pg.evaluate(() => localStorage.getItem('penumbra-progreso-v1'))) !== null, 'borró sin confirmar');
  await pg.click('text=Sí, borrar todo');
  afirmar((await pg.evaluate(() => localStorage.getItem('penumbra-progreso-v1'))) === null, 'no borró');
  await moverA(pg, 1);
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
  afirmar(await pg.locator('.mapa-lista h2').count() === 8, 'faltan regiones');
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
