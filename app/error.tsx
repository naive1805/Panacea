'use client'

import { useEffect } from 'react'

import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen bg-background">
      <Container className="flex max-w-md flex-col justify-center py-16">
        <Wordmark />
        <h1 className="mt-10 font-serif text-4xl font-normal tracking-tight text-balance">
          Something interrupted your reading.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Panacea could not finish loading this page. Your saved medicines are
          untouched — try again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="outline">
            Back to today
          </ButtonLink>
        </div>
      </Container>
    </main>
  )
}
