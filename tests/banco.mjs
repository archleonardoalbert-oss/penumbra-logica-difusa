// Banco de pruebas en navegador: servidor estático, Chromium y registro de pruebas.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(RAIZ, '.superpowers/dev/'));
const { chromium } = require('playwright-core');

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

export function servir() {
  const srv = createServer(async (req, res) => {
    try {
      const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (ruta === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      const dato = await readFile(join(RAIZ, ruta === '/' ? 'index.html' : ruta));
      res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || (ruta === '/' ? 'text/html' : 'application/octet-stream') });
      res.end(dato);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, base: `http://127.0.0.1:${srv.address().port}/` })));
}

export async function navegador() {
  const raiz = join(homedir(), '.cache/ms-playwright');
  const dirs = (await readdir(raiz)).filter((d) => /^chromium-\d+$/.test(d)).sort();
  return chromium.launch({
    executablePath: join(raiz, dirs.at(-1), 'chrome-linux64/chrome'),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
}

export const pruebas = [];
export const t = (nombre, fn) => pruebas.push({ nombre, fn });
export const afirmar = (c, m) => { if (!c) throw new Error(m); };

