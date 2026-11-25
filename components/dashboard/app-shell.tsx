'use client'

import { Bell, BookOpen, CalendarDays, History, Menu, Plus, ScanBarcode, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'

import { LogoutButton } from '@/components/auth/logout-button'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const workspaceNav = [
  { label: 'Today', href: '/dashboard', icon: CalendarDays },
  { label: 'Library', href: '/dashboard/medicines', icon: BookOpen },
  { label: 'History', href: '/dashboard/history', icon: History },
  { label: 'Reminders', href: '/dashboard/reminders', icon: Bell },
] as const

const actionNav = [
  { label: 'Add medicine', href: '/dashboard/medicines/new', icon: Plus },
  { label: 'Scan a box', href: '/dashboard/scan', icon: ScanBarcode },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

type AppShellProps = {
  children: ReactNode
  displayName: string
  displayEmail: string
}

export function AppShell({ children, displayName, displayEmail }: AppShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const nav = (
    <>
      <p className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        The sections
      </p>
      <nav className="space-y-1" aria-label="Workspace">
        {workspaceNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brass before:transition-opacity',
                active
                  ? 'bg-card font-medium text-foreground shadow-subtle before:opacity-100'
                  : 'text-muted-foreground before:opacity-0 hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <p className="mt-10 mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Add to the shelf
      </p>
      <nav className="space-y-1" aria-label="Actions">
        {actionNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brass before:transition-opacity',
                active
                  ? 'bg-card font-medium text-foreground shadow-subtle before:opacity-100'
                  : 'text-muted-foreground before:opacity-0 hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )

  const account = (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{displayEmail}</p>
      </div>
      <LogoutButton />
    </div>
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="hidden border-r bg-parchment-deep/50 md:flex md:min-h-screen md:w-64 md:flex-col">
          <div className="flex flex-col px-6 py-5">
            <Wordmark />
            <div className="mt-10">{nav}</div>
          </div>
          <div className="mt-auto border-t p-6">{account}</div>
        </aside>

        <section className="library-canvas flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b bg-background/80 px-5 py-3.5 backdrop-blur md:hidden">
            <Wordmark size="sm" />
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-controls="workspace-nav"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </Button>
          </header>

          {open ? (
            <div
              id="workspace-nav"
              className="border-b bg-parchment-deep/50 px-5 py-5 backdrop-blur md:hidden"
            >
              <div className="flex flex-col gap-8">{nav}</div>
              <div className="mt-8 border-t pt-5">{account}</div>
            </div>
          ) : null}

          <div className="flex-1">{children}</div>
        </section>
      </div>
    </main>
  )
}
