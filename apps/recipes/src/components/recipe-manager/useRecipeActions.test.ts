import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecipeActions } from './useRecipeActions'
import type { Recipe } from '../../lib/types'
import * as dialogStore from '../../lib/dialogStore'

// Mock dependencies
vi.mock('../../lib/dialogStore', () => ({
  confirm: vi.fn(),
  alert: vi.fn(),
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

describe('useRecipeActions', () => {
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const onToggleThisWeek = vi.fn()
  const onToggleFavorite = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    expect(result.current.state.shareDialogOpen).toBe(false)
    expect(result.current.state.isEditing).toBe(false)
    expect(result.current.state.isRefreshing).toBe(false)
  })

  it('handles edit action', async () => {
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('edit')
    })
    expect(result.current.state.isEditing).toBe(true)
  })

  it('handles delete action (confirmed)', async () => {
    vi.spyOn(dialogStore, 'confirm').mockResolvedValue(true)
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('delete')
    })
    expect(onDelete).toHaveBeenCalledWith(mockRecipe.id)
  })

  it('handles delete action (cancelled)', async () => {
    vi.spyOn(dialogStore, 'confirm').mockResolvedValue(false)
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('delete')
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('handles addToWeek action', async () => {
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('addToWeek')
    })
    expect(onToggleThisWeek).toHaveBeenCalledWith(mockRecipe.id)
  })

  it('handles toggleFavorite action', async () => {
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('toggleFavorite')
    })
    expect(onToggleFavorite).toHaveBeenCalled()
  })

  it('handles share action', async () => {
    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('share')
    })
    expect(result.current.state.shareDialogOpen).toBe(true)
  })

  it('handles save recipe success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    // Set editing true first
    act(() => {
      result.current.setters.setIsEditing(true)
    })

    await act(async () => {
      await result.current.handleSaveRecipe({ ...mockRecipe, title: 'Updated' })
    })

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }), 'save')
    expect(result.current.state.isEditing).toBe(false)
  })

  it('handles save recipe failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    })

    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleSaveRecipe(mockRecipe)
    })

    expect(dialogStore.alert).toHaveBeenCalledWith('Failed to save recipe')
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('handles refresh action success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, recipe: { ...mockRecipe, title: 'Refreshed' } }),
    })

    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('refresh')
    })

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Refreshed' }), 'silent')
  })

  it('handles refresh action failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Some error' }),
    })

    const { result } = renderHook(() =>
      useRecipeActions({
        recipe: mockRecipe,
        onUpdate,
        onDelete,
        onToggleThisWeek,
        onToggleFavorite,
      }),
    )

    await act(async () => {
      await result.current.handleAction('refresh')
    })

    expect(dialogStore.alert).toHaveBeenCalledWith(expect.stringContaining('Some error'), 'Error')
  })
})
