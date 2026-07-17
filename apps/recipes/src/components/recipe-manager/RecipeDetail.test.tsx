import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecipeDetail } from './RecipeDetail'
import type { Recipe } from '../../lib/types'

// Mock dependencies
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn((store) => {
    // Return mock values based on store name or default
    if (store?.get?.()?.isActive !== undefined) return store.get()
    return false // Default for isPlanned
  }),
}))

vi.mock('../recipe-details/DetailHeader', () => ({
  DetailHeader: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="detail-header">
      <button onClick={() => onAction('edit')}>Edit</button>
      <button onClick={() => onAction('addToWeek')}>Add to Week</button>
    </div>
  ),
}))

vi.mock('../recipe-details/EditRecipeView', () => ({
  EditRecipeView: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="edit-view">
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}))

vi.mock('../recipe-details/OverviewMode', () => ({
  OverviewMode: () => <div data-testid="overview-mode" />,
}))

vi.mock('../recipe-details/VersionHistoryModal', () => ({
  VersionHistoryModal: () => <div data-testid="version-history">Version History</div>,
}))

vi.mock('./dialogs/ShareRecipeDialog', () => ({
  ShareRecipeDialog: () => <div data-testid="share-dialog">Share Dialog</div>,
}))

// Mock the hook we just extracted
const mockRecipeActions = {
  handleAction: vi.fn(),
  handleSaveRecipe: vi.fn(),
  state: {
    shareDialogOpen: false,
    isEditing: false,
    isRefreshing: false,
    refreshProgress: '',
    isHistoryOpen: false,
  },
  setters: {
    setShareDialogOpen: vi.fn(),
    setIsEditing: vi.fn(),
    setIsHistoryOpen: vi.fn(),
  },
}

vi.mock('./useRecipeActions', () => ({
  useRecipeActions: () => mockRecipeActions,
}))

// Mock Layout Primitives
vi.mock('../ui/layout', () => ({
  Stack: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Inline: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Check: () => <span>CheckIcon</span>,
  ListPlus: () => <span>ListIcon</span>,
  Loader2: () => <span>LoaderIcon</span>,
}))

const mockRecipe: Recipe = {
  id: 'recipe-123',
  title: 'Test Recipe',

  ingredients: [],
  steps: [],
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  rating: 0,
  isFavorite: false,
  description: '',
  prepTime: 0,
  cookTime: 0,
  servings: 2,
  tags: [],
  images: [],
  createdBy: 'user-1',
}

describe('RecipeDetail', () => {
  const onClose = vi.fn()
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const onToggleThisWeek = vi.fn()
  const onToggleFavorite = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset hook mock state
    mockRecipeActions.state.isEditing = false
  })

  it('renders overview mode by default', () => {
    render(
      <RecipeDetail
        recipe={mockRecipe}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleThisWeek={onToggleThisWeek}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    expect(screen.getByTestId('detail-header')).toBeInTheDocument()
    expect(screen.getByTestId('overview-mode')).toBeInTheDocument()
    // Both the (mocked) header and the sticky footer expose an Add to Week affordance.
    expect(screen.getAllByText('Add to Week').length).toBeGreaterThan(0)
  })

  it('renders edit view when isEditing is true', () => {
    // Override the hook mock for this test
    mockRecipeActions.state.isEditing = true

    render(
      <RecipeDetail
        recipe={mockRecipe}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleThisWeek={onToggleThisWeek}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    expect(screen.getByTestId('edit-view')).toBeInTheDocument()
  })

  describe('hydration gate (PERFORMANCE-PLAN.md P3 — slim list payload)', () => {
    // GET /api/recipes now ships a slim projection with no `steps` — `steps === undefined` is
    // the signal that `recipe` is that slim record rather than the full document.
    const slimRecipe = { ...mockRecipe, steps: undefined } as unknown as Recipe

    it('renders content immediately for an already-full recipe (steps present)', () => {
      global.fetch = vi.fn()

      render(
        <RecipeDetail
          recipe={mockRecipe}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleThisWeek={onToggleThisWeek}
          onToggleFavorite={onToggleFavorite}
        />,
      )

      expect(screen.getByTestId('overview-mode')).toBeInTheDocument()
      expect(screen.queryByTestId('recipe-detail-loading')).not.toBeInTheDocument()
    })

    it('blocks render behind a loading fallback for a slim record, then hydrates via GET /api/recipes/[id]', async () => {
      const fullRecipe = { ...mockRecipe, steps: ['Step 1'] }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ recipe: fullRecipe }),
      })

      render(
        <RecipeDetail
          recipe={slimRecipe}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleThisWeek={onToggleThisWeek}
          onToggleFavorite={onToggleFavorite}
        />,
      )

      // Blocked immediately — never flashes ingredient/instruction-less content.
      expect(screen.getByTestId('recipe-detail-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('overview-mode')).not.toBeInTheDocument()

      // Once the full document arrives, the gate lifts and the fetched doc is synced back via
      // the non-network-writing 'hydrate' mode (not 'silent', which would PUT it right back).
      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'recipe-123' }), 'hydrate')
      })
    })

    it('stops blocking even if the hydration fetch fails, rather than spinning forever', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

      render(
        <RecipeDetail
          recipe={slimRecipe}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleThisWeek={onToggleThisWeek}
          onToggleFavorite={onToggleFavorite}
        />,
      )

      expect(screen.getByTestId('recipe-detail-loading')).toBeInTheDocument()

      await vi.waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-loading')).not.toBeInTheDocument()
      })
    })
  })
})
