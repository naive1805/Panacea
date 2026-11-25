import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://panacea-neon.vercel.app'
  return ['/', '/privacy', '/terms', '/sign-in', '/get-started'].map((route) => ({ url: `${base}${route}` }))
}
