import type { CSSProperties } from 'react'

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <p className="flex items-center gap-2.5 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        <span aria-hidden="true" className="h-px w-5 bg-brass" />
        Opening your library…
      </p>
      <div
        aria-hidden="true"
        className="mt-4 h-10 w-72 animate-pulse rounded-md bg-muted"
      />
      <div className="library-shelf-grid mt-10 grid grid-cols-2 gap-x-5 gap-y-8 pb-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="flex h-[15rem] overflow-hidden rounded-r-lg rounded-l-sm border border-border-strong bg-parchment shadow-subtle"
          >
            <span
              className="w-4 shrink-0 animate-pulse bg-muted"
              style={{ '--spine': 'var(--muted)' } as CSSProperties}
            />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-muted" />
              <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
              <div className="mt-auto h-2.5 w-3/4 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
