/**
 * One ingredient as the recipe view renders it.
 *
 * `amount` is the rendered measure ("1½ cups") and stays the field the UI prints. `quantity` and
 * `unit` are the machine-readable form of that same measure — they exist so grocery aggregation
 * and weight conversion never have to re-parse text, and they are absent whenever the line has no
 * readable number ("to taste") rather than carrying a guess.
 *
 * `original` is the printed line, kept verbatim. It is the record of what the page actually said,
 * so a parser mistake is always correctable and nothing is lost by normalising. See
 * lib/ingredient-parse.ts and RECIPE-FIDELITY-AND-MEASURES-PLAN.md.
 */
export interface Ingredient {
  name: string
  amount: string
  prep?: string
  /** Numeric quantity; absent when the line has no readable number. */
  quantity?: number
  /** Canonical unit id from `lib/units.ts`; absent when the unit wasn't recognised. */
  unit?: string
  /** Package size, conversion or aside the line carried: the `15-ounce` of `1 (15-ounce) can`. */
  note?: string
  /** The printed line, verbatim. Never rewritten. */
  original?: string
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
  /** The second line a page prints under the title — "GREEK SPINACH AND FETA PIE" over
   * "Spanakopita". Set by the import transcription; rendered in OverviewMode, which skips it when
   * the title already contains it. */
  subtitle?: string
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
  // Structured ingredients for grocery list generation (Hybrid Approach)
  structuredIngredients?: StructuredIngredient[]

  // Phase 7: Advanced Features
  rating?: number // 1-5
  createdAt?: string // ISO Date
  updatedAt?: string // ISO Date
  creationMethod?: 'manual' | 'ai-parse'

  userNotes?: string
  wouldMakeAgain?: boolean
  lastCooked?: string // ISO date
  assignedDate?: string // YYYY-MM-DD
  finishedImage?: string // Base64 or URL
  images?: string[] // Array of all recipe images (first one is primary)
  thumbUrl?: string // Small (~420px) variant of images[0]/primary image, generated at upload time for the library list card — see P5 in PERFORMANCE-PLAN.md. Absent on legacy recipes uploaded before this field existed (no backfill); consumers must fall back to the full-size image fields.

  // Enhancement Status (for dual-process import)
  enhancementStatus?: 'pending' | 'processing' | 'complete' | 'error'
  enhancementError?: string // Optional error message if enhancement fails

  // Snapshot of AI-mutable fields taken immediately before the most recent AI Refresh or
  // background Enhancement overwrote them (see lib/services/recipe-merge.ts) — the source
  // for the one-tap "Restore Previous Version" action (see restore.ts). Set back to `null`
  // once restored, since there's no snapshot left to undo the undo with.
  previousVersion?: {
    savedAt: string
    reason: 'refresh' | 'enhance'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>
  } | null
}

/**
 * Slim projection of `Recipe` returned by `GET /api/recipes` (the library list endpoint) — see
 * PERFORMANCE-PLAN.md P3. Contains only the fields `RecipeCard.tsx`/`RecipeLibrary.tsx` render,
 * `useFilteredRecipes.ts` filters/sorts/searches by. Notably excludes `steps`,
 * `structuredSteps`/`structuredIngredients`, and step-ingredient mappings —
 * those only ship on the full document from `GET /api/recipes/[id]`.
 *
 * Client code treats list records as `Recipe` (the existing app-wide type) for convenience, since
 * every field here is also a valid, optional `Recipe` field — but `steps` being absent is exactly
 * the signal `RecipeDetail.tsx` uses to know it must fetch the full document before rendering
 * (see the "SWR Revalidation" effect there).
 */
export type RecipeListItem = Pick<
  Recipe,
  | 'id'
  | 'title'
  | 'images'
  | 'finishedImage'
  | 'sourceImage'
  | 'thumbUrl'
  | 'prepTime'
  | 'cookTime'
  | 'servings'
  | 'protein'
  | 'cuisine'
  | 'difficulty'
  | 'rating'
  | 'createdAt'
  | 'updatedAt'
  | 'dishType'
  | 'mealType'
  | 'dietary'
  | 'equipment'
  | 'occasion'
  | 'ingredients'
>

interface StructuredIngredient {
  original: string
  name: string
  amount: number
  unit: string
  category: string
  sourceRecipeIds?: string[] // IDs of recipes generating this ingredient
}

export interface GroceryList {
  id: string // Format: "{scopeId}_{weekStartDate}" where scopeId = familyId ?? userId
  userId: string
  familyId?: string // When set, list is shared across all family members
  weekStartDate: string
  ingredients: ShoppableIngredient[]
  status: 'pending' | 'processing' | 'complete' | 'error'
  createdAt: string
  updatedAt: string
  // Sorted, de-duplicated ids of the recipes this list was generated for — the list's "signature".
  // The client compares it against the week's current recipes to decide whether a regeneration is
  // actually needed. Before this existed the only test was "is there a document?", which cannot
  // distinguish an absent list from one that hasn't loaded yet, and never noticed a *removed*
  // recipe at all. Absent on lists written before this field existed; treat that as "unknown
  // signature", which forces exactly one regeneration and then settles.
  sourceRecipeIds?: string[]
  // Written incrementally by the server while generating (see generate-grocery-list.ts) so the
  // client's existing Firestore subscription can show granular progress from any tab/device.
  progress?: number
  message?: string
  // Transient handoff payload for the self-hosted VM worker (BACKGROUND_WORKER_ENABLED path only):
  // the request's recipes, persisted on the `pending` doc so the async worker — which never sees
  // the original request — can generate from them. The worker deletes this field on completion.
  inputRecipes?: Recipe[]
  // The signature the worker should stamp on the finished list, carried the same way and for the
  // same reason as `inputRecipes`. It is the set the *client* asked for, which is what the client
  // compares against — the worker only sees the accessible subset, and stamping that instead
  // would leave the two permanently disagreeing. Deleted on completion.
  inputRecipeIds?: string[]
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
  sources?: RecipeContribution[] // Who needs this and how much (optional for manual items)
  // Manual item fields
  isManual?: boolean // true if user-added (not AI-generated)
  // Soft-state flags
  archivedAt?: string // ISO timestamp when soft-deleted; hidden from default view
  unneededThisWeek?: boolean // hidden from default view for current week only
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
  // The verdict is the real answer. `rating` is still written alongside it for one release so a
  // rollback has something to read — the 1-5 scale it belongs to is gone from every screen, and
  // could never be averaged honestly anyway: the week review's "Good" and the recipe page's
  // fourth star both stored a 4 and meant different things.
  outcome?: 'disliked' | 'ok' | 'loved'
  rating: number // 1-5, derived from `outcome` (see OUTCOME_RATING). Deprecated.
  comment?: string // optional review text
  photoUrl?: string // optional photo URL
  difficulty?: 1 | 2 | 3 // optional difficulty (1=Easy, 2=Medium, 3=Hard)
  // Where the review came from. 'quick' is the legacy tag both surfaces wrote, which is exactly
  // why they could not be told apart afterwards; new writes use 'detail' or 'week-review'.
  source: 'cooking' | 'quick' | 'edit' | 'detail' | 'week-review'
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
  /**
   * How many this recipe is being cooked for *this week*. Absent means the recipe's own
   * `servings`.
   *
   * Stored on the family's plan entry rather than on the recipe, because cooking for six this
   * week must not change the recipe for everyone forever. It also keeps the grocery contract
   * intact: the client still sends only recipe ids, and the server reads the count off the plan
   * itself — a contract that exists because a previous version trusted client-side recipe data
   * and silently produced empty grocery lists.
   */
  servings?: number
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

/**
 * Bulk photo import (see BULK-PHOTO-IMPORT-PLAN.md). Two collections, deliberately outside
 * `recipes`: a photographed page becomes a recipe only once the user has reviewed and accepted
 * it, which is what keeps unreviewed transcription out of the library.
 */
export type ImportBatchStatus = 'pending' | 'processing' | 'complete' | 'partial' | 'failed'
export type ImportJobStatus = 'pending' | 'processing' | 'complete' | 'error'
export type ImportReviewState = 'unreviewed' | 'accepted' | 'discarded'

export interface ImportBatch {
  id: string
  createdBy: string
  createdAt: string
  updatedAt?: string
  status: ImportBatchStatus
  /** How many jobs (i.e. recipes) the batch holds — not how many photos. */
  total: number
  completed: number
  failed: number
  reviewedCount: number
}

export interface ImportJob {
  id: string
  batchId: string
  createdBy: string
  createdAt: string
  updatedAt?: string
  /** Storage keys from `POST /api/uploads`; more than one only for a grouped multi-page spread,
   * in page order. */
  photoKeys: string[]
  status: ImportJobStatus
  /** The parse result, held here until accepted. Not a `Recipe` — no id/createdBy/timestamps. */
  parsedRecipe: Partial<Recipe> | null
  /** The page's instructions didn't transcribe, but its ingredients did. */
  partialFailure?: 'instructions'
  error?: string
  reviewState: ImportReviewState
  /** Set when the user accepts the card and the recipe is created. */
  savedRecipeId?: string
}
