export interface Recipe {
  id: string
  title: string
  description: string | null
  instructions: string | null
  category: string | null
  image_url: string | null
  created_at: number
  updated_at: number
}

export type NewRecipe = Omit<Recipe, 'created_at' | 'updated_at'>
