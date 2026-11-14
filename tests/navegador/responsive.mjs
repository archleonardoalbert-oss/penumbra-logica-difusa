import { afirmar, t } from '../banco.mjs';

const movil = async (ctx, ancho, alto) => { const pg = await ctx.browser().newContext({ viewport: { width: ancho, height: alto }, isMobile: ancho < alto, hasTouch: true }); return pg.newPage(); };
const sinScrollLateral = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
for (const [ancho, alto] of [[360, 740], [390, 844], [844, 390], [768, 1024]]) t(`responsive ${ancho}×${alto}: ninguna página se sale de lado`, async ({ ctx, base }) => {
  const pg = await movil(ctx, ancho, alto); await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.addInitScript(() => { try { sessionStorage.setItem('penumbra-mapa-nacio', '1'); localStorage.setItem('penumbra-alba-visto', '1'); } catch { /* sin almacén */ } });
  for (const [ruta, listo] of [['index.html', () => window.mapa], ['index.html?lado=alba', () => window.mapa], ['horizonte.html', () => window.horizonte], ['concepto.html?c=16-1-mamdani#mira', () => document.querySelector('.lienzo')], ['concepto.html?c=6-6-pendulo#toca', () => document.querySelector('.lienzo')], ['concepto.html?c=1-3-conjunto-difuso#entiende', () => document.querySelector('.latido')]]) {
    await pg.goto(base + ruta); await pg.waitForFunction(listo, null, { timeout: 90000 }); await pg.waitForTimeout(600);
    afirmar(await sinScrollLateral(pg), `${ruta} se sale de lado`);
  }
  await pg.context().close();
});
t('responsive: en un móvil vertical, las partes de una escena ancha se apilan y se leen a buen tamaño', async ({ ctx, base }) => {
  const pg = await movil(ctx, 390, 844); await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.goto(base + 'concepto.html?c=16-1-mamdani#mira'); await pg.waitForSelector('.lienzo'); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => { const l = document.querySelector('.lienzo'), [w, h] = l.style.aspectRatio.split('/').map(Number); return { w, h, ancho: l.getBoundingClientRect().width }; });
  afirmar(r.h > r.w, `no se apila: ${r.w}/${r.h}`); afirmar(r.ancho / r.w > 0.7, `se ve demasiado pequeña: escala ${(r.ancho / r.w).toFixed(2)}`);
  // y en horizontal vuelve a su forma
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(800);
  afirmar(await pg.evaluate(() => document.querySelector('.lienzo').style.aspectRatio.replace(/\s/g, '')) === '1100/530', 'al girar no vuelve a la escena entera');
  await pg.context().close();
});
t('responsive: en un móvil horizontal la escena cabe en la pantalla, con su botón', async ({ ctx, base }) => {
  const pg = await movil(ctx, 844, 390); await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.goto(base + 'concepto.html?c=16-1-mamdani#mira'); await pg.waitForSelector('.lienzo'); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => ({ l: document.querySelector('.lienzo').getBoundingClientRect().bottom, p: document.querySelector('.pie-etapa').getBoundingClientRect().top }));
  afirmar(r.l <= r.p + 2, `la escena queda tapada por el pie: ${Math.round(r.l)} > ${Math.round(r.p)}`);
  await pg.context().close();
});
