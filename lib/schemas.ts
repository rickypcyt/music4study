// Esquemas de validación de los cuerpos que reciben las rutas API.
import { z } from 'zod';

/** Texto opcional y tolerante: recorta a `max`; si falta, está vacío o no es texto, queda en null. */
const optionalText = (max: number) =>
  z.unknown().transform((v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null));

/** Texto obligatorio: se rechaza si queda vacío; lo que pase de `max` se recorta. */
const requiredText = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .transform((v) => v.slice(0, max));

export const createLinkSchema = z.object(
  {
    url: z
      .string({ error: 'URL inválida' })
      .trim()
      .max(2000, 'URL inválida')
      .regex(/^https?:\/\//i, 'URL inválida'),
    type: optionalText(50),
    genre: optionalText(100),
    title: optionalText(300),
  },
  { error: 'URL inválida' },
);

export const updateLinkSchema = z.object({ title: requiredText(300, 'title requerido') }, { error: 'title requerido' });

export const createCombinationSchema = z.object({ name: requiredText(100, 'name requerido') }, { error: 'name requerido' });

const USERNAME_ERROR = 'Usa 3 a 24 caracteres: letras, números o _';

export const usernameSchema = z
  .string({ error: USERNAME_ERROR })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, USERNAME_ERROR);

export const setUsernameSchema = z.object({ username: usernameSchema }, { error: USERNAME_ERROR });

export const verifyUploadSchema = z.object(
  { password: z.string({ error: 'Clave incorrecta' }) },
  { error: 'Clave incorrecta' },
);

/** Lista de ids separados por comas (?ids=a,b,c). guid acepta cualquier UUID con el formato que admite Postgres. */
export const idListSchema = z
  .string()
  .transform((v) => v.split(',').filter(Boolean))
  .pipe(z.array(z.guid('id inválido')));

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Lee el JSON de la petición y lo valida. Un JSON mal formado cuenta como cuerpo inválido. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<ParseResult<z.output<T>>> {
  const result = schema.safeParse(await request.json().catch(() => null));
  return result.success ? { ok: true, data: result.data } : { ok: false, error: result.error.issues[0].message };
}
