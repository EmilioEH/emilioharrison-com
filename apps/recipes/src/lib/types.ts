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

/** Logical grouping of steps by cooking phase (e.g., "PREPARE THE SAUCE") */
interface StepGroup {
  header: string // "PREPARE THE SAUCE"
  startIndex: number // First step index (0-based)
  endIndex: number // Last step index (inclusive)
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
  stepGroups?: StepGroup[] // AI-generated step groupings by cooking phase
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

  // Enhancement Status (for dual-process import)
  enhancementStatus?: 'pending' | 'processing' | 'complete' | 'error'
  enhancementError?: string // Optional error message if enhancement fails

  // Version History (Full Snapshots)
  versions?: RecipeVersion[]
}

export interface RecipeVersion {
  id: string
  recipeId: string
  timestamp: string // ISO Date
  changeType: 'manual-edit' | 'ai-refresh' | 'import' | 'restore'
  createdBy?: string // userId (optional for legacy)
  data: Partial<Recipe> // Snapshot of core fields
}

interface StructuredIngredient {
  original: string
  name: string
  amount: number
  unit: string
  category: string
  sourceRecipeIds?: string[] // IDs of recipes generating this ingredient
}

export interface GroceryList {
  id: string // Format: "{userId}_{weekStartDate}"
  userId: string
  weekStartDate: string
  ingredients: ShoppableIngredient[]
  status: 'pending' | 'processing' | 'complete' | 'error'
  createdAt: string
  updatedAt: string
}

/** A single recipe's contribution to a grocery item */
interface RecipeContribution {
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

/** A review with rating, optional comment, and optional photo */
export interface Review {
  id: string // unique review ID (generated)
  recipeId: string
  userId: string
  userName: string
  rating: number // 1-5 (required)
  comment?: string // optional review text
  photoUrl?: string // optional photo URL
  difficulty?: 1 | 2 | 3 // optional difficulty (1=Easy, 2=Medium, 3=Hard)
  source: 'cooking' | 'quick' | 'edit' // where the review came from
  createdAt: string // ISO timestamp
  updatedAt?: string // ISO timestamp (set when edited)
  editHistory?: Array<{
    rating: number
    comment?: string
    photoUrl?: string
    difficulty?: 1 | 2 | 3
    editedAt: string // ISO timestamp
  }>
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
interface CookingHistoryEntry {
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
  mealTime?: string // HH:mm format (e.g., "18:00" for 6pm)
  mealType?: 'breakfast' | 'lunch' | 'dinner' // Optional meal type classification
  addedBy?: string // userId
  addedByName?: string // userName
  addedAt?: string // ISO date
}

/** Family-specific recipe data (notes, ratings, planning, history) */
export interface FamilyRecipeData {
  id: string // matches recipe ID
  notes: RecipeNote[]
  ratings: UserRating[] // DEPRECATED: Use reviews instead (kept for backward compatibility)
  reviews?: Review[] // NEW: Unified reviews with ratings, comments, and photos
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
