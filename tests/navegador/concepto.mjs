import { t, afirmar } from '../banco.mjs';

const abrirDemo = async (ir, pg, etapa = 'demuestra') => { await ir(`tests/paginas/concepto.html#${etapa}`); await pg.waitForFunction(() => window.listo); };
const grado = (pg) => pg.evaluate(() => +document.querySelector('.grado').dataset.valor);

t('concepto: se recorre por etapas, una cada vez, y el botón dice qué sigue', async ({ pg, ir }) => {
  await abrirDemo(ir, pg, 'pregunta');
  afirmar(await pg.locator('#pregunta').isVisible() && !(await pg.locator('#animacion').isVisible()), 'debe verse solo la pregunta');
  afirmar((await pg.textContent('.pie-etapa .boton-seguir')).includes('Vamos a verlo'), 'botón de la pregunta');
  await pg.click('.pie-etapa .boton-seguir');
  afirmar(await pg.locator('#animacion').isVisible() && !(await pg.locator('#pregunta').isVisible()), 'no pasó a Míralo');
  afirmar((await pg.textContent('.pie-etapa .boton-seguir')).includes('Siguiente paso'), 'dentro de la animación, avanza pasos');
  await pg.click('.pie-etapa .boton-seguir');
  afirmar((await pg.textContent('.pie-etapa .boton-seguir')).includes('tócalo'), 'al acabar los pasos, invita a tocar');
  await pg.click('.pie-etapa .boton-seguir');
  afirmar(await pg.locator('#manipulacion').isVisible() && await pg.locator('#manipulacion canvas').count() > 0, 'la escena debe seguir en Tócalo');
});

t('concepto: Entiéndelo aparece poco a poco, nunca de golpe', async ({ pg, ir }) => {
  await abrirDemo(ir, pg, 'entiende');
  const antes = await pg.locator('.lectura-guiada > *').count();
  afirmar(antes === 1, `de entrada solo una cosa, hay ${antes}`);
  await pg.click('.pie-etapa .boton-seguir');
  afirmar(await pg.locator('.lectura-guiada > *').count() === 2, 'cada Seguir añade una');
  afirmar(await pg.locator('.lectura-guiada .katex').count() > 0, 'sin KaTeX');
});

t('concepto: la última etapa dice cuál es la siguiente parada y por qué', async ({ pg, ir }) => {
  await ir('concepto.html?c=1-1-quien-es-alto#llegada');
  await pg.waitForSelector('#llegada .boton-seguir');
  const txt = await pg.textContent('#llegada');
  afirmar(txt.includes('montón'), 'sin puente');
  afirmar(await pg.locator('#llegada a[href="concepto.html?c=1-2-monton"]').count() === 1, 'sin enlace');
});

t('concepto: una palabra técnica se explica al pulsarla, y Esc la cierra', async ({ pg, ir }) => {
  await ir('concepto.html?c=1-1-quien-es-alto#entiende');
  await pg.waitForSelector('.lectura-guiada');
  await pg.evaluate(async () => { const m = await import('/motor/concepto.js'); void m; });
  for (let i = 0; i < 6; i++) await pg.click('.pie-etapa .boton-seguir');
  await pg.click('.termino >> nth=0');
  await pg.waitForSelector('.glosario-tarjeta', { state: 'visible' });
  afirmar((await pg.textContent('.glosario-tarjeta')).includes('Por ejemplo'), 'sin ejemplo');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.glosario-tarjeta', { state: 'hidden' });
});

t('concepto: resolver retos sube el grado, y la nota se conserva al recargar', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  afirmar(await grado(pg) === 0, 'mirar no debe subir nada');
  await pg.fill('#reto-c input', '0,75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, `grado ${await grado(pg)}`);
  await pg.click('#reto-e >> text=Esta sí');
  afirmar(await grado(pg) === 0.5, `grado ${await grado(pg)}`);
  await abrirDemo(ir, pg);
  afirmar(await grado(pg) === 0.5, 'no persiste');
});

t('concepto: las pistas restan nota', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  await pg.click('#reto-c .boton-pista');
  await pg.fill('#reto-c input', '0.75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(Math.abs(await grado(pg) - 0.2) < 1e-9, `grado ${await grado(pg)}`);
});

t('concepto: el reto de manipular lee la escena', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  await pg.evaluate(() => pagina.escena.actualizar('b', 1));
  await pg.click('#reto-m >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, `grado ${await grado(pg)}`);
});

t('concepto: demostración autoevaluada, tras ver la solución', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  afirmar(!(await pg.locator('#reto-d .solucion').isVisible()), 'la solución no debe verse de entrada');
  await pg.click('#reto-d >> text=Ver la solución');
  await pg.click('#reto-d >> text=tenía la idea');
  afirmar(await grado(pg) === 0.125, `grado ${await grado(pg)}`);
});

t('concepto: la demostración de valientes se esconde y se abre al saltar la cinemática', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  await pg.evaluate(() => { pagina.irA(3); pagina.leerTodo(); });
  afirmar(!(await pg.locator('.lectura-guiada .razonamiento').first().isVisible()), 'visible de entrada');
  await pg.click('.boton-valiente');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.lectura-guiada .razonamiento', { state: 'visible' });
});

t('concepto: id inexistente da un mensaje con vuelta al mapa', async ({ pg, ir }) => {
  await ir('concepto.html?c=no-existe');
  await pg.waitForSelector('.mensaje');
  afirmar(await pg.locator('a[href="index.html"]').count() === 1, 'sin enlace');
});

t('concepto: uno pendiente también', async ({ pg, ir }) => {
  await ir('concepto.html?c=6-1-mamdani');
  await pg.waitForSelector('.mensaje');
  afirmar((await pg.textContent('.mensaje')).includes('aún no está escrito'), 'mensaje');
});

t('concepto: sin parámetro, también', async ({ pg, ir }) => {
  await ir('concepto.html');
  await pg.waitForSelector('.mensaje');
});

t('concepto: sin WebGL2 hay aviso y se lee el resto', async ({ pg, ir }) => {
  await pg.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (k, ...r) { return k === 'webgl2' ? null : o.call(this, k, ...r); };
  });
  await abrirDemo(ir, pg);
  await pg.waitForSelector('.aviso-sin-gl');
  await pg.evaluate(() => { pagina.irA(3); pagina.leerTodo(); pagina.irA(4); });
  afirmar(await pg.locator('#rigor .formal').count() >= 1, 'sin rigor');
  await pg.fill('#reto-c input', '0.75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, 'el reto de cálculo debe funcionar');
  afirmar((await pg.textContent('#reto-m')).includes('necesita la escena'), 'reto de manipular');
});

t('concepto: con localStorage bloqueado funciona y el grado dura la sesión', async ({ pg, ir }) => {
  await pg.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  await abrirDemo(ir, pg);
  await pg.fill('#reto-c input', '0.75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, `grado ${await grado(pg)}`);
});
