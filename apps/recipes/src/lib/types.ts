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
  mealType?: string
  dishType?: string
  equipment?: string[]
  occasion?: string[]
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

  // Phase 7: Advanced Features
  rating?: number // 1-5
  isFavorite?: boolean
  createdAt?: string // ISO Date
  updatedAt?: string // ISO Date
  // Optional: keep track of simplified history
  versionHistory?: {
    date: string
    changeType: 'create' | 'edit' | 'import'
  }[]
  // Post-cooking feedback

  userNotes?: string
  wouldMakeAgain?: boolean
  lastCooked?: string // ISO date
  finishedImage?: string // Base64 or URL
}

export interface StructuredIngredient {
  original: string
  name: string
  amount: number
  unit: string
  category: string
}

export interface Feedback {
  id: string
  timestamp: string
  type: 'bug' | 'idea'
  description: string
  expected?: string // For bugs
  actual?: string // For bugs
  screenshot?: string // Base64 string
  logs: LogEntry[] // Real console logs
  context: {
    url: string
    userAgent: string
    user: string
    appState: string // Serialized JSON of recipes/selections
    domSnapshot?: string // Full HTML
    windowSize?: { width: number; height: number }
  }
  status?: 'open' | 'fixed' | 'wont-fix'
  resolved_at?: string
}

export interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'log'
  args: unknown[]
  timestamp: string
}
