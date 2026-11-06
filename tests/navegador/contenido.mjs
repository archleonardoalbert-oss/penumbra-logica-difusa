import { t, afirmar } from '../banco.mjs';
import { todosLosConceptos } from '../../contenido/catalogo.js';

for (const f of todosLosConceptos().filter((c) => c.estado === 'listo')) {
  t(`contenido ${f.id}: todos los pasos se dibujan sin errores, con KaTeX bien`, async ({ pg, ir }) => {
    const c = (await f.carga()).default;
    for (let i = 0; i < c.escena.pasos.length; i++) {
      await ir(`concepto.html?c=${f.id}&paso=${i}&p=1`);
      await pg.waitForSelector('#retos .reto');
      await pg.waitForTimeout(120);
    }
    const malos = await pg.locator('.katex-error').count();
    afirmar(malos === 0, `${malos} fórmulas con error: ${await pg.locator('.katex-error').first().textContent().catch(() => '')}`);
  });
}
