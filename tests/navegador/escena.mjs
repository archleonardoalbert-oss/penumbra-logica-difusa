import { t, afirmar } from '../banco.mjs';

const estado = (pg) => pg.evaluate(() => escena.instantanea());

t('escena: ▶ ▶ ◀ rápido deja lo mismo que ▶ despacio', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html');
  await pg.evaluate(() => { escena.avanzar(); escena.avanzar(); escena.retroceder(); });
  const rapido = await estado(pg);
  await ir('tests/paginas/escena.html');
  await pg.evaluate(() => escena.avanzar());
  await pg.waitForFunction(() => escena.estado().p === 1);
  const despacio = await estado(pg);
  afirmar(JSON.stringify(rapido) === JSON.stringify(despacio), 'el estado difiere');
});

t('escena: ◀ restaura el reposo del paso anterior', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html');
  await pg.evaluate(() => escena.avanzar());
  await pg.waitForFunction(() => escena.estado().p === 1);
  const uno = await estado(pg);
  await pg.evaluate(() => { escena.avanzar(); escena.retroceder(); });
  afirmar(JSON.stringify(await estado(pg)) === JSON.stringify(uno), 'no restaura');
});

t('escena: ↻ repite y acaba igual', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html');
  await pg.evaluate(() => escena.avanzar());
  await pg.waitForFunction(() => escena.estado().p === 1);
  const a = await estado(pg);
  await pg.evaluate(() => escena.repetir());
  afirmar((await pg.evaluate(() => escena.estado().p)) < 1, 'no reinicia');
  await pg.waitForFunction(() => escena.estado().p === 1);
  afirmar(JSON.stringify(await estado(pg)) === JSON.stringify(a), 'acaba distinto');
});

t('escena: flechas del teclado y clic en el texto', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html');
  await pg.keyboard.press('ArrowRight');
  afirmar((await pg.evaluate(() => escena.estado().paso)) === 1, 'la flecha no avanza');
  await pg.click('.paso-texto >> nth=2');
  afirmar((await pg.evaluate(() => escena.estado().paso)) === 2, 'el clic no salta');
  await pg.keyboard.press('ArrowLeft');
  afirmar((await pg.evaluate(() => escena.estado().paso)) === 1, 'la flecha no retrocede');
});

t('escena: escribir en un campo no mueve los pasos', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html');
  await pg.click('input[data-entrada=f]');
  await pg.keyboard.press('ArrowRight');
  afirmar((await pg.evaluate(() => escena.estado().paso)) === 0, 'el teclado se escapó');
});

t('escena: arrastrar fuera del lienzo no deja el arrastre enganchado', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html?paso=2&p=1');
  const c = await pg.evaluate(() => { const r = escena.lienzo.raiz.getBoundingClientRect(), [x, y] = escena.aPantalla([5, 0.5]); return { x, y, top: r.top, alto: r.height }; });
  await pg.mouse.move(c.x, c.y); await pg.mouse.down();
  await pg.mouse.move(c.x + 90, c.y); await pg.mouse.move(c.x + 90, c.top + c.alto + 200);
  await pg.mouse.up();
  const tras = await pg.evaluate(() => escena.estado().e.sonda[0]);
  afirmar(tras > 5.5, `no arrastró: ${tras}`);
  await pg.mouse.move(c.x - 200, c.y);
  afirmar((await pg.evaluate(() => escena.estado().e.sonda[0])) === tras, 'sigue enganchado');
});

t('escena: ?paso=n&p=1 fija el estado', async ({ pg, ir }) => {
  await ir('tests/paginas/escena.html?paso=2&p=1');
  const s = await pg.evaluate(() => escena.estado());
  afirmar(s.paso === 2 && s.p === 1, JSON.stringify(s));
});
