export interface Ingredient {
  name: string
  amount: string
  prep?: string
}

export interface Recipe {
  id: string
  title: string
  servings: number
  prepTime: number
  cookTime: number
  ingredients: Ingredient[]
  steps: string[]
  notes?: string
  sourceUrl?: string
  sourceImage?: string // Base64 or URL
  tags?: string[]
  metadata?: {
    protein?: string
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    cuisine?: string
    dishesUsed?: number
    dietary?: string[]
  }
}
