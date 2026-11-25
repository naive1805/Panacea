import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Newsreader } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: { default: 'Panacea — Medication management, made simpler', template: '%s | Panacea' },
  description:
    'Keep your medicines, schedules, reminders, and medication information organized in one place.',
  applicationName: 'Panacea',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://panacea-neon.vercel.app'),
  openGraph: {
    title: 'Panacea — Medication management, made simpler',
    description: 'Keep medicines, schedules, reminders, and medication information organized in one place.',
    siteName: 'Panacea',
    type: 'website',
    images: ['/open-graph.svg'],
  },
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f9f7f3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${newsreader.variable} bg-background`}
    >
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && (
          <Analytics beforeSend={(event) => {
            try {
              const url = new URL(event.url)
              return { ...event, url: `${url.origin}${url.pathname}` }
            } catch {
              return null
            }
          }} />
        )}
      </body>
    </html>
  )
}
