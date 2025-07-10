/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Transpile packages from the monorepo
  transpilePackages: [
    '@smartchoice-ai/shared-types',
    '@smartchoice-ai/utils',
    '@smartchoice-ai/ui',
  ],
  images: {
    domains: [
      'images.unsplash.com',
      // Best Buy domains
      'pisces.bbystatic.com',
      'assets.bbystatic.com',
      // Amazon domains (for future use)
      'images-na.ssl-images-amazon.com',
      'm.media-amazon.com',
      // Walmart domains
      'i5.walmartimages.com',
      // Target domains
      'target.scene7.com',
      // Generic image hosting
      'via.placeholder.com'
    ],
    // Enable image optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // PWA Support
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
        ],
      },
    ]
  },
  // Webpack customization for PWA
  webpack: (config, { dev, isServer }) => {
    // Don't bundle service worker in the main bundle
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
  // Output standalone for deployment
  output: 'standalone',
  // Optimize for performance
  swcMinify: true,
  compress: true,
  // Enable experimental features
  experimental: {
    ...nextConfig.experimental,
    serverComponentsExternalPackages: ['@smartchoice-ai/shared-types'],
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'SmartChoice AI',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_APP_DESCRIPTION: 'AI-powered shopping assistant that eliminates decision fatigue',
  },
  // Redirects for PWA
  async redirects() {
    return [
      // Redirect old paths to new PWA-friendly paths
      {
        source: '/app/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
  // Rewrites for PWA features
  async rewrites() {
    return [
      // Service worker
      {
        source: '/service-worker.js',
        destination: '/sw.js',
      },
      // Manifest
      {
        source: '/site.webmanifest',
        destination: '/manifest.json',
      },
    ]
  },
}

module.exports = nextConfig
