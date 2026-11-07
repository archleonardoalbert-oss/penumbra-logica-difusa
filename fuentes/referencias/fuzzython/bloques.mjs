// Vuelca a JSON los bloques de código del Horizonte. Uso: node bloques.mjs <salida.json>
import { writeFileSync } from 'node:fs';
import { CATALOGO } from '../../../contenido/catalogo.js';
const L = [];
for (const r of CATALOGO.filter((x) => x.lado === 'horizonte')) for (const c of r.conceptos) { const m = (await c.carga()).default; L.push({ id: c.id, bloques: m.entender.filter((b) => b.tipo === 'codigo' && b.ejecutado !== false).map((b) => (b.prefacio ? b.prefacio + '\n' : '') + b.codigo) }); }
writeFileSync(process.argv[2], JSON.stringify(L));
