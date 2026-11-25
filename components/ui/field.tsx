import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Field({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  )
}

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-subtle transition-colors outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  )
}

function FieldHint({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-hint"
      className={cn('text-xs leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn('text-xs font-medium text-destructive', className)}
      {...props}
    />
  )
}

export { Field, Label, Input, FieldHint, FieldError }
