// Pruebas en navegador real. Uso: node tests/navegador.mjs [filtro]
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, afirmar, navegador, pruebas, servir } from './banco.mjs';

async function correr() {
  const dir = join(RAIZ, 'tests/navegador');
  for (const a of (await readdir(dir)).sort()) if (a.endsWith('.mjs')) await import(pathToFileURL(join(dir, a)));
  const filtro = process.argv[2] || '';
  const { srv, base } = await servir(), b = await navegador();
  let ok = 0, mal = 0;
  for (const { nombre, fn } of pruebas) {
    if (filtro && !nombre.includes(filtro)) continue;
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage();
    const errores = [];
    pg.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    pg.on('pageerror', (e) => errores.push(e.message));
    try {
      const ir = async (ruta) => {
        await pg.goto(base + ruta, { waitUntil: 'load' });
        await pg.evaluate(() => document.fonts.ready);
      };
      await fn({ pg, ir, errores, ctx, base, navegador: b });
      afirmar(errores.length === 0, 'errores de consola: ' + errores.join(' | '));
      ok++; console.log('✔', nombre);
    } catch (e) { mal++; console.log('✖', nombre, '\n   ', e.message.split('\n')[0]); }
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(`pass ${ok}  fail ${mal}`);
  process.exit(mal ? 1 : 0);
}

await correr();
