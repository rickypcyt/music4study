// Suppress YouTube iframe warnings that we cannot control
// These warnings are normal and don't affect functionality

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// YouTube iframe warnings to suppress
const youtubeWarnings = [
  'Feature Policy: Skipping unsupported feature name',
  'Cookie "__Secure-YEC" has been rejected',
  'Partitioned cookie or storage access',
  'unreachable code after return statement',
  'Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at data:text/plain',
  // Additional variants
  '__Secure-YEC',
  'has been rejected because it is in a cross-site context',
  'SameSite=Lax',
  'SameSite=Strict',
  // New partitioned cookie warnings
  'Partitioned cookie or storage access was provided to',
  'dynamic state partitioning is enabled',
  'third-party context',
  // Feature policy specific warnings
  'accelerometer',
  'autoplay',
  'clipboard-write',
  'encrypted-media',
  'gyroscope',
  'picture-in-picture',
  'www-widgetapi.js',
  // CORS errors
  'Cross-Origin Request Blocked',
  'Same Origin Policy disallows reading',
  'CORS request not http',
  'data:text/plain;base64',
  // YouTube iframe API specific CORS warnings
  'https://www.youtube.com/iframe_api',
  'CORS header \'Access-Control-Allow-Origin\' missing',
  'Status code: 200'
];

// YouTube iframe errors to suppress
const youtubeErrors = [
  'unreachable code after return statement',
  'Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at data:text/plain',
  'Same Origin Policy disallows reading',
  'CORS request not http',
  'https://www.youtube.com/iframe_api',
  'CORS header \'Access-Control-Allow-Origin\' missing',
  'Status code: 200'
];

// Function to detect YouTube video ID patterns
function isYouTubeVideoIdPattern(message: string): boolean {
  // YouTube video IDs are typically 11 characters long and contain letters, numbers, hyphens, and underscores
  const videoIdPattern = /\b[a-zA-Z0-9_-]{11}\b/;
  return videoIdPattern.test(message) && 
         (message.includes('youtube') || 
          message.includes('__Secure-YEC') ||
          message.includes('data:text/plain'));
}

console.warn = function(...args: unknown[]) {
  const message = args.join(' ');
  
  // Check if this is a YouTube warning we want to suppress
  const isYoutubeWarning = youtubeWarnings.some(warning => {
    // For specific YouTube-related warnings, be more precise
    if (warning.includes('www-widgetapi.js') || 
        warning.includes('Partitioned cookie') ||
        warning.includes('Feature Policy') ||
        warning.includes('Cross-Origin') ||
        warning.includes('CORS') ||
        warning.includes('data:text/plain')) {
      return message.includes(warning) && 
             (message.includes('youtube') || 
              message.includes('www-widgetapi.js') ||
              message.includes('iframe_api') ||
              message.includes('__Secure-YEC') ||
              message.includes('data:text/plain'));
    }
    // For general warnings, use simple inclusion
    return message.includes(warning);
  });
  
  // Also check for YouTube video ID patterns
  const hasVideoIdPattern = isYouTubeVideoIdPattern(message);
  
  if (!isYoutubeWarning && !hasVideoIdPattern) {
    originalConsoleWarn.apply(console, args);
  }
};

console.error = function(...args: unknown[]) {
  const message = args.join(' ');
  
  // Check if this is a YouTube error we want to suppress
  const isYoutubeError = youtubeErrors.some(error => {
    // For CORS and cross-origin errors, be more specific
    if (error.includes('Cross-Origin') || 
        error.includes('Same Origin Policy') ||
        error.includes('CORS')) {
      return message.includes(error) && 
             (message.includes('youtube') || 
              message.includes('www-widgetapi.js') ||
              message.includes('iframe_api') ||
              message.includes('data:text/plain'));
    }
    // For general errors, use simple inclusion
    return message.includes(error);
  });
  
  // Also check for YouTube video ID patterns
  const hasVideoIdPattern = isYouTubeVideoIdPattern(message);
  
  // Also suppress YouTube API loading errors
  const isAPIError = message.includes('Failed to load YouTube iframe API script') ||
                     message.includes('YouTube API failed to load within timeout') ||
                     message.includes('YouTube API not available');
  
  if (!isYoutubeError && !hasVideoIdPattern && !isAPIError) {
    originalConsoleError.apply(console, args);
  }
};

// Export a function to restore original console if needed
export function restoreConsole() {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}
