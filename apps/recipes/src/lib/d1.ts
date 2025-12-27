export interface RecipeRow {
  id: string
  title: string
  protein: string | null
  difficulty: string | null
  cuisine: string | null
  meal_type: string | null
  dish_type: string | null
  equipment: string | null // JSON string array
  occasion: string | null // JSON string array
  dietary: string | null // JSON string array
  is_favorite: number // 0 | 1
  this_week: number // 0 | 1
  created_at: number
  updated_at: number
  data: string // JSON string
}
