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
  // New metadata for organization
  protein?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  cuisine?: string
  dietary?: string[]
  thisWeek?: boolean // Added for "This Week" folder logic
  sourceUrl?: string
  sourceImage?: string // Base64 or URL
  tags?: string[]
  metadata?: {
    dishesUsed?: number
    dietary?: string[]
  }
  // Structured ingredients for grocery list generation (Hybrid Approach)
  structuredIngredients?: StructuredIngredient[]
}

export interface StructuredIngredient {
  original: string
  name: string
  amount: number
  unit: string
  category: string
}
