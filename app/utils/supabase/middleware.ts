import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Initialize response object
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
          try {
            // Set cookies from the request
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value); // Use RequestCookie object directly
            });

            // Ensure cookies are added to the response
            cookiesToSet.forEach(({ name, value }) => {
              supabaseResponse.cookies.set(name, value); // Use name and value pair
            });

            // Reassign response after setting cookies
            supabaseResponse = NextResponse.next({ request });

          } catch (error) {
            console.error("Error setting cookies:", error); // Log errors for debugging
          }
        },
      },
    }
  );

  return { supabase, response: supabaseResponse };
};
