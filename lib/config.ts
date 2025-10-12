// Configuration for site URLs and environment detection
export const config = {
  // Site URL configuration
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://music4study.com',
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  
  // Get the appropriate redirect URL for OAuth
  getRedirectUrl: (): string => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
      
      if (isLocalhost) {
        return window.location.origin;
      }
    }
    
    return config.siteUrl;
  },
  
  // Check if we're running locally
  isLocalhost: (): boolean => {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.hostname.includes('localhost');
    }
    return false;
  }
};

