import Link from 'next/link'

import { Wordmark } from '@/components/brand/wordmark'
import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'

export default function NotFound() {
  return (
    <main className="flex min-h-screen bg-background">
      <Container className="flex max-w-md flex-col justify-center py-16">
        <Wordmark />
        <h1 className="mt-10 font-serif text-4xl font-normal tracking-tight text-balance">
          That page is not on the shelf.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The link may be old, or the medicine may have been archived.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/dashboard">Back to today</ButtonLink>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md px-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Panacea home
          </Link>
        </div>
      </Container>
    </main>
  )
}
