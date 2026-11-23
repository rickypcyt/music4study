import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { user } from '@/db/auth-schema';

export const dynamic = 'force-dynamic';

const USERNAME = /^[a-z0-9_]{3,24}$/;
// Nombres que no se pueden usar porque chocarían con rutas o suplantarían a la plataforma
const RESERVED = new Set(['admin', 'api', 'auth', 'login', 'logout', 'me', 'u', 'user', 'users', 'settings', 'profile', 'music4study', 'support', 'root', 'null', 'undefined']);

/** GET /api/me/username?u=nombre -> { available } (para validar mientras se escribe) */
export async function GET(request: Request) {
  const u = (new URL(request.url).searchParams.get('u') ?? '').toLowerCase();
  if (!USERNAME.test(u) || RESERVED.has(u)) return NextResponse.json({ available: false });
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.username, u)).limit(1);
  return NextResponse.json({ available: !row });
}

/** POST /api/me/username { username } -> fija el username de la cuenta con sesión (solo si aún no tiene) */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    if (session.user.username) return NextResponse.json({ error: 'Ya tienes un username' }, { status: 409 });

    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!USERNAME.test(username)) {
      return NextResponse.json({ error: 'Usa 3 a 24 caracteres: letras, números o _' }, { status: 400 });
    }
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
