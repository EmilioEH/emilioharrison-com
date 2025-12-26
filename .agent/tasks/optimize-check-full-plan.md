# Implementation Plan - Optimize `check:full` for Speed & Reliability

## User Story
**As a developer (Emilio),** I want the full quality gate checks to run quickly and reliably without memory crashes, so that I can validate my code thoroughly before major releases without waiting 10+ minutes.

## Current Issues Analysis

### 🐌 **Performance Bottlenecks** (Current: ~10-15 minutes)
1. **ESLint Memory Crash**: Astro WASM compiler runs out of memory when linting `.astro` files
2. **Mutation Testing**: Stryker runs slowly (2-5 minutes) even with limited scope
3. **E2E Tests**: Playwright runs across 3 browsers (Chromium, Firefox, WebKit) sequentially
4. **Serial Execution**: All checks run one after another (`&&` chain)

### 📊 **Current Breakdown**
```bash
check:full = check:safety + test:stryker + test:e2e + scan
             ↓
check:safety = lint + format + tsc + astro-check + vitest  (~3-5 min OR crash)
test:stryker = mutation testing on 2 files                (~2-5 min)
test:e2e     = Playwright × 3 browsers                    (~3-5 min)
scan         = npm audit                                  (~5 sec)
```

## Proposed Optimizations

### ✅ **1. Fix ESLint Memory Issue**
**Problem**: Astro parser runs out of memory processing `.astro` files  
**Solution**: Exclude Astro files from ESLint, use only `astro check` for them

**Change**: Update `eslint.config.js` to exclude `**/*.astro` files and rely on Astro's built-in checker instead.

### ⚡ **2. Parallelize Independent Checks**
**Problem**: Everything runs serially even when tasks are independent  
**Solution**: Use `concurrently` or `npm-run-all` to run independent checks in parallel

**Safe to Parallelize**:
- TypeScript checking (`tsc --noEmit`)
- Astro checking (`astro check`)
- Unit tests (`vitest --run`)
- Security audit (`npm audit`)

**Must Run Serial**:
- Linting before formatting
- Mutation tests (resource intensive)
- E2E tests (resource intensive)

### 🎯 **3. Optimize Playwright Configuration**
**Problem**: Running 3 browsers multiplies test time by 3x  
**Solutions**:
- **For local dev**: Run only Chromium by default
- **For CI**: Run all 3 browsers
- **Add flag**: Create `test:e2e:fast` that only runs Chromium

### 📦 **4. Cache Everything Possible**
**Solutions**:
- ESLint: Add `--cache` flag to `lint` script
- TypeScript: Already uses incremental compilation
- Playwright: Use `reuseExistingServer` (already enabled)

### 🎚️ **5. Create Tiered Check Commands**

```json
"check:quick"  → lint + types only                     (~30 sec)
"check:safety" → lint + format + types + unit tests    (~2 min)
"check:full"   → safety + mutation + e2e (1 browser)   (~5 min)
"check:ci"     → full + all browsers + hygiene         (~10 min)
```

## Implementation Steps

### Step 1: Fix ESLint Memory Crash
- Update `eslint.config.js` to exclude `.astro` files
- Add `--cache` flag to lint script
- Test: `npm run lint` should complete without crash

### Step 2: Install Parallelization Tool
```bash
npm install --save-dev npm-run-all
```

### Step 3: Create Optimized Scripts in `package.json`
```json
{
  "lint": "eslint --cache .",
  "check:parallel": "run-p check:ts check:astro test:unit scan",
  "check:ts": "tsc --noEmit",
  "check:astro": "astro check",
  "test:unit": "vitest --run",
  "test:e2e:fast": "playwright test --project=chromium",
  "check:quick": "npm run lint && npm run check:ts",
  "check:safety": "npm run lint && npm run format && run-p check:ts check:astro test:unit",
  "check:full": "npm run check:safety && npm run test:stryker && npm run test:e2e:fast && npm run scan",
  "check:ci": "npm run check:safety && npm run test:stryker && npm run test:e2e && npm run check:hygiene && npm run scan"
}
```

### Step 4: Update Pre-Push Hook
Use `check:quick` for pre-push (fast, catches most issues):
```bash
echo "🚀 Running Pre-push Quick Checks (Lint + Types)..."
npm run check:quick --workspace=@emilio/recipes
```

### Step 5: Document Usage
Create a guide for when to use each check level:
- **Pre-push**: `check:quick` (automated)
- **Before PR**: `check:full` (manual)
- **CI/CD**: `check:ci` (automated)

## Expected Performance Improvements

| Check Level | Before | After | Improvement |
|------------|--------|-------|-------------|
| `check:quick` | N/A | ~30 sec | New! |
| `check:safety` | 5 min (or crash) | ~90 sec | 70% faster |
| `check:full` | 15 min | ~5 min | 66% faster |
| `check:ci` | 15 min | ~8 min | 45% faster |

## Quality Gate Strategy
The following tools verify these changes:
1. **Safety**: Run `npm run check:quick` to verify it completes quickly
2. **Full Test**: Run `npm run check:full` to verify it completes without crashes
3. **Timing**: Measure actual execution time of each command

## Verification Plan
1. ✅ Fix ESLint config and verify `npm run lint` doesn't crash
2. ✅ Install `npm-run-all` and update scripts
3. ✅ Time each check command and confirm improvements
4. ✅ Run full Quality Gate (`check:ci`) to ensure nothing broken
5. ✅ Update pre-push hook to use `check:quick`
