// Importa un backup JSON (carpeta backups/<fecha>) a Neon. Requiere haber creado las tablas antes (npx drizzle-kit push).
// Uso: node scripts/import-to-neon.mjs backups/<carpeta>     (lee DATABASE_URL de .env.local)
import 'dotenv/config';
import { config } from 'dotenv';
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
const dir = process.argv[2];
if (!dir || !process.env.DATABASE_URL) { console.error('Falta carpeta de backup o DATABASE_URL'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const read = (t) => JSON.parse(fs.readFileSync(`${dir}/${t}.json`, 'utf8'));

// Un solo INSERT por tabla con json_populate_recordset: conserva ids y relaciones; idempotente (ON CONFLICT DO NOTHING)
const links = read('links');
await sql.query(`insert into links (id, url, type, genre, username, title, date_added)
  select id, url, type, genre, username, title, date_added from json_populate_recordset(null::links, $1::json)
  on conflict (id) do nothing`, [JSON.stringify(links)]);
console.log(`links: ${links.length} filas`);

const combos = read('combinations');
await sql.query(`insert into combinations (id, name, created_at)
  select id, name, created_at from json_populate_recordset(null::combinations, $1::json)
  on conflict (id) do nothing`, [JSON.stringify(combos)]);
console.log(`combinations: ${combos.length} filas`);

const cl = read('combination_links');
await sql.query(`insert into combination_links (id, combination_id, link_id, created_at)
  select id, combination_id, link_id, created_at from json_populate_recordset(null::combination_links, $1::json)
  on conflict (id) do nothing`, [JSON.stringify(cl)]);
console.log(`combination_links: ${cl.length} filas`);

const [{ n }] = await sql.query('select count(*)::int as n from links');
console.log(`Verificación: ${n} links en Neon`);
