import { t, afirmar } from '../banco.mjs';

t('extremo a extremo: del mapa a la parada, los retos suben la colina, y el progreso dura', async ({ pg, ir, base }) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const fuera = [];
  pg.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) fuera.push(r.url()); });
  await ir('index.html');
  await pg.waitForFunction(() => window.mapa);
  await pg.click('.mapa-panel .boton-seguir');
  await pg.waitForURL(/1-1-quien-es-alto/);
  await pg.waitForSelector('#pregunta');
  for (const e of ['mira', 'toca', 'entiende']) { await pg.evaluate((n) => [...document.querySelectorAll('.etapas button')].find((b) => b.textContent === n).click(), { mira: 'Míralo', toca: 'Tócalo', entiende: 'Entiéndelo' }[e]); }
  await pg.click('.etapas >> text=Demuéstralo');
  await pg.fill('#manipulacion input[data-entrada=borrosidad], input[data-entrada=borrosidad]', '7').catch(() => {});
  await pg.evaluate(() => { const i = document.querySelector('input[data-entrada=borrosidad]'); i.value = 7; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await pg.click('#reto-borrosidad >> text=Comprobar');
  await pg.click('.pie-etapa .boton-seguir');
  await pg.fill('#reto-grado-174 input', '0,23');
  await pg.click('#reto-grado-174 >> text=Comprobar');
  afirmar(+(await pg.getAttribute('.grado', 'data-valor')) === 1, 'el grado no llegó a 1');
  await pg.click('.pie-etapa .boton-seguir');
  await pg.click('#llegada .boton-seguir');
  await pg.waitForURL(/1-2-monton/);
  await ir('index.html');
  await pg.waitForFunction(() => window.mapa);
  afirmar((await pg.textContent('.mapa-panel')).includes('La paradoja del montón'), 'el mapa no avanzó');
  afirmar(fuera.length === 0, `peticiones fuera: ${fuera.join(', ')}`);
});
