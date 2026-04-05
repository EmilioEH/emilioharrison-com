# MyRecipeBook — Code Audit
**Date:** 2026-03-28
**Scope:** `src/` — API routes, hooks, stores, lib utilities
**Stack:** Astro + React + Firebase + Cloudflare Pages

---

## 🐛 Bugs

### 1. Off-by-one in `goToStep` — `cookingSession.ts:72`
```ts
const safeIdx = Math.max(0, Math.min(stepIdx, session.recipe.steps.length))
```
`steps.length` is out of bounds for a 0-indexed array. Should be `steps.length - 1`. A user on the last step can navigate to a non-existent step, causing downstream reads of `steps[undefined]` to silently return `undefined`.

---

### 2. Version history `changeType` type mismatch — `api/recipes/[id].ts:59`
```ts
const versionSnapshot = {
  changeType: 'edit',  // ❌ not a valid RecipeVersion changeType
  ...
}
```
`RecipeVersion.changeType` is typed as `'manual-edit' | 'ai-refresh' | 'import' | 'restore'`. The value `'edit'` doesn't match, so TypeScript should be catching this but apparently isn't (likely due to the `as unknown[]` cast on line 65). Stored versions will have an invalid `changeType` in Firestore, breaking any code that switches on it.

---

### 3. Error state doesn't set `initialized` — `recipeStore.ts:18-21`
```ts
setError: (error: string) => {
  $recipesError.set(error)
  $recipesLoading.set(false)
  // $recipesInitialized is never set to true ❌
},
```
When a fetch fails, `$recipesInitialized` stays `false`. Any component using `useRecipes` will see `!initialized` as `true` and re-trigger `refreshRecipes` on mount — creating a continuous retry loop on network errors with no backoff or circuit-breaking.

---

### 4. `recent` sort is broken for UUID-based IDs — `useFilteredRecipes.ts:117`
```ts
recent: (a, b) => parseInt(b.id) - parseInt(a.id),
```
Recipe IDs are UUIDs (`crypto.randomUUID()`). `parseInt('123e4567-e89b-...')` only parses the leading numeric characters, producing `123` for almost every recipe. The sort will produce arbitrary, effectively random ordering rather than recency.

---

### 5. DELETE and GET recipe endpoints have no authentication — `api/recipes/[id].ts`
The `GET` handler has zero auth check — any unauthenticated user can fetch any recipe by ID. The `DELETE` handler also has no auth check, meaning anyone who knows a recipe's ID can delete it. By contrast, `PUT` does extract a user cookie (but doesn't reject missing users). These should all gate on `getAuthUser` returning a non-null value.

---

### 6. Unsafe null casting of Firebase client — `firebase-client.ts:17-18`
```ts
export const auth = app ? getAuth(app) : (null as unknown as Auth)
export const db = app ? getFirestore(app) : (null as unknown as Firestore)
```
When Firebase config is missing/invalid, `auth` and `db` are typed as non-null but are actually `null`. Any code that uses them without a null guard (e.g., `auth.currentUser`) will throw a runtime `TypeError`. The cast hides the problem from TypeScript instead of propagating the nullability.

---

### 7. `AudioContext` resource leak in `timerManager.ts`
```ts
const ctx = new AudioCtor()
// ... plays beep ...
// ctx is never closed ❌
```
Every time a timer finishes, a new `AudioContext` is created and never closed. Browsers enforce a limit (usually 6) on simultaneous `AudioContext` instances. After 6 timer completions, the alarm sound will silently stop working. Fix: `osc.addEventListener('ended', () => ctx.close())`.

---

### 8. `useFirebaseAuthSync` race condition — `useFirebaseAuthSync.ts`
The `onAuthStateChanged` listener is set up before `syncAuth()` is called, but `attemptedRef.current` is set inside `syncAuth()` — after the async operation starts. If the component unmounts and remounts quickly (e.g., HMR or Strict Mode double-invoke), `attemptedRef.current` may not be `true` yet and a second sync attempt will fire concurrently.

---

## ⚡ Performance Issues

### 9. No pagination on recipe collection fetch — `api/recipes/index.ts:29`
```ts
const rawRecipes = await db.getCollection('recipes', 'updatedAt', 'DESC')
```
Every GET request fetches **all recipes** from Firestore with no limit. As the collection grows, this becomes increasingly slow and expensive. Firestore queries should use `.limit()` with cursor-based pagination.

---

### 10. Four sequential network calls per recipe list load — `api/recipes/index.ts`
Each request to `/api/recipes` fires:
1. `db.getDocument('users', userId)` — get user's familyId
2. `db.getDocument('families', userDoc.familyId)` — get family members
3. `db.getCollection('recipes', ...)` — fetch all recipes
4. `db.getCollection('users/${userId}/favorites')` — fetch favorites

Calls 1 & 2 are sequential and could be parallelized. Calls 3 & 4 are also independent and could run in parallel with `Promise.all`. This adds unnecessary latency on every page load.

---

### 11. Fuse.js index rebuilt too aggressively — `useFilteredRecipes.ts:48-60`
```ts
const fuse = useMemo(() => {
  return new Fuse(recipes, { ... })
}, [recipes])
```
`recipes` comes from a nanostores atom, which emits a new array reference on every update (even unrelated ones). This causes the entire Fuse.js index to rebuild frequently. For large recipe sets, this is a measurable UI lag. The `useMemo` dependency should be more granular (e.g., a stable derived key like recipe IDs + titles).

---

### 12. `setInterval` drift in countdown timer — `timerManager.ts:45-63`
A `setInterval(..., 1000)` counter will drift over time because JS event loop delays accumulate. Over a 30-minute cook, this could be 5–15 seconds off. A more reliable pattern tracks `startTime` and computes `remaining = duration - (Date.now() - startTime)` on each tick rather than decrementing by 1.

---

### 13. PNG images unnecessarily converted to lossy JPEG — `image-optimization.ts:90-104`
```ts
canvas.toBlob((blob) => { ... }, 'image/jpeg', quality)
```
All images are converted to JPEG regardless of input type. PNG files with transparency will lose their alpha channel. PNG screenshots, logos, or illustrations will also look worse at JPEG quality 0.8 than as lossless PNGs. The output format should respect the original `file.type` for non-photo images.

---

### 14. `refreshRecipes` not memoized — `useRecipes.ts:22`
`refreshRecipes` is defined inside the hook body without `useCallback`. It gets a new reference every render, which means any component effect or callback that depends on it will re-run unnecessarily.

---

## 🧹 Code Quality & Maintainability

### 15. Debug `console.log` on every production request — `api/recipes/index.ts:54-58`
```ts
console.log('--- GET /api/recipes DEBUG ---')
console.log('User ID:', userId)
console.log('Allowed Creators:', Array.from(allowedCreators))
```
This logs user IDs and family composition to server logs on **every** recipe list fetch. This is both a performance concern (log I/O) and a potential privacy/info-disclosure issue. These should be removed or gated behind a `DEBUG` env flag.

---

### 16. Duplicate cookie reading in `[id].ts` PUT handler
```ts
// api/routes/[id].ts PUT:
const userCookie = cookies.get('site_user')
const user = userCookie?.value

// Everywhere else:
const userId = getAuthUser(cookies) // ✅ proper helper
```
The PUT handler bypasses the `getAuthUser` helper and reads cookies manually. This inconsistency means if the cookie name ever changes, the PUT handler will break while everything else is fine.

---

### 17. Test-mode branching runs in production — `firebase-server.ts:110-158`
```ts
const isTestUser = context?.cookies?.get('site_user')?.value === 'TestUser'
```
Every single database call checks for test mode at runtime. This is dead weight in production. Test mocking should be handled via environment-level dependency injection or a test-specific service layer, not inline conditionals in production code.

---

### 18. `CookingHistoryEntry` type not exported — `types.ts:268`
```ts
interface CookingHistoryEntry {  // ❌ not exported
  userId: string
  ...
}
```
`FamilyRecipeData.cookingHistory` is typed as `CookingHistoryEntry[]` but the type itself isn't exported. Any code that tries to work with individual history entries can't type-annotate them properly without re-declaring the shape.

---

### 19. Duplicate `dietary` field on `Recipe` type — `types.ts`
`Recipe` has both `dietary?: string[]` at the top level and `metadata?: { dietary?: string[] }`. It's unclear which one is the source of truth. This will cause inconsistency between how dietary data is stored, filtered, and displayed.

---

### 20. Mixed `.jsx` / `.tsx` files undermine type safety
`GlobalFeedback.jsx`, `BrutalCard.test.jsx`, and `button.test.jsx` are plain JavaScript while the rest of the codebase is TypeScript. This means bugs in those components won't be caught by the type checker. They should be converted to `.tsx`.

---

### 21. Dynamic `import()` inside frequently-called async functions — `useRecipeActions.ts:74, 169`
```ts
const { unplanRecipe } = await import('../../../lib/weekStore')
```
Dynamic imports inside `deleteRecipe` and `bulkDeleteRecipes` are called every time those actions run. While the module cache prevents re-execution, the dynamic import syntax creates unnecessary async overhead and obscures the real dependency. `weekStore` should be imported statically at the top of the file.

---

### 22. `setTimeout` workaround suppresses a legitimate React warning — `firestoreHooks.ts:35`
```ts
setTimeout(() => setLoading((prev) => (prev ? false : prev)), 0)
```
This uses a `setTimeout` to defer a state update specifically to silence an ESLint rule (`react-hooks/set-state-in-effect`). The correct fix is restructuring the effect so state is only set when the component is mounted, using a cleanup flag or `useRef` guard.

---

## Summary Table

| # | Severity | Category | File | Issue |
|---|----------|----------|------|-------|
| 1 | 🔴 Bug | Logic | `cookingSession.ts` | Off-by-one in `goToStep` |
| 2 | 🔴 Bug | Types | `api/recipes/[id].ts` | `changeType: 'edit'` not valid |
| 3 | 🔴 Bug | State | `recipeStore.ts` | Error state causes infinite refetch loop |
| 4 | 🔴 Bug | Sort | `useFilteredRecipes.ts` | `parseInt(uuid)` breaks `recent` sort |
| 5 | 🔴 Security | Auth | `api/recipes/[id].ts` | No auth on GET/DELETE |
| 6 | 🟠 Bug | Safety | `firebase-client.ts` | Unsafe null cast hides crashes |
| 7 | 🟠 Bug | Resource | `timerManager.ts` | AudioContext leak after 6 timers |
| 8 | 🟠 Bug | Async | `useFirebaseAuthSync.ts` | Auth sync race condition |
| 9 | 🟠 Perf | Scalability | `api/recipes/index.ts` | No pagination on recipe fetch |
| 10 | 🟠 Perf | Latency | `api/recipes/index.ts` | 4 sequential DB calls per request |
| 11 | 🟡 Perf | Rendering | `useFilteredRecipes.ts` | Fuse.js index rebuilds too often |
| 12 | 🟡 Perf | Accuracy | `timerManager.ts` | `setInterval` drift |
| 13 | 🟡 Perf | Assets | `image-optimization.ts` | PNG → JPEG loses transparency |
| 14 | 🟡 Perf | Rendering | `useRecipes.ts` | `refreshRecipes` not memoized |
| 15 | 🟡 Quality | Privacy | `api/recipes/index.ts` | Debug logs in production |
| 16 | 🟡 Quality | Consistency | `api/recipes/[id].ts` | Manual cookie read vs helper |
| 17 | 🟡 Quality | Architecture | `firebase-server.ts` | Test branching in prod code |
| 18 | 🟢 Quality | Types | `types.ts` | `CookingHistoryEntry` not exported |
| 19 | 🟢 Quality | Types | `types.ts` | Duplicate `dietary` field |
| 20 | 🟢 Quality | Types | Multiple | `.jsx` files bypass type checker |
| 21 | 🟢 Quality | Imports | `useRecipeActions.ts` | Dynamic import in hot path |
| 22 | 🟢 Quality | Patterns | `firestoreHooks.ts` | `setTimeout` anti-pattern |
