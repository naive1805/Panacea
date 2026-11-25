'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'
import { primaryNav, routes } from '@/lib/site-config'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Wordmark />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((item) => (
              <li key={item.href}>
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

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href={routes.signIn} variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href={routes.getStarted} size="sm">
            Get started
          </ButtonLink>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </Button>
      </Container>

      {open ? (
        <div id="mobile-nav" className="border-t bg-background md:hidden">
          <Container className="flex flex-col gap-6 py-6">
            <nav aria-label="Mobile">
              <ul className="flex flex-col">
                {primaryNav.map((item) => (
                  <li key={item.href} className="border-b last:border-b-0">
                    <Link
                      href={item.href}
                      onClick={close}
                      className="block py-3.5 text-base text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="grid grid-cols-2 gap-3">
              <ButtonLink
                href={routes.signIn}
                variant="outline"
                onClick={close}
              >
                Sign in
              </ButtonLink>
              <ButtonLink href={routes.getStarted} onClick={close}>
                Get started
              </ButtonLink>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  )
}
