import React, { Suspense, useState } from 'react'
import { ViewSkeleton, type SkeletonVariant } from '../ui/ViewSkeleton'

/** Picks the placeholder shape matching the view being navigated to. */
function skeletonVariantForView(view: string): SkeletonVariant {
  if (view === 'detail') return 'detail'
  if (view === 'week') return 'week'
  if (view === 'edit' || view === 'invite' || view === 'family-settings') return 'form'
  return 'list'
}
import { AlertCircle } from 'lucide-react'
import type { Recipe, Family } from '../../lib/types'
import type { ViewMode } from './hooks/useRouter'
import { LazyViewErrorBoundary } from '../ui/LazyViewErrorBoundary'

// Non-library views are code-split: each is only fetched when the user actually
// navigates to it, keeping the entry chunk limited to the library view.
const RecipeDetail = React.lazy(() =>
  import('./RecipeDetail').then((m) => ({ default: m.RecipeDetail })),
)
const AdminDashboard = React.lazy(() =>
  import('../admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const InviteView = React.lazy(() =>
  import('./views/InviteView').then((m) => ({ default: m.InviteView })),
)
const FamilyManagementView = React.lazy(() =>
  import('./views/FamilyManagementView').then((m) => ({ default: m.FamilyManagementView })),
)
const ImportReviewView = React.lazy(() =>
  import('./views/ImportReviewView').then((m) => ({ default: m.ImportReviewView })),
)

// Fallback while a lazy view's chunk loads. Each boundary passes the shape of the view that is
// about to render, so navigation looks like content arriving rather than the app blanking out.

interface RecipeManagerViewProps {
  view: string
  loading: boolean
  initialized: boolean
  error: string | null
  selectedRecipe: Recipe | null
  user: string | null | undefined
  isAdmin: boolean
  family: Family | null

  handleUpdateRecipe: (recipe: Recipe, mode: 'save' | 'edit' | 'silent' | 'hydrate') => void
  handleSaveRecipe: (
    recipe: Partial<Recipe>,
  ) => Promise<{ success: boolean; savedId?: string } | void>
  handleDeleteRecipe: (id: string) => void
  handleAddToWeek: (id: string) => void
  refreshRecipes: (force?: boolean) => void
  setView: (view: ViewMode) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRoute: (route: any) => void
  children: React.ReactNode
}

export const RecipeManagerView: React.FC<RecipeManagerViewProps> = ({
  view,
  loading,
  initialized,
  error,
  selectedRecipe,
  isAdmin,
  family,

  handleUpdateRecipe,
  handleSaveRecipe,
  handleDeleteRecipe,
  handleAddToWeek,
  refreshRecipes,
  setView,

  children,
}) => {
  // Bumped on retry to force React to remount the failed Suspense/lazy subtree and re-trigger
  // the dynamic import, rather than staying stuck on the same errored view.
  const [retryKey, setRetryKey] = useState(0)
  const retryView = () => setRetryKey((k) => k + 1)

  React.useEffect(() => {
    if (view === 'admin-dashboard' && !isAdmin) {
      setView('library')
    }
  }, [view, isAdmin, setView])

  // Initial data load, before any recipes have arrived. Shaped to whichever view is being
  // navigated to so a cold open doesn't blank the screen either.
  if (loading) {
    return <ViewSkeleton variant={skeletonVariantForView(view)} />
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-card p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <button
          onClick={() => refreshRecipes(true)}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  if (view === 'detail' && selectedRecipe) {
    return (
      <LazyViewErrorBoundary key={retryKey} onRetry={retryView}>
        <Suspense fallback={<ViewSkeleton variant="detail" />}>
          <RecipeDetail
            key={selectedRecipe.id}
            recipe={selectedRecipe}
            onClose={() => setView('library')}
            onUpdate={handleUpdateRecipe}
            onDelete={(id) => handleDeleteRecipe(id)}
            onToggleThisWeek={() => handleAddToWeek(selectedRecipe.id)}
          />
        </Suspense>
      </LazyViewErrorBoundary>
    )
  }

  // Handle recipe not found - but only AFTER recipes have been initialized
  // This prevents the "Recipe Not Found" screen from flashing during initial load
  // or when the page reloads (e.g., from service worker update)
  if (view === 'detail' && !selectedRecipe) {
    // If recipes haven't been initialized yet, show loading spinner
    // This prevents premature "Recipe Not Found" during page load/reload
    if (!initialized) {
      return (
        <ViewSkeleton variant="detail" />
      )
    }

    // Recipes are initialized but recipe not found - show the not found screen
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-card p-6 text-center">
        <h2 className="text-xl font-bold text-foreground">Recipe Not Found</h2>
        <p className="max-w-md text-muted-foreground">
          This recipe may have been deleted or is no longer available.
        </p>
        <button
          onClick={() => setView('library')}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to Recipes
        </button>
      </div>
    )
  }

  if (view === 'admin-dashboard') {
    if (!isAdmin) {
      return null
    }
    return (
      <LazyViewErrorBoundary key={retryKey} onRetry={retryView}>
        <Suspense fallback={<ViewSkeleton variant="list" />}>
          <AdminDashboard onClose={() => setView('library')} />
        </Suspense>
      </LazyViewErrorBoundary>
    )
  }

  if (view === 'invite') {
    return (
      <LazyViewErrorBoundary key={retryKey} onRetry={retryView}>
        <Suspense fallback={<ViewSkeleton variant="form" />}>
          <InviteView onClose={() => setView('library')} />
        </Suspense>
      </LazyViewErrorBoundary>
    )
  }

  if (view === 'import-review') {
    return (
      <LazyViewErrorBoundary key={retryKey} onRetry={retryView}>
        <Suspense fallback={<ViewSkeleton variant="list" />}>
          <ImportReviewView onClose={() => setView('library')} onSaveRecipe={handleSaveRecipe} />
        </Suspense>
      </LazyViewErrorBoundary>
    )
  }

  if (view === 'family-settings') {
    return (
      <LazyViewErrorBoundary key={retryKey} onRetry={retryView}>
        <Suspense fallback={<ViewSkeleton variant="form" />}>
          <FamilyManagementView onClose={() => setView('library')} family={family} />
        </Suspense>
      </LazyViewErrorBoundary>
    )
  }

  return <>{children}</>
}
