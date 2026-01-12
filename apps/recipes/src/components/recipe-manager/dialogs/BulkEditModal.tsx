import React, { useState } from 'react'
import { X, AlertCircle, Save } from 'lucide-react'
import { Stack, Inline, Cluster } from '@/components/ui/layout'
import { alert } from '../../../lib/dialogStore'
import { Badge } from '@/components/ui/badge'
import { ResponsiveModal } from '../../ui/ResponsiveModal'
import type { Recipe } from '../../../lib/types'

interface BulkEditModalProps {
  selectedCount: number
  onClose: () => void
  onSave: (updates: Partial<Recipe>) => Promise<void>
}

// Helper for options
const MEAL_TYPES = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert']
const DISH_TYPES = ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const CUISINES = [
  'Italian',
  'Mexican',
  'Asian',
  'American',
  'Mediterranean',
  'Indian',
  'Thai',
  'Greek',
  'French',
  'Fusion',
  'Other',
]

export const BulkEditModal: React.FC<BulkEditModalProps> = ({ selectedCount, onClose, onSave }) => {
  const [updates, setUpdates] = useState<Partial<Recipe>>({})
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const handleFieldToggle = (field: keyof Recipe) => {
    setActiveFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
        // Clear value when unchecking
        setUpdates((u) => {
          const newU = { ...u }
          delete newU[field]
          return newU
        })
      } else {
        next.add(field)
      }
      return next
    })
  }

  const handleUpdateField = (field: keyof Recipe, value: string | number | boolean | string[]) => {
    setUpdates((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (activeFields.size === 0) return
    setSaving(true)
    try {
      await onSave(updates)
      onClose()
    } catch (e) {
      console.error(e)
      await alert('Failed to save bulk edits')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onClose}
      title="Bulk Edit Recipes"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || activeFields.size === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Apply Changes'}
            {!saving && <Save size={16} />}
          </button>
        </div>
      }
    >
      <Stack spacing="lg" className="p-6">
        <Inline justify="between" align="center">
          <h2 className="font-display text-xl font-bold">Bulk Edit</h2>
          <Inline spacing="sm">
            <Badge variant="secondary" size="md">
              {selectedCount} selected
            </Badge>
            <button
              onClick={onClose}
              className="bg-card-variant rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </Inline>
        </Inline>

        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>
              Select the fields you want to update. Only checked fields will be applied to all
              selected recipes. Existing values for unchecked fields will remain unchanged.
            </p>
          </div>
        </div>

        <Stack spacing="lg">
          {/* Cuisine & Meal Type */}
          <Stack spacing="sm">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Categorization</h3>
            <Cluster spacing="md">
              <Stack spacing="xs" className="flex-1">
                <label
                  htmlFor="cuisine-select"
                  className="text-[10px] font-bold uppercase text-muted-foreground"
                >
                  Cuisine
                </label>
                <select
                  id="cuisine-select"
                  disabled={!activeFields.has('cuisine')}
                  className="bg-card-variant w-full rounded-md border border-border p-2"
                  value={updates.cuisine || ''}
                  onChange={(e) => handleUpdateField('cuisine', e.target.value)}
                >
                  <option value="">Select...</option>
                  {CUISINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Stack>
              <Stack spacing="xs" className="flex-1">
                <label
                  htmlFor="mealtype-select"
                  className="text-[10px] font-bold uppercase text-muted-foreground"
                >
                  Meal Type
                </label>
                <select
                  id="mealtype-select"
                  disabled={!activeFields.has('mealType')}
                  className="bg-card-variant w-full rounded-md border border-border p-2"
                  value={updates.mealType || ''}
                  onChange={(e) => handleUpdateField('mealType', e.target.value)}
                >
                  <option value="">Select...</option>
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Stack>
            </Cluster>
          </Stack>

          {/* Dish Type */}
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="check-dishType"
              checked={activeFields.has('dishType')}
              onChange={() => handleFieldToggle('dishType')}
              className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="check-dishType" className="font-medium text-gray-900">
                Dish Type
              </label>
              <select
                disabled={!activeFields.has('dishType')}
                value={updates.dishType || ''}
                onChange={(e) => handleUpdateField('dishType', e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select Dish Type...</option>
                {DISH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty */}
          <Stack spacing="sm">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Set Difficulty</h3>
            <div className="flex items-start gap-4">
              {' '}
              {/* Re-added checkbox for difficulty */}
              <input
                type="checkbox"
                id="check-difficulty"
                checked={activeFields.has('difficulty')}
                onChange={() => handleFieldToggle('difficulty')}
                className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="check-difficulty" className="font-medium text-gray-900">
                  Difficulty
                </label>
                <div className="bg-card-variant flex rounded-lg border border-border p-1">
                  {DIFFICULTIES.map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      disabled={!activeFields.has('difficulty')}
                      onClick={() => handleUpdateField('difficulty', diff)}
                      className={`flex-1 rounded-md py-2 text-sm font-medium transition-all hover:bg-background hover:shadow-sm ${
                        updates.difficulty === diff
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Stack>

          {/* Times */}
          <Stack spacing="sm">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Adjust Times</h3>
            <Cluster spacing="md">
              <Stack spacing="xs" className="flex-1">
                <label
                  htmlFor="preptime-input"
                  className="text-[10px] font-bold uppercase text-muted-foreground"
                >
                  Prep Time
                </label>
                <input
                  type="number"
                  placeholder="mins"
                  disabled={!activeFields.has('prepTime')} // Assuming prepTime is a field
                  value={updates.prepTime || ''}
                  className="bg-card-variant w-full rounded-md border border-border p-2"
                  onChange={(e) => handleUpdateField('prepTime', parseInt(e.target.value) || 0)}
                />
              </Stack>
              <Stack spacing="xs" className="flex-1">
                <label
                  htmlFor="cooktime-input"
                  className="text-[10px] font-bold uppercase text-muted-foreground"
                >
                  Cook Time
                </label>
                <input
                  type="number"
                  placeholder="mins"
                  disabled={!activeFields.has('cookTime')} // Assuming cookTime is a field
                  value={updates.cookTime || ''}
                  className="bg-card-variant w-full rounded-md border border-border p-2"
                  onChange={(e) => handleUpdateField('cookTime', parseInt(e.target.value) || 0)}
                />
              </Stack>
            </Cluster>
          </Stack>

          {/* Protein */}
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="check-protein"
              checked={activeFields.has('protein')}
              onChange={() => handleFieldToggle('protein')}
              className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="check-protein" className="font-medium text-gray-900">
                Protein
              </label>
              <input
                type="text"
                disabled={!activeFields.has('protein')}
                value={updates.protein || ''}
                onChange={(e) => handleUpdateField('protein', e.target.value)}
                placeholder="e.g. Chicken, Beef, Tofu"
                className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>
        </Stack>
      </Stack>
    </ResponsiveModal>
  )
}
