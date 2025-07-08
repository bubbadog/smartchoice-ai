/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable the new app directory
    appDir: true,
  },
  // Transpile packages from the monorepo
  transpilePackages: [
    '@smartchoice-ai/shared-types',
    '@smartchoice-ai/utils',
    '@smartchoice-ai/ui',
  ],
}

module.exports = nextConfig
