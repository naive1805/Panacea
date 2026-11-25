import Link from 'next/link'

import { Wordmark } from '@/components/brand/wordmark'
import { Container } from '@/components/ui/container'
import { primaryNav, routes } from '@/lib/site-config'

const footerNav = [
  ...primaryNav,
  { label: 'Sign in', href: routes.signIn },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface">
      <Container className="flex flex-col gap-10 py-12 md:py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <Wordmark />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Organizational and informational support for your medication
              routine.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-3 sm:flex sm:gap-8">
              {footerNav.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Panacea. All rights reserved.</p>
          <p className="max-w-md sm:text-right">
            Not a substitute for professional medical advice.
          </p>
        </div>
      </Container>
    </footer>
  )
}
