import type { NextConfig } from "next";

// Configuración del Bundle Analyzer
const withBundleAnalyzer = async (config: NextConfig) => {
  try {
    const withBundleAnalyzerPkg = (await import('@next/bundle-analyzer')).default({
      enabled: process.env.ANALYZE === 'true',
    });
    return withBundleAnalyzerPkg(config);
  } catch {
    // Ignorar el error, solo mostrar advertencia
    console.warn('@next/bundle-analyzer no está instalado. Ejecuta: pnpm add -D @next/bundle-analyzer');
    return config;
  }
};

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Paquetes externos para server components
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  // Configuración experimental combinada
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'framer-motion',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast'
    ],
    turbo: {
      rules: {
        '*.{ts,tsx}': [
          {
            loader: 'tsx',
            options: {
              fastRefresh: true,
            },
          },
        ],
      },
    },
  },
  // Deshabilitar la generación estática para rutas específicas
  generateBuildId: async () => 'build-' + Date.now(),
  images: {
    domains: [
      'i.scdn.co',
      'img.youtube.com',
      'i.ytimg.com',
      'youtube.com',
      'www.youtube.com',
      'image-cdn-ak.spotifycdn.com',
      'image-cdn-fa.spotifycdn.com'
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self' https: blob:;
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:;
              style-src 'self' 'unsafe-inline' https:;
              img-src 'self' data: https: blob:;
              media-src 'self' https: blob:;
              frame-src 'self'
                https://www.youtube.com
                https://youtube.com
                https://www.youtube-nocookie.com
                https://youtube-nocookie.com
                https://youtu.be
                https://www.youtu.be
                https://www.youtube.com/embed
                https://youtube.com/embed
                https://www.youtube-nocookie.com/embed
                https://youtube-nocookie.com/embed
                https://w.soundcloud.com
                https://soundcloud.com
                https://open.spotify.com
                https://player.spotify.com
                https://*.spotify.com
                https://*.youtube.com
                https://*.youtube-nocookie.com
                https://*.youtu.be
                https://*.soundcloud.com;
              connect-src 'self' https: wss:;
              font-src 'self' data: https://fonts.gstatic.com;
              base-uri 'self';
              form-action 'self';
            `.replace(/\s+/g, ' ').trim()
          }
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    // Enable tree shaking and dead code elimination
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module: { context?: string }) {
                const packageName = module.context?.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `npm.${packageName?.replace('@', '')}`;
              },
            },
          },
        },
      };
    }
    return config;
  },
};

// Aplicar todas las configuraciones
export default withBundleAnalyzer(nextConfig);
