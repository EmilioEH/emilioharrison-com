# Chefboard Feature-Strip Plan

## Context

Reduce `apps/recipes` (Chefboard) to five core features: **browse recipes, view a recipe, add a new recipe, add a recipe to a week, generate a grocery list for that week**. Everything else is removed to cut maintenance surface, bundle size, and test burden.

Scope decisions confirmed with Emilio:

| Question | Decision |
|---|---|
| Add-recipe methods | Manual form + **URL import + photo scan**. Remove experimental dish-photo mode and bulk importer. |
| Background AI enhancement | **Keep** (post-save Gemini re-parse + Original/Smart View toggle). Remove manual "Refresh AI Data". |
| Grocery generation | **Keep both** Standard (programmatic) and Smart (AI) lists + toggle. Remove all H-E-B pricing/product-picker, cost estimation, recurring items. Keep check-off, manual add/edit items, share/copy list as text. |
| Family sharing | **Keep fully** (shared recipes/weeks/grocery, Manage Family, Invite, FamilySetup). Week-plan data stays family-scoped — no migration needed. |
| Admin | **Minimal**: keep users (incl. access approval), access codes, invites tabs. Remove impersonation, family admin, feedback dashboard. |
| Onboarding | **Remove** (tutorial/demo/install-instructions/desktop-blocker gate). FamilySetup prompt stays. |

Auth (cookie middleware, login/logout/firebase-token, request-access/redeem-code) stays untouched except where noted.

## What gets REMOVED

Cooking mode · favorites · ratings/reviews/notes · version history · recipe share/PDF · feedback system · push notifications & reminders · onboarding · bulk import/edit/select + export/import JSON/delete-all · Settings & Week Planner Settings views · H-E-B integration · cost estimation · recurring grocery items · dish-photo import · admin impersonation/family-admin · assorted dead code.

## Verified facts (from code reading)

- `lib/week-rollover.ts` is a disabled stub; `api/week/archive.ts` has zero callers — both dead.
- `settings/WeekPlannerSettings.tsx` + `lib/userPreferences.ts` config is read by nothing in weekStore/WeekPlanView — safe to delete, no defaults to inline.
- `api/user/preferences.ts` only consumer: NotificationSettingsView. `api/user/profile.ts` only consumer: SettingsView (display-name editor — accepted loss).
- `tests/advanced-features.spec.ts` contains only favorites + rating tests — delete whole file.
- Removing `hebPrice` fields is safe: GroceryList reads them optionally; old Firestore docs just carry ignored keys. But strip the write paths (`GroceryItemEditSheet`, `api/grocery/items.ts` PATCH whitelist) in the same phase.
- `VarietyWarning` is dead (its state is never set non-null).
- AdminDashboard is one component with 4 tabs (`users`/`families`/`codes`/`invites`); impersonate is a per-row button. `AccessRequestsDashboard.tsx` is never mounted (dead) — pending signups are `status: 'pending'` rows in the Users tab.
- Frontend grocery generator is top-level `api/generate-grocery-list.ts`; `api/grocery/generate.ts` is an unused parallel implementation (dead).
- `library/LibraryRecipeCard.tsx`, `api/user-data.ts`, `api/recipes_kv.ts` are dead.

## Implementation phases

Rule: within each phase, delete files AND remove their imports/usages together, so `npm run check:ts && npm run test:unit` passes after every phase. `RecipeManager.tsx`, `RecipeManagerView.tsx`, `useRouter.ts`, `GlobalBurgerMenu.tsx`, and `lib/types.ts` are touched repeatedly — keep per-phase edits small.

### Phase 1 — Dead code
Delete: `VarietyWarning.tsx`, `library/LibraryRecipeCard.tsx`, `api/user-data.ts`, `api/recipes_kv.ts`, `api/week/archive.ts`, `lib/week-rollover.ts`, `api/grocery/generate.ts`, `admin/AccessRequestsDashboard.tsx`.
Edit `RecipeManager.tsx`: remove VarietyWarning import/state/render (:5, :311, :556) and `checkAndRunRollover` import/effect (:27, :396–399).

### Phase 2 — Feedback
Delete: `layout/GlobalFeedback.jsx`, `layout/FeedbackFooter.tsx`, `dialogs/FeedbackModal.tsx`, `views/FeedbackDashboard.tsx`, `lib/feedbackStore.ts`, `api/feedback.ts` + `api/feedback/`, `scripts/{sync,resolve}-feedback.ts`, tests `feedback*.spec.ts`, `.agent/workflows/check-feedback.md`, `.github/prompts/check-feedback.prompt.md`.
Edits: `RecipeLayout.astro` (unmount GlobalFeedback :11, :121); `GlobalBurgerMenu.tsx` (Send Feedback :234–242, admin Feedback Dashboard :161–168); `RecipeManager.tsx` (`navigate-to-feedback-dashboard` listener); `RecipeManagerView.tsx` (lazy import + branch :210–225); `lib/routes.ts` (drop `/api/feedback` from `PUBLIC_API_ROUTES` — do NOT touch auth/uploads entries); `useRouter.ts` (drop `'feedback-dashboard'`); `package.json` (scripts `sync:feedback`/`feedback:resolve`, deps `html2canvas` + types).

### Phase 3 — Push notifications, reminders, and SettingsView
Delete: `PushNotificationManager.tsx`, `views/NotificationSettingsView.tsx`, `api/push/`, `lib/push-notifications.ts`, `lib/remindersStore.ts`, `api/reminders.ts`, `api/user/preferences.ts`, `api/cooking/notify-start.ts`, `notification-settings.spec.ts`. **Also delete `views/SettingsView.tsx` + `api/user/profile.ts` here** (SettingsView imports PushNotificationManager — deleting both avoids a broken interim state; its export/import/delete-all/profile handlers are removed in Phase 8 edits).
Edits: `public/sw.js` (remove `push` :119–141, `notificationclick` :143–158, `SHOW_NOTIFICATION` branch; keep caching + `CLEAR_SHELL_CACHE`); `api/recipes/[id]/week-plan.ts` (remove `sendFamilyPush` import + notification block ~:140–166); `scripts/env-check.ts` (drop VAPID keys); burger menu Notifications item + listener + `RecipeManagerView` branch + `useRouter` `'notifications'`; `package.json` (`web-push` + types).

### Phase 4 — Onboarding
Delete: `components/onboarding/` (all), `api/user/onboarding.ts`, `onboarding.spec.ts`.
Edits: `RecipeManager.tsx` (OnboardingFlow lazy import :59–61, `hasOnboarded` props, gate :516–530); `hooks/useIdentityResolution.ts` (strip onboarding/`force_onboarding`/`skip_onboarding` logic, keep displayName/isAdmin; update its test); `src/pages/[...path].astro` (`hasOnboarded` :18–47); `api/bootstrap.ts` (drop `hasOnboarded`; update `bootstrap.test.ts`); burger menu "Onboarding (Demo)".

### Phase 5 — Cooking mode
Delete: `components/cooking-mode/` (15 files), `stores/cookingSession.ts`, `stores/overviewCooking.ts`, `src/services/timerManager.ts`, `api/cooking/` (now empty), `recipe-details/{CookingHistoryCard,CookingHistorySummary,ReviewMode}.tsx`, specs `cooking-mode*.spec.ts`, `prep-mode-scroll.spec.ts`, `.agent/workflows/audit-cooking-layout.md`.
Edits: `RecipeManager.tsx` (CookingStatusIndicator + `$cookingSession` :46–47, mini-player :735–745); `RecipeDetail.tsx` (cooking imports, `useWakeLock`, `startCooking` + footer button, CookingContainer render, cooking props; update `RecipeDetail.test.tsx`); `OverviewMode.tsx` (CookingHistorySummary, overviewCooking usage, cook buttons — **keep Original/Smart toggle :492–500**); `WeekPlanView.tsx` (swipe-right-to-cook + `handleStartCooking` :351–381 — keep swipe move/delete); `recipe-details/types.ts` (prune cooking actions).

### Phase 6 — Favorites, ratings/reviews/notes, versions, recipe share/PDF, AI refresh
Delete APIs: `api/favorites.ts`; `api/recipes/[id]/{notes,rating,reviews,family-data,versions,restore,refresh}.ts` + `reviews/` dir.
Delete UI/lib: `recipe-details/{VersionHistoryModal,HistoryModal}.tsx`, `hooks/useRecipeVersions.ts`, `dialogs/ShareRecipeDialog.tsx`, `lib/share-recipe.ts`, `components/recipe-pdf/`.
Delete tests: `tests/unit/versions.test.ts`, `recipe-share.spec.ts`, `review-management.spec.ts`, `advanced-features.spec.ts`.
Edits (per plan-agent line refs): `DetailHeader.tsx` heart :46–51; `DetailHeaderActions.tsx` share/refresh/history items, action union → `'delete'|'edit'|'addToWeek'|'move'`; `RecipeDetail.tsx` favorite/share/refresh/history plumbing + VersionHistoryModal; `EditRecipeView.tsx` HistoryModal + snapshot triggers; `OverviewMode.tsx` `loadFamilyData`/avg-rating/review photos :140–161 + refresh banner :595; `RecipeManager.tsx` `toggleFavorite`, `handleShareRecipe` :324–346 + dialog render, `onShare` props, `onlyFavorites` in filter count; `RecipeManagerView.tsx` favorite prop; `RecipeCard.tsx` rating badge :122–127; `RecipeLibrary.tsx`/`RecipeManagementSheet.tsx`/`WeekWorkspace.tsx` `onShare`; `useRecipeActions.ts` `toggleFavorite` (+test); `useFilteredRecipes.ts` `onlyFavorites`; `RecipeFilters.tsx` favorites toggle; `api/recipes/index.ts` + `api/recipes/[id].ts` + `api/bootstrap.ts` favorites/isFavorite (+tests); `useRecipeHandlers.ts` version snapshot; `lib/types.ts` `isFavorite`/`rating`/review/note/version types; `package.json` `@react-pdf/renderer`.

### Phase 7 — H-E-B, cost estimation, recurring items
Delete: `api/grocery/{heb-batch-search,heb-lookup,heb-refresh,heb-search,heb-verify-store,overrides,recurring,recurring-inject}.ts`, `api/estimate-cost.ts`, grocery `{ProductPicker,ProductSelectionSheet,RecurringListSheet,RecurringItemToggle,FrequencyPicker}.tsx`, `src/hooks/{useHebPriceRefresh,useHebSearchUrl}.ts`, `lib/{heb-products,heb-url,heb-manor-aisles,grocery-suggestions}.ts` (+heb tests), `settings/HebStoreSettings.tsx`, `lib/userPreferences.ts` (with Phase-8 WeekPlannerSettings if ordering demands), scripts `add-heb-recurring-items.ts`, `scrape-heb-*`.
Edits: `GroceryList.tsx` (heb spreads/price badge/ProductPicker/recurring usage); `GroceryListSelectionBar.tsx` (`'recurring'` action); `AddItemInput.tsx` (**real refactor**: move `HEB_CATEGORY_ORDER`'s list into `grocery-utils.ts` as `CATEGORY_ORDER`, strip product-search/price UI to plain name/amount/category); `GroceryItemEditSheet.tsx` (drop `ProductOverride`/heb save path, keep name/amount/category); `lib/grocery-utils.ts` (`calculateGroceryCost`, recurring helpers :126–273; update all 4 grocery test files); `api/grocery/items.ts` (PATCH whitelist: drop heb/recurring, keep `archivedAt`/`unneededThisWeek`); `lib/services/grocery-service.ts` + `api/generate-grocery-list.ts` (prune price fields); `lib/types.ts` (heb/recurring/`estimatedCost` types); `OverviewMode.tsx` cost card + auto-estimate :179–199 + `onSaveCost`; `RecipeDetail.tsx` `onSaveCost`; `useFilteredRecipes.ts` cost sorts :156–167 + `RecipeFilters`/`RecipeControlBar` cost options; `aiOperationStore.ts` drop `'cost-estimate'`; `ui/AiLoadingState.tsx` cost copy.

### Phase 8 — Dish-photo, bulk/data-management, remaining settings
Edits (dish-photo): `lib/hooks/useAiImporter.ts`, `importer/AiImporter.tsx`, `importer/SourceToggle.tsx` — remove `dish-photo` mode, keep `url` + `photo`.
Delete: `importer/BulkRecipeImporter.tsx`, `api/recipes/bulk.ts`, `dialogs/BulkEditModal.tsx`, `hooks/useRecipeSelection.ts`, `settings/WeekPlannerSettings.tsx`, `data-management.spec.ts`.
Edits: `RecipeManager.tsx` (selection mode, BulkEditModal, `handleBulkImportSave`/`handleImport`/`handleDeleteAll`/`handleExport`, `toggle-selection-mode` + `navigate-to-settings`/`bulk-import`/`week-planner-settings` listeners, WeekPlannerSettings modal, related props); `useRecipeHandlers.ts` (`handleBulkEdit`/`handleExport`/`handleUpdateProfile`/`handleBulkDelete`); `useRecipeActions.ts` (`bulkUpdateRecipes`/`bulkDeleteRecipes` +test); `RecipeManagerView.tsx` (settings/bulk-import branches + lazy imports); `RecipeLibrary.tsx` (selection props); `GlobalBurgerMenu.tsx` (Import Recipes, Settings, Week Planner Settings, Select Recipes → menu becomes: Manage Family, Invite, Admin Dashboard, Log Out).

### Phase 9 — Admin trim
Delete: `admin/AdminFamilyManager.tsx`, `api/admin/{impersonate,revert,families,migrate-ownership,backfill-legacy-created-by}.ts` (+test), `lib/services/backfill-legacy-created-by.ts` (+test), `scripts/backfill-legacy-created-by.ts`, specs `admin-impersonation.spec.ts`, `admin-families.spec.ts`.
Edits: `AdminDashboard.tsx` — tabs → `'users'|'codes'|'invites'`, drop families tab/state/fetch, `handleImpersonate` + button; `lib/recipeStore.ts` comments; `recipeStore.test.ts` — keep the cache-isolation test, rename away from "impersonation"; update `admin-dashboard.spec.ts` for 3 tabs. Optionally prune `stats.recipesCooked` in users API/dashboard.

### Phase 10 — Router/nav/infra sweep
`useRouter.ts` final `ViewMode`: `'library'|'detail'|'edit'|'week'|'family-settings'|'admin-dashboard'|'invite'` (also drops the never-dispatched `'grocery'`). `RecipeManager.tsx` navigate-event effect keeps only family-settings/admin-dashboard/invite. Final `api/bootstrap.ts` trim (keep family union + `addedByName`). Confirm `sw.js` is caching-only. Update `lazy-view-modes.spec.ts`, `menu-visibility.spec.ts`, `menu-ux.spec.ts`, `back-button.spec.ts`.

### Phase 11 — Tests, docs, deps, hygiene
- E2E updates (beyond deletions above): `grocery-list`/`smart-grocery` (no prices/recurring), `recipe-details`/`recipe-overview-layout` (no cook/favorite/share/rating/cost), `week-management`/`meal-planner` (no swipe-to-cook), `search`/`recipe-organization` (no favorites/cost sort), grep all specs + `tests/msw-setup.ts` for `favorites|rating|cooking|heb|push|feedback|onboarding`.
- Keep: auth, family-*, invite-menu, share-invite, dual-process (enhancement kept), step-enhancements/ingredient-* (verify they don't depend on cooking mode UI), recipe-input/photo-import/image-selection, persistence, week-view-sync, shared-sync, service-worker-caching, boot-performance.
- Docs: rewrite `apps/recipes/README.md` (architectural source of truth), update root `CLAUDE.md`, `.agent/knowledge/recipe-schema.md` (drop rating/isFavorite/versionHistory/estimatedCost/heb), scan `.agent/workflows/`, `.github/copilot-instructions.md`, `.github/prompts/`, `.github/agents/` for removed-feature references.
- Deps final: removed `web-push`, `@react-pdf/renderer`, `html2canvas` (+type pkgs); keep `heic-convert`/`heic2any`/`sharp`, `fuse.js`, `date-fns`; confirm with depcheck.
- Check `stryker.config.json` and any size-limit config for references to deleted files/changed budgets.
- Last: `npm run check:hygiene` (knip/depcheck/jscpd) and fix all flags — only meaningful after all phases.

## Verification

Per phase: `npm run check:ts && npm run test:unit` (from `apps/recipes`).
Final gates: `npm run check:safety` → `npm run build` → `npm run test:e2e:fast` → `npm run check:hygiene`.
Manual smoke via `npm run preview:wrangler` (127.0.0.1:8788): login → browse/search/filter → open detail (images, metadata, ingredients, Original/Smart toggle) → add recipe (manual, URL, photo; confirm background `enhance` call fires) → add to week via DayPicker (+ move/delete swipes, CalendarPicker) → grocery tab (Standard/Smart toggle, check-off, manual add/edit, share/copy) → family setup/invite → admin 3-tab → logout.

## Risks

- `RecipeManager.tsx` edited in nearly every phase — run checks per phase, keep commits per phase.
- `lib/types.ts` removals ripple into the slim-list contract (`RecipeListItem`) and API tests — do type edits last within each phase.
- `AddItemInput`/`GroceryItemEditSheet` are refactors, not deletions (HEB category constant + product search are load-bearing).
- Old Firestore docs retain removed fields (rating, heb prices, versionHistory) — harmless, but verify `type-guards.ts` doesn't reject unknown keys.
- `PUBLIC_API_ROUTES`: only remove the feedback entry; auth/uploads entries are load-bearing for login.
- iOS/WebKit rules (`.agent/rules/04-ios-webkit.md`) apply to any touched touch/swipe UI (WeekPlanView swipe edits).

## Deliverable

Branch `claude/cooking-app-scope-plan-mci3da`, one commit per phase, pushed with `git push -u origin`. No PR unless requested.
