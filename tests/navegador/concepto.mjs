import { t, afirmar } from '../banco.mjs';

const abrirDemo = async (ir, pg, etapa = 'demuestra') => { await pg.emulateMedia({ reducedMotion: 'reduce' }); await ir(`tests/paginas/concepto.html#${etapa}`); await pg.waitForFunction(() => window.listo); };
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

t('concepto: Entiéndelo muestra un latido cada vez y limpia la pantalla al cambiar de grupo', async ({ pg, ir }) => {
  await abrirDemo(ir, pg, 'entiende');
  const uno = await pg.textContent('.latido');
  afirmar(uno.includes('Un conjunto difuso'), uno);
  await pg.click('.pie-etapa .boton-seguir');
  const dos = await pg.textContent('.latido');
  afirmar(dos.includes('Algo cierto') && !dos.includes('Un conjunto difuso'), `no limpió: ${dos}`);
  afirmar((await pg.textContent('.pie-etapa .pie-centro')).includes('2 /'), 'sin contador');
  await pg.click('.boton-atras');
  afirmar((await pg.textContent('.latido')).includes('Un conjunto difuso'), '← no vuelve al latido anterior');
});

t('concepto: en una pantalla de portátil no hay scroll de página en ninguna etapa', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await ir('concepto.html?c=1-8-cortes-alfa');
  await pg.waitForSelector('#pregunta');
  for (let e = 0; e < 6; e++) {
    await pg.evaluate((i) => document.querySelectorAll('.etapas button')[i].click(), e);
    await pg.waitForTimeout(60);
    const s = await pg.evaluate(() => ({ alto: document.documentElement.scrollHeight, ventana: innerHeight, seguir: document.querySelector('.pie-etapa').getBoundingClientRect().bottom }));
    afirmar(s.alto <= s.ventana + 1, `etapa ${e}: la página mide ${s.alto} en ${s.ventana}`);
    afirmar(s.seguir <= s.ventana + 1, `etapa ${e}: el pie se sale`);
  }
});

t('concepto: la escena cabe entera en Míralo, con la leyenda y el pie a la vista', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await ir('concepto.html?c=1-1-quien-es-alto#mira');
  await pg.waitForSelector('#animacion canvas');
  await pg.waitForTimeout(200);
  const r = await pg.evaluate(() => { const a = document.querySelector('.bloque-lienzo').getBoundingClientRect(), p = document.querySelector('.pie-etapa').getBoundingClientRect(), e = document.querySelector('.escenario').getBoundingClientRect(); return { fondo: a.bottom, pie: p.top, ancho: a.width, top: a.top, tope: e.top, altoCanvas: document.querySelector('.lienzo').getBoundingClientRect().height }; });
  afirmar(r.fondo <= r.pie + 1, `la escena se mete bajo el pie: ${JSON.stringify(r)}`);
  afirmar(r.altoCanvas > 260, `escena diminuta: ${r.altoCanvas}`);
});

t('concepto: las flechas del teclado recorren la etapa y pasan a la siguiente', async ({ pg, ir }) => {
  await abrirDemo(ir, pg, 'mira');
  await pg.keyboard.press('ArrowRight');
  afirmar(await pg.evaluate(() => pagina.escena.estado().paso) === 1, 'paso');
  await pg.keyboard.press('ArrowRight');
  afirmar(await pg.locator('#manipulacion').isVisible(), 'no pasó a Tócalo');
  await pg.keyboard.press('ArrowLeft');
  afirmar(await pg.locator('#animacion').isVisible(), 'no volvió');
});

t('concepto: con transiciones activas, cambiar de etapa funciona y no da errores', async ({ pg, ir }) => {
  await ir('tests/paginas/concepto.html#pregunta');
  await pg.waitForFunction(() => window.listo);
  await pg.click('.pie-etapa .boton-seguir');
  await pg.waitForSelector('#animacion canvas', { state: 'visible' });
});

t('concepto: la última etapa dice cuál es la siguiente parada y por qué', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await ir('concepto.html?c=1-1-quien-es-alto#llegada');
  await pg.waitForSelector('#llegada .boton-seguir');
  const txt = await pg.textContent('#llegada');
  afirmar(txt.includes('montón'), 'sin puente');
  afirmar(await pg.locator('#llegada a[href="concepto.html?c=1-2-monton"]').count() === 1, 'sin enlace');
});

t('concepto: una palabra técnica se explica al pulsarla, y Esc la cierra', async ({ pg, ir }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await ir('concepto.html?c=1-1-quien-es-alto#entiende');
  await pg.waitForSelector('.latido');
  await pg.click('.pie-etapa .boton-seguir');
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
  await pg.click('[data-reto=e]');
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
  await pg.click('[data-reto=m]');
  await pg.evaluate(() => pagina.escena.actualizar('b', 1));
  await pg.click('#reto-m >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, `grado ${await grado(pg)}`);
});

t('concepto: demostración autoevaluada, tras ver la solución', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  await pg.click('[data-reto=d]');
  afirmar(!(await pg.locator('#reto-d .solucion').isVisible()), 'la solución no debe verse de entrada');
  await pg.click('#reto-d >> text=Ver la solución');
  await pg.click('#reto-d >> text=tenía la idea');
  afirmar(await grado(pg) === 0.125, `grado ${await grado(pg)}`);
});

t('concepto: la demostración de valientes se esconde y se abre al saltar la cinemática', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  await pg.evaluate(() => { pagina.irA(3); });
  for (let i = 0; i < 2; i++) await pg.click('.pie-etapa .boton-seguir');
  afirmar(!(await pg.locator('.latido .razonamiento').first().isVisible()), 'visible de entrada');
  await pg.click('.boton-valiente');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.latido .razonamiento', { state: 'visible' });
});

t('concepto: id inexistente da un mensaje con vuelta al mapa', async ({ pg, ir }) => {
  await ir('concepto.html?c=no-existe');
  await pg.waitForSelector('.mensaje');
  afirmar(await pg.locator('a[href="index.html"]').count() === 1, 'sin enlace');
});

t('concepto: uno que no existe avisa con amabilidad', async ({ pg, ir }) => {
  await ir('concepto.html?c=9-9-nada');
  await pg.waitForSelector('.mensaje');
  afirmar((await pg.textContent('.mensaje')).includes('No encuentro'), 'mensaje');
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
  await abrirDemo(ir, pg, 'mira');
  await pg.waitForSelector('.aviso-sin-gl');
  await pg.evaluate(() => pagina.irA(4));
  afirmar(await pg.locator('.pestanas-reto button').count() === 4, 'sin retos');
  await pg.fill('#reto-c input', '0.75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, 'el reto de cálculo debe funcionar');
  await pg.click('[data-reto=m]');
  afirmar((await pg.textContent('#reto-m')).includes('necesita la escena'), 'reto de manipular');
});

t('concepto: con localStorage bloqueado funciona y el grado dura la sesión', async ({ pg, ir }) => {
  await pg.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  await abrirDemo(ir, pg);
  await pg.fill('#reto-c input', '0.75');
  await pg.click('#reto-c >> text=Comprobar');
  afirmar(await grado(pg) === 0.25, `grado ${await grado(pg)}`);
});
