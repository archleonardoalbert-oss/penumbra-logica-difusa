import { afirmar, t } from '../banco.mjs';

const abrir = async (ir, pg, q = '') => { await pg.emulateMedia({ reducedMotion: 'reduce' }); await ir('horizonte.html' + q); await pg.waitForFunction(() => window.horizonte, { timeout: 60000 }); };
t('horizonte: las 19 paradas caen de lejos hasta pegadas al horizonte', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const P = await pg.evaluate(() => horizonte.paradas());
  afirmar(P.length === 19, `son ${P.length}`);
  P.slice(1).forEach((x, i) => afirmar(x.r <= P[i].r, `${x.id} no cae`));
  afirmar(P[0].r > 30 && P.at(-1).r < 1.1, 'la caída no va de lejos al horizonte');
});
t('horizonte: no queda panel, lista ni espiral a la vista', async ({ pg, ir }) => {
  await abrir(ir, pg);
  for (const c of ['.hz-panel', '.hz-mapa', '.hz-lista', '.hz-pto']) afirmar(await pg.locator(c).count() === 0, `sigue ${c}`);
  afirmar(!(await pg.locator('.hz-ruta').isVisible()), 'la ruta debe estar cerrada');
});
t('horizonte: la rueda hace caer de forma continua, sin saltos de parada en parada', async ({ pg, ir }) => {
  await abrir(ir, pg);
  await pg.mouse.move(600, 400); await pg.mouse.wheel(0, 500);
  await pg.waitForFunction(() => horizonte.avance() > 0.2 && horizonte.avance() < 1, null, { timeout: 15000 });
});
t('horizonte: el teclado recorre las paradas, sin salirse, y Enter entra', async ({ pg, ir }) => {
  await abrir(ir, pg);
  const id = () => pg.evaluate(() => horizonte.actual());
  afirmar(await id() === '14-1-encender', 'no empieza en la primera');
  await pg.keyboard.press('ArrowDown'); afirmar(await id() === '14-2-conjunto', 'la flecha no baja');
  await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('ArrowUp'); afirmar(await id() === '14-1-encender', 'se sale por arriba');
  await pg.keyboard.press('Enter'); await pg.waitForURL(/concepto\.html\?c=14-1-encender/, { timeout: 15000 });
});
t('horizonte: ?ir= abre esa parada, con su faro y su enlace', async ({ pg, ir }) => {
  await abrir(ir, pg, '?ir=16-1-mamdani');
  afirmar(await pg.evaluate(() => horizonte.actual()) === '16-1-mamdani', 'no respeta ?ir');
  await pg.waitForFunction(() => document.querySelector('.hz-faro').getAttribute('href') === 'concepto.html?c=16-1-mamdani', null, { timeout: 30000 });
  afirmar((await pg.locator('.hz-faro-tit').textContent()).includes('Mamdani'), 'el faro no dice su parada');
  await abrir(ir, pg, '?ir=no-existe');
  afirmar(await pg.evaluate(() => horizonte.actual()) === '14-1-encender', 'una parada inexistente debe caer en la primera');
});
t('horizonte: la ruta abre todas las paradas y lleva a la elegida', async ({ pg, ir }) => {
  await abrir(ir, pg);
  await pg.locator('.hz-acciones button', { hasText: 'Ruta' }).click();
  afirmar(await pg.locator('.hz-ruta li button').count() === 19, 'faltan paradas');
  await pg.locator('.hz-ruta li button', { hasText: 'Operar conjuntos' }).click();
  afirmar(await pg.evaluate(() => horizonte.actual()) === '14-4-operar', 'no lleva');
  afirmar(!(await pg.locator('.hz-ruta').isVisible()), 'no se cierra');
});
t('horizonte: tras el eclipse hay entrada cinematográfica, y se puede saltar', async ({ pg, ir }) => {
  await ir('horizonte.html?entrada=eclipse'); await pg.waitForFunction(() => window.horizonte, { timeout: 60000 });
  afirmar(await pg.evaluate(() => document.body.classList.contains('hz-entrada')), 'sin entrada');
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(() => !document.body.classList.contains('hz-entrada'), null, { timeout: 15000 });
  afirmar(await pg.locator('#puente').count() === 0, 'el puente se queda');
});
t('horizonte: una parada sabe volver a la órbita, y al acabar el anillo cae al siguiente', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await ir('concepto.html?c=14-4-operar#llegada');
  await pg.waitForSelector('.boton-seguir');
  afirmar(await pg.locator('a[href="horizonte.html"]').count() >= 1, 'el mapa no lleva a la órbita');
  afirmar(await pg.locator('a[href="horizonte.html?ir=15-1-palabras"]').count() === 1, 'no cae al anillo siguiente');
});
t('horizonte: en un móvil no hay scroll lateral', async ({ pg, ir }) => {
  await pg.setViewportSize({ width: 390, height: 780 });
  await abrir(ir, pg);
  const o = await pg.evaluate(() => ({ a: document.documentElement.scrollWidth, b: innerWidth }));
  afirmar(o.a <= o.b, 'sobra anchura');
});
t('horizonte: sin WebGL2, la ruta está abierta y lleva a las paradas', async ({ pg, ir }) => {
  await pg.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...r) { return k === 'webgl2' ? null : o.call(this, k, ...r); }; });
  await abrir(ir, pg);
  afirmar(await pg.locator('.hz-ruta').isVisible(), 'sin lista');
  await pg.locator('.hz-ruta li button', { hasText: 'Las diez formas' }).click();
  await pg.waitForURL(/concepto\.html\?c=14-3-formas/, { timeout: 15000 });
});
