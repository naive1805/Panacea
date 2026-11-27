import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'

type SignInPageProps = {
  searchParams?: Promise<{
    confirmed?: string
    confirmation?: string
    next?: string
  }>
}

export const metadata = { title: 'Sign in' }

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const requestedNext = params?.next
  const nextPath =
    requestedNext === '/dashboard' || requestedNext?.startsWith('/dashboard/')
      ? requestedNext
      : '/dashboard'
  const initialMessage =
    params?.confirmed === 'true'
      ? 'Your email is confirmed. You can sign in now.'
      : params?.confirmation === 'failed'
        ? 'This confirmation link may be expired or invalid. Request a new email and try again. If the problem continues, the site owner should check the Supabase Auth redirect URL settings.'
      : undefined

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to your Panacea workspace."
    >
      <SignInForm
        initialMessage={initialMessage}
        nextPath={nextPath}
      />
    </AuthShell>
  )
}
