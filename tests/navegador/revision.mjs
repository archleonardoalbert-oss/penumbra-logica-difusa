import { t, afirmar } from '../banco.mjs';
import { todosLosConceptos } from '../../contenido/catalogo.js';

const abrir = async (pg, ir, ruta) => { await pg.emulateMedia({ reducedMotion: 'reduce' }); await ir(ruta); await pg.waitForFunction(() => document.querySelector('.etapas') || document.querySelector('.mensaje')); };
const arrastrar = async (pg, x, y, dx) => { await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x + dx, y, { steps: 4 }); await pg.mouse.up(); };

t('revisión: en 1-1 se agarra la línea por donde se ve', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-1-quien-es-alto#toca');
  await pg.waitForTimeout(150);
  const antes = await pg.evaluate(() => pagina.escena.estado().e.altura[0]);
  const [x, y] = await pg.evaluate(() => { const [px] = pagina.escena.aPantalla([pagina.escena.estado().e.altura[0], 0.9]); const r = document.querySelector('.lienzo').getBoundingClientRect(); return [px, r.top + r.height * 0.3]; });
  await arrastrar(pg, x, y, 60);
  const tras = await pg.evaluate(() => pagina.escena.estado().e.altura[0]);
  afirmar(tras > antes + 2, `no se movió: ${antes} → ${tras}`);
});

t('revisión: en 1-10 se mueve el punto que pulsas, no otro', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-10-convexidad#toca');
  await pg.waitForTimeout(200);
  const [x, y, x2a] = await pg.evaluate(() => { const e = pagina.escena, d = e.entradas.definicion.x1, [px, py] = e.aPantalla([e.estado().e.x1[0], 0.5], d); return [px, py, e.estado().e.x2[0]]; });
  await arrastrar(pg, x, y, -15);
  const s = await pg.evaluate(() => [pagina.escena.estado().e.x1[0], pagina.escena.estado().e.x2[0]]);
  afirmar(s[1] === x2a, `movió x2: ${x2a} → ${s[1]}`);
  afirmar(s[0] !== 0.45, 'x1 no se movió');
});

t('revisión: un reto de escena abre en el reposo, aunque entres directo a Demuéstralo', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-3-conjunto-difuso#demuestra');
  const s = await pg.evaluate(() => pagina.escena.estado());
  afirmar(s.paso === 3 && s.p === 1, JSON.stringify({ paso: s.paso, p: s.p }));
});

t('revisión: volver a Tócalo no repite la animación del último paso', async ({ pg, ir }) => {
  await ir('concepto.html?c=1-1-quien-es-alto#toca');
  await pg.waitForFunction(() => window.pagina);
  await pg.waitForFunction(() => pagina.escena.estado().p === 1);
  await pg.evaluate(() => pagina.irA(4));
  await pg.waitForTimeout(600);
  await pg.evaluate(() => pagina.irA(2));
  await pg.waitForTimeout(600);
  afirmar((await pg.evaluate(() => pagina.escena.estado().p)) === 1, 'se reinició');
});

t('revisión: con localStorage bloqueado, el progreso sobrevive a cambiar de página', async ({ pg, ir }) => {
  await pg.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  await abrir(pg, ir, 'concepto.html?c=1-2-monton#demuestra');
  await pg.fill('#reto-verdad-tras-n input', '0,7');
  await pg.click('#reto-verdad-tras-n >> text=Comprobar');
  await abrir(pg, ir, 'concepto.html?c=1-3-conjunto-difuso#pregunta');
  await abrir(pg, ir, 'concepto.html?c=1-2-monton#demuestra');
  afirmar(+(await pg.getAttribute('.grado', 'data-valor')) === 0.5, 'se perdió');
});

t('revisión: sin tampoco sessionStorage, dura igualmente en la pestaña', async ({ pg, ir }) => {
  await pg.addInitScript(() => { for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(window, k, { get() { throw new Error('bloqueado'); } }); });
  await abrir(pg, ir, 'concepto.html?c=1-2-monton#demuestra');
  await pg.fill('#reto-verdad-tras-n input', '0,7');
  await pg.click('#reto-verdad-tras-n >> text=Comprobar');
  await abrir(pg, ir, 'concepto.html?c=1-3-conjunto-difuso#pregunta');
  await abrir(pg, ir, 'concepto.html?c=1-2-monton#demuestra');
  afirmar(+(await pg.getAttribute('.grado', 'data-valor')) === 0.5, 'se perdió');
});

t('revisión: sin WebGL2 se leen todos los pasos de Míralo', async ({ pg, ir }) => {
  await pg.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...r) { return k === 'webgl2' ? null : o.call(this, k, ...r); }; });
  await abrir(pg, ir, 'concepto.html?c=1-8-cortes-alfa#mira');
  for (let i = 0; i < 4; i++) { afirmar((await pg.textContent('.pie-etapa .boton-seguir')).includes('Siguiente paso'), `paso ${i}`); await pg.click('.pie-etapa .boton-seguir'); }
  afirmar((await pg.textContent('.paso-texto.actual')).includes('anidan'), 'no llegó al último paso');
});

t('revisión: la revelación de valientes no se pierde al ir y volver', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-9-representacion#entiende');
  for (let i = 0; i < 40 && !(await pg.locator('.boton-valiente').count()); i++) await pg.click('.pie-etapa .boton-seguir');
  await pg.click('.boton-valiente');
  await pg.waitForSelector('.latido .razonamiento', { state: 'visible' });
  await pg.keyboard.press('ArrowLeft');
  await pg.keyboard.press('ArrowRight');
  afirmar(await pg.locator('.latido .razonamiento').isVisible(), 'hay que volver a pasar la cinemática');
});

t('revisión: los pasos de una demostración conservan el enunciado a la vista', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-2-monton#entiende');
  for (let i = 0; i < 40 && !(await pg.locator('.latido .razonamiento').count()); i++) await pg.click('.pie-etapa .boton-seguir');
  afirmar((await pg.textContent('.latido')).includes('Queremos ver'), 'sin enunciado');
});

t('revisión: un deslizador muestra su valor', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-1-quien-es-alto#toca');
  afirmar((await pg.textContent('.entrada output')) === '2,8', await pg.textContent('.entrada'));
});

t('revisión: la siguiente parada sigue a la vista al abrir una región', async ({ pg, ir }) => {
  await ir('index.html');
  await pg.waitForFunction(() => window.mapa);
  const [x, y] = await pg.evaluate(() => mapa.aPantalla(3));
  await pg.mouse.click(x, y);
  const txt = await pg.textContent('.mapa-panel');
  afirmar(txt.includes('El álgebra') && txt.includes('¿Quién es alto?'), txt.slice(0, 200));
});

t('revisión: Enter en «De dónde sale esto» lo abre, y no pasa de etapa', async ({ pg, ir }) => {
  await abrir(pg, ir, 'concepto.html?c=1-8-cortes-alfa#entiende');
  for (let i = 0; i < 40 && !(await pg.locator('.de-donde').count()); i++) await pg.click('.pie-etapa .boton-seguir');
  await pg.focus('.de-donde summary');
  await pg.keyboard.press('Enter');
  afirmar(await pg.locator('#rigor').isVisible(), 'pasó de etapa');
});

for (const f of todosLosConceptos().filter((c) => c.estado === 'listo')) {
  t(`revisión ${f.id}: ninguna fórmula rota ni nada recortado, en ninguna etapa, a 1280×720`, async ({ pg, ir }) => {
    await pg.setViewportSize({ width: 1280, height: 720 });
    await abrir(pg, ir, `concepto.html?c=${f.id}#entiende`);
    const malas = async () => pg.locator('.katex-error').count();
    let total = 0;
    for (let i = 0; i < 60; i++) {
      total += await malas();
      const r = await pg.evaluate(() => { const m = document.querySelector('.latido-marco'); return m.scrollHeight - m.clientHeight; });
      afirmar(r <= 140, `latido ${i}: sobran ${r} px de texto`);
      if (!(await pg.textContent('.pie-etapa .boton-seguir')).startsWith('Seguir')) break;
      await pg.click('.pie-etapa .boton-seguir');
    }
    afirmar(total === 0, `${total} fórmulas con error`);
    for (let e = 0; e < 6; e++) {
      await pg.evaluate((i) => pagina.irA(i), e);
      await pg.waitForTimeout(30);
      const o = await pg.evaluate(() => { const c = document.querySelector('.escenario'); return c.scrollHeight - c.clientHeight; });
      afirmar(o <= 1, `etapa ${e}: se recortan ${o} px`);
      afirmar(await malas() === 0, `etapa ${e}: fórmula rota`);
    }
  });
}
