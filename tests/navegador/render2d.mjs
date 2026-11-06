import { t, afirmar } from '../banco.mjs';

t('niebla: grado 0,5 exactamente en la distancia r', async ({ pg, ir }) => {
  await ir('tests/paginas/render2d.html');
  const [c, b, l] = await pg.evaluate(() => [nube.centro(), nube.borde(), nube.lejos()]);
  afirmar(c > 210, `centro ${c}`);
  afirmar(l < 40, `lejos ${l}`);
  afirmar(Math.abs(b - 110) <= 3, `borde ${b}: 0,5 × 0,86 × 255 = 110`);
});

t('niebla: sin escalones visibles en un degradado', async ({ pg, ir }) => {
  await ir('tests/paginas/render2d.html');
  const m = await pg.evaluate(() => nube.escalones());
  afirmar(m <= 2, `salto de ${m} niveles entre píxeles vecinos`);
});

t('plano: la línea llega al píxel exacto de su punto', async ({ pg, ir }) => {
  await ir('tests/paginas/render2d.html');
  const r = await pg.evaluate(() => ({ xa: plano.aX(5), ya: plano.aY(0.5), y0: plano.aY(0), inv: plano.deX(plano.aX(3.3)),
    medio: plano.pixel(plano.aX(5), plano.aY(0.25)), pto: plano.pixel(plano.aX(5), plano.aY(0.5)) }));
  afirmar(r.xa === 400 && r.ya === 200 && r.y0 === 350, JSON.stringify(r));
  afirmar(Math.abs(r.inv - 3.3) < 1e-9, 'inversa');
  afirmar(r.medio[1] > 200, `la línea no pasa: ${r.medio}`);
  afirmar(r.pto[2] > 200, `el punto no está: ${r.pto}`);
});

t('plano: el mapa de calor pinta por grado dentro de la caja, y nada fuera', async ({ pg, ir }) => {
  await ir('tests/paginas/render2d.html');
  const r = await pg.evaluate(() => ({ bajo: plano.pixel(plano.aX(0.5), plano.aY(0.8)), alto: plano.pixel(plano.aX(9.5), plano.aY(0.8)), fuera: plano.pixel(50, 200) }));
  afirmar(r.alto[0] > r.bajo[0] + 100, `oro frente a azul ${r.bajo} ${r.alto}`);
  afirmar(r.fuera[3] === 0, `fuera ${r.fuera}`);
});
