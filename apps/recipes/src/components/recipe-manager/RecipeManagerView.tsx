import React from 'react'
import { Loader2, ArrowLeft } from 'lucide-react'
import { OnboardingFlow } from '../onboarding/OnboardingFlow'
import { RecipeDetail } from './RecipeDetail'
import { NotificationSettingsView } from './views/NotificationSettingsView'
import { SettingsView } from './views/SettingsView'
import { BulkRecipeImporter } from './importer/BulkRecipeImporter'
import FeedbackDashboard from './views/FeedbackDashboard'
import { AdminDashboard } from '../admin/AdminDashboard'
import { InviteView } from './views/InviteView'
import { GroceryList } from './grocery/GroceryList'
import { FamilyManagementView } from './views/FamilyManagementView'
import type { Recipe, Family, ShoppableIngredient } from '../../lib/types'
import type { ViewMode } from './hooks/useRouter'

interface RecipeManagerViewProps {
  view: string
  loading: boolean
  error: string | null
  showOnboarding: boolean
  selectedRecipe: Recipe | null
  user: string | null | undefined
  isAdmin: boolean
  family: Family | null
  groceryItems: ShoppableIngredient[]
  isGenerating: boolean
  targetRecipes: Recipe[]
  handleOnboardingComplete: () => void
  handleUpdateRecipe: (recipe: Recipe, mode: 'save' | 'edit') => void
  handleDeleteRecipe: (id: string) => void
  handleAddToWeek: (id: string) => void
  handleToggleFavorite: (recipe: Recipe) => void
  handleExport: () => void
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDeleteAll: () => void
  handleUpdateProfile: (name: string) => Promise<boolean>
  handleBulkImportSave: (recipes: Recipe[]) => void
  refreshRecipes: (force?: boolean) => void
  setView: (view: ViewMode) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRoute: (route: any) => void
  children: React.ReactNode
}

export const RecipeManagerView: React.FC<RecipeManagerViewProps> = ({
  view,
  loading,
  error,
  showOnboarding,
  selectedRecipe,
  user,
  isAdmin,
  family,
  groceryItems,
  isGenerating,
  targetRecipes,
  handleOnboardingComplete,
  handleUpdateRecipe,
  handleDeleteRecipe,
  handleAddToWeek,
  handleToggleFavorite,
  handleExport,
  handleImport,
  handleDeleteAll,
  handleUpdateProfile,
  handleBulkImportSave,
  refreshRecipes,
  setView,
  setRoute,
  children,
}) => {
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  if (loading) {
    return (
      <div
        data-testid="loading-indicator"
        className="flex h-full items-center justify-center bg-card"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-card p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <Loader2 className="h-8 w-8 text-destructive" />
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
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={() => setView('library')}
        onUpdate={handleUpdateRecipe}
        onDelete={(id) => handleDeleteRecipe(id)}
        onToggleThisWeek={() => handleAddToWeek(selectedRecipe.id)}
        onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
      />
    )
  }

  if (view === 'notifications') {
    return <NotificationSettingsView onClose={() => setView('library')} />
  }

  if (view === 'settings') {
    return (
      <SettingsView
        onClose={() => setView('library')}
        onExport={handleExport}
        onImport={handleImport}
        onDeleteAccount={handleDeleteAll}
        currentName={user ?? undefined}
        onUpdateProfile={handleUpdateProfile}
      />
    )
  }

  if (view === 'bulk-import') {
    return (
      <BulkRecipeImporter
        onClose={() => setView('library')}
        onRecipesParsed={handleBulkImportSave}
      />
    )
  }

  if (view === 'feedback-dashboard') {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <button onClick={() => setView('library')} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <FeedbackDashboard />
        </div>
      </div>
    )
  }

  if (view === 'admin-dashboard') {
    if (!isAdmin) {
      setView('library')
      return null
    }
    return <AdminDashboard onClose={() => setView('library')} />
  }

  if (view === 'invite') {
    return <InviteView onClose={() => setView('library')} />
  }

  if (view === 'grocery') {
    return (
      <div className="flex h-full flex-col">
        <GroceryList
          ingredients={groceryItems}
          isLoading={isGenerating}
          onClose={() => setView('library')}
          recipes={targetRecipes}
          onOpenRecipe={(recipe: Recipe) => {
            setRoute({ activeRecipeId: recipe.id, view: 'detail' })
          }}
        />
      </div>
    )
  }

  if (view === 'family-settings') {
    return <FamilyManagementView onClose={() => setView('library')} family={family} />
  }

  return <>{children}</>
}
