import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  id?: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'start' | 'center'
  className?: string
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2.5 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase',
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-5 bg-primary" />
      {children}
    </p>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'start',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-4',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className="font-serif text-3xl leading-[1.15] font-normal tracking-tight text-balance text-foreground md:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-relaxed text-pretty text-muted-foreground md:text-[1.0625rem]">
          {description}
        </p>
      ) : null}
    </div>
  )
}
