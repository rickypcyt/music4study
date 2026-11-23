// SOLO SERVIDOR: configuración de Better Auth (login con Google, sesiones guardadas en Neon).
import { betterAuth } from 'better-auth';
import { dash } from '@better-auth/infra';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { combinations, db, links } from '@/db';
import { isNull } from 'drizzle-orm';
import * as schema from '@/db/auth-schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  // username solo lo escribe el servidor (/api/me/username), nunca el cliente directamente
  user: {
    additionalFields: {
      username: { type: 'string', required: false, input: false },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Cuando se registra el dueño original, se le asignan los links/combinaciones que existían sin dueño
        after: async (newUser) => {
          const owner = process.env.LEGACY_LINKS_OWNER_EMAIL?.trim().toLowerCase();
          if (!owner || newUser.email.toLowerCase() !== owner) return;
          await db.update(links).set({ userId: newUser.id }).where(isNull(links.userId));
          await db.update(combinations).set({ userId: newUser.id }).where(isNull(combinations.userId));
        },
      },
    },
  },
  // Dashboard de Better Auth (usa BETTER_AUTH_API_KEY)
  plugins: [dash()],
  // Orígenes permitidos para el login (localhost en desarrollo + el sitio en producción)
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://music4study.com',
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Sesión del request actual (o null). Para usar en route handlers. */
export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}
