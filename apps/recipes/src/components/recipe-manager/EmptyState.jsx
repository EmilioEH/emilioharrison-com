import React from 'react'
import { ChefHat } from 'lucide-react'

export const EmptyState = () => (
  <div className="py-20 text-center opacity-50">
    <ChefHat className="mx-auto mb-4 h-16 w-16 text-gray-300" />
    <p className="font-display text-xl">No Recipes Yet</p>
    <p className="font-body">Add your first tasty dish!</p>
  </div>
)
