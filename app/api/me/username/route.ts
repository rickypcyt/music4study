import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { user } from '@/db/auth-schema';
import { parseBody, setUsernameSchema, usernameSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

// Nombres que no se pueden usar porque chocarían con rutas o suplantarían a la plataforma
const RESERVED = new Set(['admin', 'api', 'auth', 'login', 'logout', 'me', 'u', 'user', 'users', 'settings', 'profile', 'music4study', 'support', 'root', 'null', 'undefined']);

/** GET /api/me/username?u=nombre -> { available } (para validar mientras se escribe) */
export async function GET(request: Request) {
  const parsed = usernameSchema.safeParse(new URL(request.url).searchParams.get('u'));
  if (!parsed.success || RESERVED.has(parsed.data)) return NextResponse.json({ available: false });
  const u = parsed.data;
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.username, u)).limit(1);
  return NextResponse.json({ available: !row });
}

/** POST /api/me/username { username } -> fija el username de la cuenta con sesión (solo si aún no tiene) */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    if (session.user.username) return NextResponse.json({ error: 'Ya tienes un username' }, { status: 409 });

    const parsed = await parseBody(request, setUsernameSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { username } = parsed.data;
    if (RESERVED.has(username)) return NextResponse.json({ error: 'Ese nombre no está disponible' }, { status: 400 });

    try {
      await db.update(user).set({ username, updatedAt: new Date() }).where(eq(user.id, session.user.id));
    } catch {
      // violación de unicidad (otra persona lo tomó primero)
      return NextResponse.json({ error: 'Ese nombre ya está en uso' }, { status: 409 });
    }
    return NextResponse.json({ username });
  } catch (error) {
    console.error('POST /api/me/username:', error);
    return NextResponse.json({ error: 'Error al guardar el username' }, { status: 500 });
  }
}
