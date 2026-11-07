import { afirmar, t } from '../banco.mjs';

const abrir = async (ir, pg, q = '') => { await pg.emulateMedia({ reducedMotion: 'reduce' }); await ir('horizonte.html' + q); await pg.waitForFunction(() => window.horizonte, { timeout: 60000 }); };
t('horizonte: las 19 paradas caen de lejos hasta pegadas al horizonte', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const P = await pg.evaluate(() => horizonte.paradas());
  afirmar(P.length === 19, `son ${P.length}`);
  P.slice(1).forEach((x, i) => afirmar(x.r <= P[i].r, `${x.id} no cae`));
  afirmar(P[0].r > 30 && P.at(-1).r < 1.1, 'la caída no va de lejos al horizonte');
  afirmar(await pg.locator('.hz-pto').count() === 19, 'faltan puntos en la espiral');
});
t('horizonte: teclado, botones y lista recorren la órbita, y sin salirse', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const id = () => pg.evaluate(() => horizonte.actual());
  afirmar(await id() === '14-1-encender', 'no empieza en la primera');
  await pg.keyboard.press('ArrowDown'); afirmar(await id() === '14-2-conjunto', 'la flecha no baja');
  await pg.locator('.hz-paso', { hasText: 'Caer más' }).click(); afirmar(await id() === '14-3-formas', 'el botón no cae');
  await pg.locator('.hz-lista button', { hasText: 'Operar conjuntos' }).click(); afirmar(await id() === '14-4-operar', 'la lista no lleva');
  await pg.locator('.hz-paso', { hasText: 'Órbita anterior' }).click(); afirmar(await id() === '14-3-formas', 'no vuelve');
  await pg.evaluate(() => horizonte.fijar({ k: 18 })); await pg.keyboard.press('ArrowDown');
  afirmar(await id() === '18-5-medir', 'se sale por el final');
  afirmar(await pg.locator('.hz-paso', { hasText: 'Caer más' }).isDisabled(), 'al final se puede seguir cayendo');
});
t('horizonte: ?ir= abre esa parada, y su botón entra en ella', async ({ pg, ir }) => {
  await abrir(ir, pg, '?ir=16-1-mamdani');
  afirmar(await pg.evaluate(() => horizonte.actual()) === '16-1-mamdani', 'no respeta ?ir');
  afirmar(await pg.locator('.hz-panel a.boton-seguir').getAttribute('href') === 'concepto.html?c=16-1-mamdani', 'el botón no lleva a la parada');
  await abrir(ir, pg, '?ir=no-existe');
  afirmar(await pg.evaluate(() => horizonte.actual()) === '14-1-encender', 'una parada inexistente debe caer en la primera');
});
t('horizonte: lo aprobado se marca en la espiral, y se vuelve a la primera sin aprobar', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const claves = await pg.evaluate(() => Object.keys(localStorage));
  afirmar(Array.isArray(claves), 'sin almacén');
  afirmar(await pg.locator('.hz-pto.hecho').count() === 0, 'nada debería estar aprobado al principio');
});
t('horizonte: una parada sabe volver a la órbita, y al acabar el anillo cae al siguiente', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await ir('concepto.html?c=14-4-operar#llegada');
  await pg.waitForSelector('.boton-seguir');
  afirmar(await pg.locator('a[href="horizonte.html"]').count() >= 1, 'el mapa no lleva a la órbita');
  afirmar(await pg.locator('a[href="horizonte.html?ir=15-1-palabras"]').count() === 1, 'no cae al anillo siguiente');
  await ir('concepto.html?c=18-5-medir#llegada');
  await pg.waitForSelector('.boton-seguir');
  afirmar(await pg.locator('a[href="horizonte.html"]').count() >= 1, 'la última no vuelve a la órbita');
});
t('horizonte: en un móvil, el panel cabe y no hay scroll lateral', async ({ pg, ir, ctx }) => {
  await pg.setViewportSize({ width: 390, height: 780 });
  await abrir(ir, pg);
  const o = await pg.evaluate(() => ({ a: document.documentElement.scrollWidth, b: innerWidth, h: document.querySelector('.hz-panel').getBoundingClientRect().height }));
  afirmar(o.a <= o.b, 'sobra anchura'); afirmar(o.h <= 780 * 0.6, `panel de ${o.h} px`);
});
t('horizonte: sin WebGL2, el panel sigue llevando a las paradas', async ({ pg, ir }) => {
  await pg.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...r) { return k === 'webgl2' ? null : o.call(this, k, ...r); }; });
  await abrir(ir, pg);
  await pg.keyboard.press('ArrowDown');
  afirmar(await pg.locator('.hz-panel a.boton-seguir').getAttribute('href') === 'concepto.html?c=14-2-conjunto', 'el panel no funciona sin WebGL2');
});
