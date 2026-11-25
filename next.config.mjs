/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set NEXT_ALLOWED_DEV_ORIGIN when accessing the dev server from a LAN device.
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGIN
    ? [process.env.NEXT_ALLOWED_DEV_ORIGIN]
    : [],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(), geolocation=(), camera=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
