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
  stepIngredients?: Array<{ indices: number[] }> // Firestore-compatible: indices of ingredients used in each step
  notes?: string
  description?: string
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
  estimatedCost?: number // Persisted HEB cost
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
  assignedDate?: string // YYYY-MM-DD
  finishedImage?: string // Base64 or URL
}

export interface StructuredIngredient {
  original: string
  name: string
  amount: number
  unit: string
  category: string
  sourceRecipeIds?: string[] // IDs of recipes generating this ingredient
}

/** A single recipe's contribution to a grocery item */
export interface RecipeContribution {
  recipeId: string
  recipeTitle: string
  originalAmount: string // "1 clove", "4 garlics" - as written in recipe
}

/** Enhanced grocery item with purchasable unit + source breakdown */
export interface ShoppableIngredient {
  name: string // "garlic"
  purchaseAmount: number // 1
  purchaseUnit: string // "head"
  category: string // "Produce"
  sources: RecipeContribution[] // Who needs this and how much
}

export interface Feedback {
  id: string
  timestamp: string
  type: 'bug' | 'idea'
  description: string
  expected?: string // For bugs
  actual?: string // For bugs
  screenshot?: string // Base64 string
  logs: string // JSON string of log entries (Firestore-safe)
  context: string // JSON string of context object (Firestore-safe)
  status?: 'open' | 'fixed' | 'wont-fix'
  resolved_at?: string
}

export interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'log'
  args: unknown[]
  timestamp: string
}

// Firestore-safe log entry with flattened args (no nested arrays)
export interface SafeLogEntry {
  type: string
  args: string // Flattened from array
  timestamp: string
}

// --- Multi-User Family Sync Types ---

/** Family/Household group for sharing recipe data */
export interface Family {
  id: string // auto-generated
  name: string // "Harrison Family"
  members: string[] // Array of Google Auth UIDs
  createdBy: string // userId who created the group
  createdAt: string // ISO date
  lastUpdated?: string // ISO date - updated when week plans change (for sync optimization)
}

/** User profile with family membership */
export interface User {
  id: string // Google Auth UID
  email: string
  displayName: string
  photoURL?: string
  role?: 'creator' | 'admin' | 'user'
  familyId?: string // Reference to family group
  joinedAt: string
}

/** A note added by a family member on a recipe */
export interface RecipeNote {
  userId: string
  userName: string // Display name from Google Auth
  text: string
  createdAt: string
}

/** A rating given by a family member */
export interface UserRating {
  userId: string
  userName: string
  rating: number // 1-5
  ratedAt: string
}

/** Cooking history entry for a family member */
export interface CookingHistoryEntry {
  userId: string
  userName: string
  cookedAt: string // ISO date
  wouldMakeAgain?: boolean
  finishedImage?: string // Base64 or URL
}

/** Week planning data (shared across family) */
export interface WeekPlanData {
  isPlanned: boolean
  assignedDate?: string // YYYY-MM-DD
  addedBy?: string // userId
  addedByName?: string // userName
  addedAt?: string // ISO date
}

/** Family-specific recipe data (notes, ratings, planning, history) */
export interface FamilyRecipeData {
  id: string // matches recipe ID
  notes: RecipeNote[]
  ratings: UserRating[]
  weekPlan?: WeekPlanData
  cookingHistory: CookingHistoryEntry[]
}

export interface ServiceAccount {
  type?: string
  project_id: string
  private_key_id?: string
  private_key: string
  client_email: string
  client_id?: string
  auth_uri?: string
  token_uri: string
  auth_provider_x509_cert_url?: string
  client_x509_cert_url?: string
  universe_domain?: string
}
