export const routes = {
  home: '/',
  signIn: '/sign-in',
  getStarted: '/get-started',
  dashboard: '/dashboard',
} as const

export const primaryNav = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Safety', href: '#safety' },
] as const
