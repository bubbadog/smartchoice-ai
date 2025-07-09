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
      'www.bestbuy.com',
      // Amazon domains (for when fixed)
      'images-na.ssl-images-amazon.com',
      'm.media-amazon.com',
      'images.amazon.com',
      // Other common retailer domains
      'i5.walmartimages.com',
      'target.scene7.com',
    ],
  },
}

module.exports = nextConfig
