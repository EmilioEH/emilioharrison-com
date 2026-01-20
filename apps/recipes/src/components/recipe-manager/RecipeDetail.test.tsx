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

vi.mock('../../stores/cookingSession', () => ({
  $cookingSession: {
    get: () => ({ isActive: false, recipeId: null }),
  },
  cookingSessionActions: {
    startSession: vi.fn(),
  },
}))

vi.mock('../recipe-details/DetailHeader', () => ({
  DetailHeader: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="detail-header">
      <button onClick={() => onAction('edit')}>Edit</button>
      <button onClick={() => onAction('addToWeek')}>Add to Week</button>
    </div>
  ),
}))

vi.mock('../cooking-mode/CookingContainer', () => ({
  CookingContainer: () => <div data-testid="cooking-container">Cooking Mode</div>,
}))

vi.mock('../recipe-details/EditRecipeView', () => ({
  EditRecipeView: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="edit-view">
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}))

vi.mock('../recipe-details/OverviewMode', () => ({
  OverviewMode: ({ startCooking }: { startCooking: () => void }) => (
    <div data-testid="overview-mode">
      <button onClick={startCooking}>Start Cooking Proxy</button>
    </div>
  ),
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
  Play: () => <span>PlayIcon</span>,
  Check: () => <span>CheckIcon</span>,
  ListPlus: () => <span>ListIcon</span>,
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
    expect(screen.getByText('Start Cooking')).toBeInTheDocument() // The footer button
  })

  it('renders cooking container when isCooking is true', async () => {
    // We need to override the default useStore mock for this specific test
    const { useStore } = await import('@nanostores/react')
    vi.mocked(useStore).mockReturnValueOnce({ isActive: true, recipeId: 'recipe-123' }) // For cooking session

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

    expect(screen.getByTestId('cooking-container')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-header')).not.toBeInTheDocument()
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
})
