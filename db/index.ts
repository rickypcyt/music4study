import * as schema from './schema';

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Solo para usar en el servidor (route handlers / server actions). Nunca importar desde componentes cliente.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL');

export const db = drizzle(neon(url), { schema });
export * from './schema';
