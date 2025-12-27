export interface RecipeRow {
  id: string
  title: string
  protein: string | null
  difficulty: string | null
  cuisine: string | null
  is_favorite: number // 0 | 1
  this_week: number // 0 | 1
  created_at: number
  updated_at: number
  data: string // JSON string
}
