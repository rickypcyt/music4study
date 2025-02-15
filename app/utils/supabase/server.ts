import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies(); // Ensure we get the cookies correctly

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string {
          const cookie = cookieStore.get(name);
          return cookie?.value ?? ""; // Ensure we return an empty string if the cookie is not found
        },
        set(name: string, value: string, options?: CookieOptions): void {
          try {
            cookieStore.set(name, value, options); // Safely set the cookie
          } catch (error) {
            console.error("Error setting cookie:", error); // Log the error for debugging
          }
        },
      },
    }
  );
};
