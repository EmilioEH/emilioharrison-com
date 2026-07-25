import React from 'react'

/**
 * Placeholder screens shown while a lazily-loaded view's chunk downloads.
 *
 * Every drill-down view (recipe detail, week planner, editor, family management) is
 * `React.lazy`, and each Suspense boundary previously fell back to a bare spinner centred on an
 * empty card. On a phone that reads as the app blanking out mid-navigation — reported from real
 * use as a "blank white flash" on both opening a recipe and switching tabs.
 *
 * These stand-ins echo the shape of the view that is about to appear, so the transition reads as
 * content arriving rather than the screen emptying. They are deliberately layout-only: no text,
 * no data, nothing that could be mistaken for real content.
 */

/** One shimmering block. `pulse` is the app's existing idle-loading idiom. */
const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-muted ${className}`} />
)

const CardRowSkeleton: React.FC = () => (
  <div className="flex gap-3 p-2.5">
    <Bar className="h-24 w-24 shrink-0 rounded-lg" />
    <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
      <Bar className="h-4 w-3/4" />
      <Bar className="h-3 w-1/2" />
      <div className="mt-auto flex gap-2">
        <Bar className="h-3 w-14" />
        <Bar className="h-3 w-20" />
      </div>
    </div>
  </div>
)

/** Recipe detail: hero image, title block, stat row, then body copy. */
export const RecipeDetailSkeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-4 overflow-hidden bg-background p-4">
    <Bar className="h-48 w-full rounded-xl" />
    <div className="flex flex-col gap-2">
      <Bar className="h-7 w-4/5" />
      <Bar className="h-7 w-3/5" />
    </div>
    <div className="flex gap-6">
      <Bar className="h-10 w-16" />
      <Bar className="h-10 w-16" />
      <Bar className="h-10 w-16" />
    </div>
    <div className="flex flex-col gap-2">
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-2/3" />
    </div>
  </div>
)

/** Week planner: the day-by-day plan rows. */
export const WeekSkeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-3 overflow-hidden bg-background p-4">
    <div className="flex items-center justify-between">
      <Bar className="h-8 w-40 rounded-full" />
      <Bar className="h-8 w-24 rounded-lg" />
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3">
        <Bar className="h-3 w-20" />
        <Bar className="h-4 w-2/3" />
      </div>
    ))}
  </div>
)

/** Library / generic list of recipe cards. */
export const ListSkeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-1 overflow-hidden bg-background p-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardRowSkeleton key={i} />
    ))}
  </div>
)

/** Editor / form-shaped views. */
export const FormSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 bg-background p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-11 w-full rounded-lg" />
      </div>
    ))}
  </div>
)

export type SkeletonVariant = 'detail' | 'week' | 'list' | 'form'

const VARIANTS: Record<SkeletonVariant, React.FC> = {
  detail: RecipeDetailSkeleton,
  week: WeekSkeleton,
  list: ListSkeleton,
  form: FormSkeleton,
}

/**
 * Suspense fallback for a lazy view. Keeps the `loading-indicator` testid the previous spinner
 * used so existing tests and E2E waits keep working.
 */
export const ViewSkeleton: React.FC<{ variant?: SkeletonVariant }> = ({ variant = 'list' }) => {
  const Variant = VARIANTS[variant] ?? ListSkeleton
  return (
    <div data-testid="loading-indicator" aria-busy="true" aria-live="polite" className="h-full">
      <span className="sr-only">Loading…</span>
      <Variant />
    </div>
  )
}
