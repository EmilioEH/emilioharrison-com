# Implementation Plan - Hybrid Calendar Scheduler

Refactoring the recipe scheduling experience to combine day selection with a full calendar view, allowing users to schedule recipes across different weeks and see existing meal plans at a glance.

## User Story

"As a user, I want to see a calendar view when adding a recipe to my plan so I can easily choose a date in any week and see which days already have meals planned."

## Proposed Changes

### 1. Refactor `DayPicker.tsx`

- **Replace** the simple "This Week" list with a full **Month Calendar Grid**.
- **Visual Indication**: Add visual markers (dots/small icons) to days that already have recipes scheduled.
- **Navigation**: Add controls to switch between months (Previous/Next Month).
- **Interactions**:
  - Clicking a day toggles the current recipe for that date.
  - Highlight selected days (where current recipe is planned).
  - Show "Today" marker.

### 2. State Management

- Use `allPlannedRecipes` store to map dates to plan status.
- Local state for `currentMonth` view customization.

### 3. UI/UX Details

- **Header**: Month/Year display with arrows.
- **Grid**: 7-column grid (Mon-Sun).
- **Cells**:
  - Date number.
  - "Has Meal" indicator (e.g., small dot used in `CalendarPicker` or similar).
  - Selected state (Checkmark/Background highlight).

## Validation Strategy

### Quality Gates

- **Lint**: `npm run lint`
- **Types**: `npx tsc --noEmit`
- **Tests**: `npx playwright test tests/week-planning.spec.ts` (Need to verify/update this)

### Test Plan

1. Open Recipe Library.
2. Click "Add to Week" (or similar action) on a recipe.
3. Verify Modal shows Calendar Grid.
4. Verify "dots" appear on days with existing meals.
5. Navigate to next month.
6. Select a day in the future.
7. Verify recipe is added to that day.
