import { AuthShell } from '@/components/auth/auth-shell'
import { SignUpForm } from '@/components/auth/sign-up-form'

export const metadata = { title: 'Get started' }

export default function GetStartedPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Set up Panacea with email and password. Email confirmation is required."
    >
      <SignUpForm />
    </AuthShell>
  )
}
