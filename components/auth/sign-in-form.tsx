'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'

type SignInFormProps = {
  initialMessage?: string
  nextPath?: string
}

export function SignInForm({
  initialMessage,
  nextPath = '/dashboard',
}: SignInFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Enter your email address.')
      return
    }

    if (!password) {
      setError('Enter your password.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message || 'Unable to sign in with those details.')
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {initialMessage ? (
        <p className="rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {initialMessage}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error?.toLowerCase().includes('email') || undefined}
          disabled={loading}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error?.toLowerCase().includes('password') || undefined}
          disabled={loading}
          required
        />
      </Field>

      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to Panacea?{' '}
        <Link
          href="/get-started"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}
