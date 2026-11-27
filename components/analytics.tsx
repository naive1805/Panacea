'use client'

import { Analytics as VercelAnalytics } from '@vercel/analytics/next'

export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url)
          return { ...event, url: `${url.origin}${url.pathname}` }
        } catch {
          return null
        }
      }}
    />
  )
}
