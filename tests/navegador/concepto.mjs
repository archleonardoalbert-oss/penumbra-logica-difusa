import { t, afirmar } from '../banco.mjs';

const abrirDemo = async (ir, pg) => { await ir('tests/paginas/concepto.html'); await pg.waitForFunction(() => window.listo); };
const grado = (pg) => pg.evaluate(() => +document.querySelector('.grado').dataset.valor);

t('concepto: los 5 pasos aparecen en su orden', async ({ pg, ir }) => {
  await abrirDemo(ir, pg);
  const orden = await pg.evaluate(() => ['pregunta', 'animacion', 'manipulacion', 'rigor', 'retos'].map((i) => document.getElementById(i).getBoundingClientRect().top + scrollY));
  for (let i = 0; i + 1 < orden.length; i++) afirmar(orden[i] < orden[i + 1], `orden ${orden}`);
  afirmar(await pg.locator('#rigor .katex').count() > 0, 'el rigor no renderiza KaTeX');
  afirmar(await pg.locator('.paso-texto .katex').count() > 0, 'los pasos no renderizan KaTeX');
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
  afirmar(!(await pg.locator('.razonamiento >> text=Paso').first().isVisible()), 'visible de entrada');
  await pg.click('.boton-valiente');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.bloque .razonamiento', { state: 'visible' });
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
  afirmar(await pg.locator('#rigor .bloque').count() === 2, 'sin rigor');
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
