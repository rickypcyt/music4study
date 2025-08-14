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
