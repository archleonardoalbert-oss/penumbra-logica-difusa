import { t, afirmar } from '../banco.mjs';

const lejos = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

t('3D: la línea detrás del terreno queda oculta y delante se ve', async ({ pg, ir }) => {
  await ir('tests/paginas/render3d.html');
  const oculta = await pg.evaluate(() => window.leer([0.5, 1, 0.3]));
  const vista = await pg.evaluate(() => window.leer([0.5, 1, 1.25]));
  afirmar(lejos(vista, [252, 60, 60]) < 90, `la parte visible no es roja: ${vista}`);
  afirmar(lejos(oculta, [252, 60, 60]) > 120, `la parte oculta se ve: ${oculta}`);
});

t('3D: el rótulo de un punto tapado se atenúa y el visible no', async ({ pg, ir }) => {
  await ir('tests/paginas/render3d.html');
  const [tapado, libre] = await pg.evaluate(() => window.opacidades());
  afirmar(Math.abs(tapado - 0.22) < 0.01, `tapado ${tapado}`);
  afirmar(Math.abs(libre - 1) < 0.01, `libre ${libre}`);
});

t('3D: la cámara no puede pasar detrás de las paredes', async ({ pg, ir }) => {
  await ir('tests/paginas/render3d.html');
  const c = await pg.evaluate(() => window.camaraTrasForzar({ yaw: 3, pitch: -2 }));
  afirmar(c.yaw === -0.1 && c.pitch === 0.2, JSON.stringify(c));
});

t('lienzo: redimensionar a mitad de animación mantiene capas alineadas y nítidas', async ({ pg, ir }) => {
  await ir('tests/paginas/render3d.html');
  await pg.evaluate(() => window.animar());
  await pg.waitForTimeout(150);
  for (const [w, h] of [[900, 700], [1500, 1000], [640, 900]]) {
    await pg.setViewportSize({ width: w, height: h });
    await pg.waitForTimeout(250);
    const m = await pg.evaluate(() => window.medidas());
    afirmar(m.gl.w === m.dos.w && m.gl.h === m.dos.h, `capas distintas: ${JSON.stringify(m)}`);
    afirmar(Math.abs(m.gl.left - m.dos.left) < 0.5 && Math.abs(m.gl.top - m.dos.top) < 0.5, 'capas desplazadas');
    afirmar(m.tex.w === m.dos.w, `capa de rótulos ${JSON.stringify(m)}`);
    afirmar(m.glPx === Math.round(m.gl.w * m.dpr), `borroso: ${m.glPx} px para ${m.gl.w} de ancho`);
    afirmar(m.dosPx === m.glPx, 'el Canvas 2D no sigue la resolución');
  }
});
