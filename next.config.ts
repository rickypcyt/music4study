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
