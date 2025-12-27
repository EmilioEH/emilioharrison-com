import React from 'react'
import { RecipeInput } from '../RecipeInput'

export const AiAddView = ({ onClose, onSave }) => {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-md-sys-color-surface">
      <div className="flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-6 py-4">
        <h2 className="font-display text-xl font-bold">New Recipe from AI</h2>
        <button
          onClick={onClose}
          className="rounded-full bg-md-sys-color-surface-variant p-1 px-3 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <RecipeInput
          onRecipeCreated={(recipe) => {
            onSave(recipe)
          }}
        />
      </div>
    </div>
  )
}
