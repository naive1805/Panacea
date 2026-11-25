'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" onClick={handleLogout} disabled={loading}>
      {loading ? 'Signing out...' : 'Log out'}
    </Button>
  )
}
