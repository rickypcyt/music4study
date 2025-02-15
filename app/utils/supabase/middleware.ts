import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value); // ✅ Solo dos parámetros
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value }) => {
            supabaseResponse.cookies.set({ name, value }); // ✅ Usando objeto `RequestCookie`
          });
        },
      },
    }
  );

  return { supabase, response: supabaseResponse };
};
