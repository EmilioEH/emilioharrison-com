export interface Ingredient {
  name: string
  amount: string
  prep?: string
}

/** Logical grouping of ingredients by cooking phase (e.g., "FOR THE CURRY PASTE") */
export interface IngredientGroup {
  header: string // "FOR THE CURRY PASTE"
  startIndex: number // First ingredient index (0-based)
  endIndex: number // Last ingredient index (inclusive)
}

/** Enhanced step with title and optional tip for redesigned instruction cards */
export interface StructuredStep {
  title?: string // "Blend the Base" (2-4 words)
  text: string // Full instruction text
  highlightedText?: string // "Blend the **Base**" (markdown bolding of verbs)
  tip?: string // Optional pro-tip or warning
  substeps?: Array<{
    text: string // "Dice the onions"
    action: string // "Dice" (verb)
    targets: string[] // ["onions"] (ingredients/objects)
  }>
}

export interface Recipe {
  id: string
  // Enhanced Visibility
  createdBy?: string // userId (optional for legacy recipes)
  familyId?: string // familyId (optional, assists with indexing)
  title: string
  servings: number
  prepTime: number
  cookTime: number
  ingredients: Ingredient[]
  steps: string[]
  stepIngredients?: Array<{ indices: number[] }> // Firestore-compatible: indices of ingredients used in each step
  // Enhanced recipe structure (lazy-migrated via AI)
  ingredientGroups?: IngredientGroup[] // AI-generated ingredient groupings by cooking phase
  structuredSteps?: StructuredStep[] // AI-generated step titles and tips
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
  creationMethod?: 'manual' | 'ai-parse' | 'ai-infer'
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
  images?: string[] // Array of all recipe images (first one is primary)

  // Version History (Full Snapshots)
  versions?: RecipeVersion[]
}

export interface RecipeVersion {
  timestamp: string // ISO Date
  userId?: string
  userName?: string
  changeType: 'edit' | 'restore' | 'import'
  // Break recursion: A snapshot doesn't need to contain nested history
  data: Omit<Partial<Recipe>, 'versions'>
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
  args: string[]
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
  status?: 'pending' | 'approved' | 'rejected'
  notificationPreferences?: {
    email?: boolean
    push?: boolean
    types?: {
      timers?: boolean
      mealPlan?: boolean
      cooking?: boolean
      invites?: boolean
    }
    reminders?: ReminderSettings
  }
}

export interface ReminderSettings {
  weeklyPlan: {
    enabled: boolean
    day: string // 'Sunday', 'Monday', etc.
    time: string // '18:00' (24hr)
  }
  groceryList: {
    enabled: boolean
    day: string // 'Sunday', 'Monday', etc.
    time: string // '10:00' (24hr)
  }
  dailyCooking: {
    enabled: boolean
    offsetHours: number // e.g. 2 hours before
  }
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

/** Invitation for a user to join a family */
export interface PendingInvite {
  id: string
  email: string
  familyId: string
  familyName: string
  invitedBy: string // userId of inviter
  invitedByName: string // displayName of inviter
  status: 'pending'
  createdAt: string
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
  // Enhanced Review Data
  ingredientNotes?: Record<number, string> // index -> note
  stepNotes?: Record<number, string> // index -> note
  difficultyRatings?: Record<string, number> // userId -> difficulty (1=Easy, 2=Medium, 3=Hard)
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
