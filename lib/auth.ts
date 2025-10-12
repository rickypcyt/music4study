import { config } from './config';
import { createClient } from '@/app/utils/supabase/client';

// Cliente de Supabase
const supabase = createClient();

// Función para iniciar sesión con Google
export const signInWithGoogle = async () => {
  try {
    // Obtener la URL de redirección apropiada
    const redirectTo = config.getRedirectUrl();
    
    console.log('Starting Google OAuth with redirectTo:', redirectTo);
    console.log('Current environment:', process.env.NODE_ENV);
    console.log('Is localhost:', config.isLocalhost());
    
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
  }
};

// Función para cerrar sesión
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

// Función para obtener el usuario actual
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { user } = await getCurrentUser();
    return !!user;
  } catch {
    return false;
  }
};

