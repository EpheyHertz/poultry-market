 /** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    // `images.domains` is deprecated — use explicit remotePatterns instead.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  
  // Enforce consistent trailing slash behavior (no trailing slashes except root)
  trailingSlash: false,
  
  async redirects() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.poultrymarket.app';
    
    return [
      // Redirect old Vercel domain to new custom domain (preserves path)
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'poultrymarketke.vercel.app',
          },
        ],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
      // Redirect non-www to www (if both are configured)
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'poultrymarket.app',
          },
        ],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
