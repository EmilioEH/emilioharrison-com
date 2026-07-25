import { test, expect } from '@playwright/test'

/**
 * Not an assertion suite — a screenshot harness for reviewing how the app actually looks.
 *
 * Every finding in this round came from watching real usage, and the ones that slipped through
 * slipped because a change shipped without anyone looking at the resulting screen. This renders
 * the surfaces that changed, against mocked data (no credentials, no production access), and
 * writes PNGs to test-results/visual/ for direct review.
 *
 * Run:  npx playwright test tests/visual-check.spec.ts --project=chromium
 */

const OUT = 'test-results/visual'

// Chefboard is only ever used as a PWA on a phone, so review it at phone size — a desktop
// viewport shows a layout no real user sees. iPhone 12/13/14 logical resolution.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const recipe = {
  id: 'visual-001',
  createdBy: 'Emilio',
  title: 'Steak with Ras el Hanout and Couscous',
  servings: 4,
  prepTime: 15,
  cookTime: 25,
  description: 'A quick weeknight steak with warm spices, couscous and pomegranate.',
  images: [],
  sourceImage: '',
  ingredients: [
    { name: 'Steak', amount: '1 lb', prep: 'pat dry' },
    { name: 'Ras el hanout', amount: '2.5 tsp' },
    { name: 'Salt', amount: '1 tsp' },
    { name: 'Pepper', amount: '1/4 tsp' },
    { name: 'Vegetable oil', amount: '2 tbsp' },
    { name: 'Water', amount: '1 1/4 cups' },
    { name: 'Couscous', amount: '1 cup' },
    { name: 'Spinach', amount: '2 cups' },
    { name: 'Pomegranate seeds', amount: '1/2 cup' },
  ],
  steps: [
    'Pat steak dry, sprinkle with 2 teaspoons ras el hanout, salt and pepper.',
    'Sear in a hot skillet until browned on both sides.',
    'Bring water to a boil, stir in couscous, cover and rest 5 minutes.',
    'Fold spinach through the couscous and top with pomegranate seeds.',
  ],
  structuredSteps: [
    {
      title: 'Season the Steak',
      text: 'Pat steak dry, then sprinkle with ras el hanout, salt and pepper.',
      highlightedText: '**Pat** steak dry, then sprinkle with ras el hanout, salt and pepper.',
      tip: 'A dry surface is what lets the crust form.',
    },
    {
      title: 'Sear',
      text: 'Sear in a hot skillet until browned on both sides.',
      highlightedText: '**Sear** in a hot skillet until browned on both sides.',
    },
    {
      title: 'Steam the Couscous',
      text: 'Bring water to a boil, stir in couscous, cover and rest 5 minutes.',
      highlightedText: '**Bring** water to a boil, stir in couscous, cover and rest 5 minutes.',
    },
  ],
  stepGroups: [
    { header: 'COOK THE STEAK', startIndex: 0, endIndex: 1 },
    { header: 'FINISH', startIndex: 2, endIndex: 2 },
  ],
  protein: 'Beef',
  cuisine: 'Moroccan',
  difficulty: 'Easy',
  enhancementStatus: 'complete',
}

test.describe('visual check', () => {
  test.beforeEach(async ({ page, context }) => {
    await page.goto('about:blank')
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'Emilio', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])

    await page.route('**/api/bootstrap*', (route) =>
      route.fulfill({ json: { recipes: [recipe], planned: [], family: null, user: 'Emilio' } }),
    )
    await page.route('**/api/recipes/*/family-data', (route) =>
      route.fulfill({ json: { success: true, data: { reviews: [], ratings: [] } } }),
    )
    await page.route('**/api/recipes*', (route) => {
      const url = route.request().url()
      if (/\/api\/recipes\/[^/?]+/.test(url)) {
        return route.fulfill({ json: { success: true, recipe } })
      }
      return route.fulfill({ json: { recipes: [recipe] } })
    })
  })

  test('library', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${OUT}/01-library.png` })
  })

  test('recipe detail — ingredients and instructions', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')

    const card = page.locator('[data-testid^="recipe-card-"]').first()
    await card.click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${OUT}/02-detail-top.png` })

    const ingredients = page.getByTestId('overview-ingredients-section')
    await ingredients.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${OUT}/03-ingredients.png` })

    const instructions = page.getByTestId('overview-instructions-section')
    await instructions.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${OUT}/04-instructions.png` })
  })

  test('no radio-style circles remain on ingredients or steps', async ({ page }) => {
    // The finding was "ingredients and instructions don't need radio buttons". Instructions were
    // fixed first and ingredients were missed, so this asserts both.
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-testid^="recipe-card-"]').first().click()
    await page.waitForLoadState('networkidle')

    const ingredientRow = page.getByTestId('ingredient-row').first()
    await expect(ingredientRow).toBeVisible()
    expect(await ingredientRow.locator('.rounded-full').count()).toBe(0)

    const stepRow = page.getByTestId('instruction-step-toggle').first()
    await expect(stepRow).toBeVisible()
    expect(await stepRow.locator('.rounded-full.border-2').count()).toBe(0)
  })

  test('footer sits flush to the bottom', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')

    const bar = page.locator('.fixed.bottom-0').first()
    const box = await bar.boundingBox()
    const viewport = page.viewportSize()
    expect(box).not.toBeNull()
    expect(Math.abs(box!.y + box!.height - viewport!.height)).toBeLessThan(2)
  })
})
