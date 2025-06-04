import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
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
              frame-src 'self' https://www.youtube.com https://w.soundcloud.com https://open.spotify.com;
              connect-src 'self' https: wss:;
              font-src 'self' data: https:;
            `.replace(/\s+/g, ' ').trim()
          }
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  webpack: (config, { dev, isServer }) => {
    // Enable tree shaking and dead code elimination
    config.optimization = {
      ...config.optimization,
      minimize: !dev,
    };
    return config;
  },
};

export default nextConfig;
