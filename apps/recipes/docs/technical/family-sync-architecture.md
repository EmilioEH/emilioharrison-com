# Family Sync Architecture

## Overview

The Recipe App supports multi-user collaboration through "Family Workspaces". All user-specific data (notes, ratings, week plans, cooking history) is shared among family members.

## Data Model

### Firestore Schema

```
/families/{familyId}
├── name: string
├── members: string[]  // Array of Google Auth UIDs
├── createdBy: string
├── createdAt: string
│
└── /recipeData/{recipeId}
    ├── id: string
    ├── notes: RecipeNote[]
    ├── ratings: UserRating[]
    ├── weekPlan: WeekPlanData
    └── cookingHistory: CookingHistoryEntry[]
```

### TypeScript Types

See `src/lib/types.ts` for:

- `Family`
- `User`
- `RecipeNote`
- `UserRating`
- `WeekPlanData`
- `FamilyRecipeData`

## API Endpoints

| Endpoint                        | Method | Purpose                             |
| :------------------------------ | :----- | :---------------------------------- |
| `/api/families/current`         | GET    | Get current user's family & members |
| `/api/families/current`         | POST   | Create a new family                 |
| `/api/families/invite`          | POST   | Invite a user by email              |
| `/api/recipes/[id]/family-data` | GET    | Get all shared data for recipe      |
| `/api/recipes/[id]/notes`       | POST   | Add a note                          |
| `/api/recipes/[id]/rating`      | POST   | Add/update a rating                 |
| `/api/recipes/[id]/week-plan`   | POST   | Add to week plan                    |
| `/api/recipes/[id]/week-plan`   | DELETE | Remove from week plan               |
| `/api/week/planned`             | GET    | Get all planned recipes             |

## Frontend Integration

### State Management

- **`familyStore.ts`** (`src/lib/familyStore.ts`): Nanostores for family state
  - `$currentFamily`: Active family object
  - `$familyMembers`: Array of family members
  - `$recipeFamilyData`: Cache of family-scoped recipe data

### Key Components

- **`FamilySetup.tsx`**: Onboarding modal for creating/joining families
- **`OverviewMode.tsx`**: Displays shared notes and ratings
- **`DayPicker.tsx`**: Plans recipes to family-shared week
- **`CookingContainer.tsx`**: Saves review data to family history

### Data Flow

1. **On Login:** `RecipeManager` fetches family data and populates stores
2. **On Recipe View:** `OverviewMode` fetches `/api/recipes/[id]/family-data`
3. **On Action:** Components call API, then update family store optimistically
4. **On Next Login:** Fresh data is fetched, showing other members' changes

## Attribution

All family-scoped data includes:

- `userId`: Who made the change
- `userName`: Display name for UI attribution (e.g., "Added by Emilio")

This enables transparent collaboration where users can see who planned a meal, left a note, or rated a recipe.
