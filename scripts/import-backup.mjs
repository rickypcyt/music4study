// Importa un backup JSON (carpeta backups/<fecha>) al NUEVO proyecto de Supabase.
// Uso (las claves van por variables de entorno, no por argumentos):
//   NEW_SUPABASE_URL=... NEW_SERVICE_ROLE_KEY=... node scripts/import-backup.mjs backups/<carpeta>
import fs from 'node:fs';
const dir = process.argv[2];
const url = process.env.NEW_SUPABASE_URL, key = process.env.NEW_SERVICE_ROLE_KEY;
if (!dir || !url || !key) { console.error('Faltan carpeta de backup o variables NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY'); process.exit(1); }
const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' };
// Orden: primero las tablas padre por las claves foráneas
for (const t of ['links', 'combinations', 'combination_links']) {
  const rows = JSON.parse(fs.readFileSync(`${dir}/${t}.json`, 'utf8'));
  for (let i = 0; i < rows.length; i += 200) {
    const r = await fetch(`${url}/rest/v1/${t}?on_conflict=id`, { method: 'POST', headers: h, body: JSON.stringify(rows.slice(i, i + 200)) });
    if (!r.ok) { console.error(`${t}: ERROR ${r.status} ${await r.text()}`); process.exit(1); }
  }
  console.log(`${t}: ${rows.length} filas importadas`);
}
