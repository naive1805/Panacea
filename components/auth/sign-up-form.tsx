'use client'

import Link from 'next/link'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
} from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'

function emailConfirmationRedirect(): string {
  const currentOrigin = window.location.origin
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (process.env.NODE_ENV === 'production' && configuredSiteUrl) {
    try {
      const configured = new URL(configuredSiteUrl)
      const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
      if (!localHosts.has(configured.hostname)) {
        const callback = new URL('/auth/confirm', configured.origin)
        callback.searchParams.set('next', '/dashboard')
        return callback.toString()
      }
    } catch {
      // Fall back to the origin serving the sign-up form if the env value is invalid.
    }
  }

  const callback = new URL('/auth/confirm', currentOrigin)
  callback.searchParams.set('next', '/dashboard')
  return callback.toString()
}

export function SignUpForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Enter your name.')
      return
    }

    if (!trimmedEmail) {
      setError('Enter your email address.')
      return
    }

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
        emailRedirectTo: emailConfirmationRedirect(),
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message || 'Unable to create your account.')
      return
    }

    setSuccess(
      'Account created. Check your email to confirm your account before signing in.',
    )
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {success ? (
        <p
          className="rounded-md border border-success/20 bg-success-soft px-3 py-2 text-sm text-success"
          role="status"
        >
          {success}
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-hint"
          disabled={loading}
          required
        />
        <FieldHint id="password-hint">
          Use at least 8 characters.
        </FieldHint>
      </Field>

      <Field>
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={
            password !== confirmPassword && confirmPassword.length > 0
              ? true
              : undefined
          }
          disabled={loading}
          required
        />
        {password !== confirmPassword && confirmPassword.length > 0 ? (
          <FieldError>Passwords do not match.</FieldError>
        ) : null}
      </Field>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
