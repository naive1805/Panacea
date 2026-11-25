/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permit the LAN address used to reach the dev server from another device.
  // This option applies only to development resources such as HMR.
  allowedDevOrigins: ['172.16.0.2'],
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
