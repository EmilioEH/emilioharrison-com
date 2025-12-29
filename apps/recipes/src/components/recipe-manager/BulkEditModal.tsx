import React, { useState } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import type { Recipe } from '../../lib/types'

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

  const handleChange = (field: keyof Recipe, value: string | number | boolean | string[]) => {
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
      alert('Failed to save bulk edits')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Edit Recipes</h2>
            <p className="text-sm text-gray-500">Editing {selectedCount} recipes</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-700">
            <div className="flex gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>
                Select the fields you want to update. Only checked fields will be applied to all
                selected recipes. Existing values for unchecked fields will remain unchanged.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Meal Type */}
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="check-mealType"
                checked={activeFields.has('mealType')}
                onChange={() => handleFieldToggle('mealType')}
                className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="check-mealType" className="font-medium text-gray-900">
                  Meal Type
                </label>
                <select
                  disabled={!activeFields.has('mealType')}
                  value={updates.mealType || ''}
                  onChange={(e) => handleChange('mealType', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Select Meal Type...</option>
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                  onChange={(e) => handleChange('dishType', e.target.value)}
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

            {/* Cuisine */}
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="check-cuisine"
                checked={activeFields.has('cuisine')}
                onChange={() => handleFieldToggle('cuisine')}
                className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="check-cuisine" className="font-medium text-gray-900">
                  Cuisine
                </label>
                <select
                  disabled={!activeFields.has('cuisine')}
                  value={updates.cuisine || ''}
                  onChange={(e) => handleChange('cuisine', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Select Cuisine...</option>
                  {CUISINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex items-start gap-4">
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
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={!activeFields.has('difficulty')}
                      onClick={() => handleChange('difficulty', d)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        updates.difficulty === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                  onChange={(e) => handleChange('protein', e.target.value)}
                  placeholder="e.g. Chicken, Beef, Tofu"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
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
      </div>
    </div>
  )
}
