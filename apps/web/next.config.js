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
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig
