import type { ReactNode } from 'react'

import { Wordmark } from '@/components/brand/wordmark'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'

type AuthShellProps = {
  title: string
  description: string
  children: ReactNode
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen max-w-md flex-col justify-center py-12">
        <div className="mb-8">
          <Wordmark />
        </div>
        <Card>
          <CardHeader className="gap-2 p-6">
            <CardTitle className="font-serif text-3xl font-normal tracking-tight">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">{children}</CardContent>
        </Card>
      </Container>
    </main>
  )
}
