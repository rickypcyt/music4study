import { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { config } from '@/lib/config';
import { createClient } from '@/app/utils/supabase/client';

const supabase = createClient();

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Manejar redirecciones específicas según el evento
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          // Verificar si estamos en localhost y redirigir apropiadamente
          if (config.isLocalhost()) {
            console.log('Development mode - staying on localhost');
          } else {
            console.log('Production mode - using configured site URL');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      const redirectTo = config.getRedirectUrl();
      console.log('Starting Google OAuth with redirectTo:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        throw error;
      }

      console.log('OAuth initiated successfully:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };
};

