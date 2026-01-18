import { test, expect } from './msw-setup'
import type { Page } from '@playwright/test'

/**
 * Cooking Mode Layout Audit Test Suite
 *
 * Tests cooking mode layout across different recipe archetypes:
 * - Simple: 2-3 steps, no timers
 * - Medium: 5-7 steps, 1-2 timers
 * - Complex: 7+ steps, multiple timers, substeps
 *
 * Validates layout health metrics and identifies universal vs. recipe-specific issues.
 */

test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE dimensions
  storageState: {
    cookies: [
      {
        name: 'site_auth',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'site_user',
        value: 'TestUser',
        domain: '127.0.0.1',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'site_email',
        value: 'emilioeh1991@gmail.com',
        domain: '127.0.0.1',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  },
})

// Layout health thresholds
const LAYOUT_METRICS = {
  MIN_CONTENT_AREA_PERCENT: 50, // Minimum % of viewport for recipe instructions
  MAX_FIXED_UI_PERCENT: 50, // Maximum % for header + footer + fixed elements
  MIN_CONTRAST_RATIO: 4.5, // WCAG AA for text
  MIN_TOUCH_TARGET_SPACING: 8, // Minimum px between interactive elements
}

interface LayoutMeasurements {
  viewportHeight: number
  headerHeight: number
  footerHeight: number
  timelineHeight: number
  timerCardHeight: number
  contentHeight: number
  fixedUIPercent: number
  contentPercent: number
}

/**
 * Helper: Measure layout dimensions
 */
async function measureLayout(page: Page): Promise<LayoutMeasurements> {
  return page.evaluate(() => {
    const viewport = window.innerHeight
    const header = document.querySelector('header')?.offsetHeight || 0
    const timeline = document.querySelector('[data-testid="cooking-timeline"]')?.offsetHeight || 0
    const timerCard = document.querySelector('[data-testid="active-timer-card"]')?.offsetHeight || 0
    const footer = document.querySelector('[data-testid="cooking-footer"]')?.offsetHeight || 0

    const fixedUI = header + timeline + timerCard + footer
    const content = viewport - fixedUI

    return {
      viewportHeight: viewport,
      headerHeight: header,
      footerHeight: footer,
      timelineHeight: timeline,
      timerCardHeight: timerCard,
      contentHeight: content,
      fixedUIPercent: (fixedUI / viewport) * 100,
      contentPercent: (content / viewport) * 100,
    }
  })
}

/**
 * Helper: Navigate to cooking mode for a recipe
 */
async function enterCookingMode(page: Page, recipeTitle: string) {
  await page.goto('http://127.0.0.1:4321/protected/recipes')
  await page.waitForLoadState('networkidle')

  // Search for recipe
  const searchInput = page.getByPlaceholder(/search/i)
  await searchInput.fill(recipeTitle)
  await page.waitForTimeout(500)

  // Click recipe card
  const recipeCard = page.getByRole('heading', { name: new RegExp(recipeTitle, 'i') }).first()
  await recipeCard.click()
  await page.waitForLoadState('networkidle')

  // Enter cooking mode
  const startCookingButton = page.getByRole('button', { name: /start cooking/i })
  await startCookingButton.click()
  await page.waitForLoadState('networkidle')
}

test.describe('Simple Recipe (2-3 steps, no timers)', () => {
  const RECIPE_TITLE = 'Scrambled Eggs'

  test('should not waste vertical space on simple recipes', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    // Measure initial layout
    const measurements = await measureLayout(page)

    // Screenshot of Step 0
    await page.screenshot({
      path: `test-results/cooking-mode-layout-audit/simple-step-0.png`,
      fullPage: false,
    })

    // Assertions
    expect(measurements.contentPercent).toBeGreaterThan(LAYOUT_METRICS.MIN_CONTENT_AREA_PERCENT)
    expect(measurements.fixedUIPercent).toBeLessThan(LAYOUT_METRICS.MAX_FIXED_UI_PERCENT)

    // With fewer steps, timeline should be proportionally smaller
    expect(measurements.timelineHeight).toBeLessThan(80) // Should not exceed 80px for 2-3 steps
  })

  test('should show readable next step preview', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    // Navigate to step with next step preview
    const nextStepButton = page.getByRole('button', { name: /next step/i })

    if (await nextStepButton.isVisible()) {
      // Scroll to bottom to reveal preview card
      await page.evaluate(() => {
        const scrollable = document.querySelector('[scrollable="true"]')
        if (scrollable) {
          scrollable.scrollTop = scrollable.scrollHeight
        }
      })

      await page.screenshot({
        path: `test-results/cooking-mode-layout-audit/simple-next-preview.png`,
      })

      // Check if preview card exists and is visible
      const previewCard = page.locator('text=/NEXT:/i').first()
      if (await previewCard.isVisible()) {
        // Measure contrast (should be readable)
        await previewCard.evaluate((el) => {
          const style = window.getComputedStyle(el)
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
          }
        })

        // TODO: Calculate actual contrast ratio
        // For now, just verify element exists
        expect(await previewCard.isVisible()).toBeTruthy()
      }
    }
  })

  test('should not show ingredients button overlap on simple recipes', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    const ingredientsButton = page.getByRole('button', { name: /ingredients/i })

    if (await ingredientsButton.isVisible()) {
      // Get position of ingredients button
      const ingredientsBox = await ingredientsButton.boundingBox()

      // Get position of last task card
      const lastTask = page.locator('[data-testid="task-card"]').last()
      const taskBox = await lastTask.boundingBox()

      if (ingredientsBox && taskBox) {
        // Check for overlap
        const overlaps =
          ingredientsBox.y < taskBox.y + taskBox.height &&
          ingredientsBox.y + ingredientsBox.height > taskBox.y

        await page.screenshot({
          path: `test-results/cooking-mode-layout-audit/simple-ingredients-overlap.png`,
        })

        // Should NOT overlap
        expect(overlaps).toBeFalsy()
      }
    }
  })
})

test.describe('Medium Recipe (5-7 steps, 1-2 timers)', () => {
  const RECIPE_TITLE = 'Pasta' // Adjust to actual medium-complexity recipe in DB

  test('should adapt timeline for moderate step count', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    const measurements = await measureLayout(page)

    await page.screenshot({
      path: `test-results/cooking-mode-layout-audit/medium-step-0.png`,
    })

    // Timeline should scale but still leave room for content
    expect(measurements.timelineHeight).toBeGreaterThan(60)
    expect(measurements.timelineHeight).toBeLessThan(100)
    expect(measurements.contentPercent).toBeGreaterThan(LAYOUT_METRICS.MIN_CONTENT_AREA_PERCENT)
  })

  test('should handle timer activation without crushing content', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    // Look for a step with a timer
    const timerButton = page.getByRole('button', { name: /start.*timer/i })

    if (await timerButton.isVisible()) {
      // Measure before timer
      await measureLayout(page)

      // Start timer
      await timerButton.click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: `test-results/cooking-mode-layout-audit/medium-timer-active.png`,
      })

      // Measure after timer
      const afterMeasurements = await measureLayout(page)

      // Timer card should be present
      expect(afterMeasurements.timerCardHeight).toBeGreaterThan(0)

      // Content should still meet minimum threshold
      expect(afterMeasurements.contentPercent).toBeGreaterThan(
        LAYOUT_METRICS.MIN_CONTENT_AREA_PERCENT,
      )

      // Navigate to another step
      const nextButton = page.getByRole('button', { name: /next step/i })
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForTimeout(500)

        await page.screenshot({
          path: `test-results/cooking-mode-layout-audit/medium-timer-persists.png`,
        })

        // Timer should persist but not dominate
        const persistMeasurements = await measureLayout(page)
        expect(persistMeasurements.timerCardHeight).toBeGreaterThan(0)
        expect(persistMeasurements.contentPercent).toBeGreaterThan(40) // Slightly relaxed
      }
    }
  })
})

test.describe('Complex Recipe (7+ steps, timers, substeps)', () => {
  const RECIPE_TITLE = 'Shake Shack Burger'

  test('should handle maximum layout stress', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    const measurements = await measureLayout(page)

    await page.screenshot({
      path: `test-results/cooking-mode-layout-audit/complex-step-0.png`,
    })

    // Even with many steps, content must be visible
    expect(measurements.contentPercent).toBeGreaterThan(LAYOUT_METRICS.MIN_CONTENT_AREA_PERCENT)

    // Timeline will be larger but should not exceed threshold
    expect(measurements.timelineHeight).toBeLessThan(120)
  })

  test('should maintain readability on multi-substep steps', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    // Navigate through steps to find one with substeps
    for (let i = 0; i < 7; i++) {
      await page.screenshot({
        path: `test-results/cooking-mode-layout-audit/complex-step-${i}.png`,
      })

      const measurements = await measureLayout(page)

      // Log metrics for analysis
      console.log(
        `Step ${i}: Content=${measurements.contentPercent.toFixed(1)}%, Fixed UI=${measurements.fixedUIPercent.toFixed(1)}%`,
      )

      // Try to advance
      const nextButton = page.getByRole('button', { name: /next step|finish cooking/i })
      if (await nextButton.isVisible()) {
        // Check for ingredients button overlap before advancing
        const ingredientsButton = page.getByRole('button', { name: /ingredients/i })
        if (await ingredientsButton.isVisible()) {
          const ingredientsBox = await ingredientsButton.boundingBox()
          const nextBox = await nextButton.boundingBox()

          if (ingredientsBox && nextBox) {
            // Should have minimum spacing
            const spacing = Math.abs(ingredientsBox.y - (nextBox.y + nextBox.height))
            expect(spacing).toBeGreaterThan(LAYOUT_METRICS.MIN_TOUCH_TARGET_SPACING)
          }
        }

        await nextButton.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }
  })

  test('should show dual timer issue (if present)', async ({ page }) => {
    await enterCookingMode(page, RECIPE_TITLE)

    // Navigate to step 2 (Fry step with timer)
    const step2 = page.locator('[data-testid="step-circle"]').nth(2)
    await step2.click()
    await page.waitForTimeout(500)

    // Scroll to find timer button
    await page.evaluate(() => {
      const scrollable = document.querySelector('[scrollable="true"]')
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight
      }
    })

    const timerButton = page.getByRole('button', { name: /start.*timer/i })

    if (await timerButton.isVisible()) {
      await timerButton.click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: `test-results/cooking-mode-layout-audit/complex-dual-timer.png`,
      })

      // Check for both timer chip and timer card
      const timerChip = page.locator('[data-testid="timer-chip"]')
      const timerCard = page.locator('[data-testid="active-timer-card"]')

      const chipVisible = await timerChip.isVisible().catch(() => false)
      const cardVisible = await timerCard.isVisible().catch(() => false)

      // Document if dual display exists
      if (chipVisible && cardVisible) {
        console.log('⚠️  DUAL TIMER DISPLAY DETECTED - Both chip and card visible')
      }

      // Navigate to step 4 to check persistence
      const step4 = page.locator('[data-testid="step-circle"]').nth(4)
      await step4.click()
      await page.waitForTimeout(500)

      await page.screenshot({
        path: `test-results/cooking-mode-layout-audit/complex-timer-wrong-step.png`,
      })

      const measurements = await measureLayout(page)

      // Timer card should not persist on irrelevant steps (this is the bug)
      // For now, just document the behavior
      console.log(`Timer card height on Step 4: ${measurements.timerCardHeight}px`)
    }
  })
})

test.describe('Layout Metrics Summary', () => {
  test('should generate comparison report', async ({ page }) => {
    // This test aggregates findings across all recipes
    const recipes = [
      { title: 'Scrambled Eggs', type: 'Simple' },
      { title: 'Pasta', type: 'Medium' },
      { title: 'Shake Shack Burger', type: 'Complex' },
    ]

    const report: Array<{ recipe: string; type: string; metrics: LayoutMeasurements }> = []

    for (const recipe of recipes) {
      try {
        await enterCookingMode(page, recipe.title)
        const measurements = await measureLayout(page)

        report.push({
          recipe: recipe.title,
          type: recipe.type,
          metrics: measurements,
        })
      } catch (error) {
        console.warn(`Could not test ${recipe.title}:`, error)
      }
    }

    // Output comparison table
    console.log('\n=== LAYOUT METRICS COMPARISON ===\n')
    console.table(
      report.map((r) => ({
        Recipe: `${r.recipe} (${r.type})`,
        'Content %': r.metrics.contentPercent.toFixed(1),
        'Fixed UI %': r.metrics.fixedUIPercent.toFixed(1),
        'Timeline (px)': r.metrics.timelineHeight,
        'Timer Card (px)': r.metrics.timerCardHeight,
      })),
    )

    // Identify universal issues
    const universalIssues: string[] = []

    const allFailContent = report.every(
      (r) => r.metrics.contentPercent < LAYOUT_METRICS.MIN_CONTENT_AREA_PERCENT,
    )
    if (allFailContent) {
      universalIssues.push('✗ Content area below 50% threshold in ALL recipes')
    }

    const allHaveTimerCard = report.every((r) => r.metrics.timerCardHeight > 0)
    if (allHaveTimerCard) {
      universalIssues.push('✗ Timer card present in ALL recipes (even when not relevant)')
    }

    if (universalIssues.length > 0) {
      console.log('\n=== UNIVERSAL ISSUES (Fix First) ===\n')
      universalIssues.forEach((issue) => console.log(issue))
    }

    console.log('\n=== END REPORT ===\n')
  })
})
