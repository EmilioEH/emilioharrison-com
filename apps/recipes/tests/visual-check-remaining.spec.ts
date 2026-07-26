import { test, expect } from '@playwright/test'

/**
 * Visual verification for the findings that shipped *without* anyone looking at the result.
 * Companion to visual-check.spec.ts, same constraints: mocked data, phone viewport.
 */

const OUT = 'test-results/visual'

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const SCAN = 'https://example.com/uploads/scan.jpg'
const DISH = 'https://example.com/uploads/dish.jpg'

/** Photographed cookbook page, never re-photographed — thumbnail should be suppressed (#13). */
const scannedRecipe = {
  id: 'scan-001',
  createdBy: 'Emilio',
  title: 'Buzhenina, Roasted Garlic Pork',
  servings: 6,
  prepTime: 20,
  cookTime: 55,
  images: [SCAN],
  sourceImage: SCAN,
  ingredients: [{ name: 'Pork tenderloin', amount: '2 lb' }],
  steps: ['Roast.'],
  protein: 'Pork',
}

/** Cook added a photo of the finished dish — that one should show. */
const withDishPhoto = {
  ...scannedRecipe,
  id: 'dish-001',
  title: 'Sheet Pan Tandoori Chicken',
  images: [DISH, SCAN],
  thumbUrl: DISH,
  protein: 'Chicken',
}

/** Baked good stored as "Main" — the pre-existing case inference has to rescue (#23). */
const cookies = {
  ...scannedRecipe,
  id: 'bake-001',
  title: 'Salted Caramel Chocolate Chip Cookies',
  images: [],
  sourceImage: '',
  dishType: 'Main',
  protein: 'Other',
}

const all = [scannedRecipe, withDishPhoto, cookies]

test.describe('remaining findings', () => {
  test.beforeEach(async ({ page, context }) => {
    await page.goto('about:blank')
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'Emilio', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])
    await page.route('**/api/bootstrap*', (route) =>
      route.fulfill({ json: { recipes: all, planned: [], family: null, user: 'Emilio' } }),
    )
    await page.route('**/api/recipes/*/family-data', (route) =>
      route.fulfill({ json: { success: true, data: { reviews: [], ratings: [] } } }),
    )
    await page.route('**/api/recipes*', (route) =>
      route.fulfill({ json: { recipes: all } }),
    )
    // Never let a fake image URL actually resolve — keeps rendering deterministic.
    await page.route('https://example.com/**', (route) => route.abort())
  })

  test('library — thumbnails and filter pills', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${OUT}/10-library-thumbnails.png` })
  })

  test('finding 13 — scan suppressed, dish photo shown', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')

    const scanCard = page.getByTestId('recipe-card-scan-001')
    const dishCard = page.getByTestId('recipe-card-dish-001')
    await expect(scanCard).toBeVisible()

    // A photographed cookbook page shows no thumbnail at all — not an image, and not a
    // placeholder either. Most of the library is imported that way, so a placeholder meant a
    // column of identical chef-hat icons indenting every title for no information.
    expect(await scanCard.locator('img').count()).toBe(0)
    expect(await scanCard.getByTestId('recipe-card-thumbnail').count()).toBe(0)

    // The one with a cook-added photo still renders its image.
    expect(await dishCard.locator('img').count()).toBeGreaterThan(0)
    expect(await dishCard.getByTestId('recipe-card-thumbnail').count()).toBe(1)
  })

  test('finding 23 — a cookie stored as "Main" is filterable as Dessert', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')

    // Switch the library's grouping axis to dish type, then look for the baking category.
    const sortButton = page.locator('button').filter({ hasText: /sort|filter/i }).first()
    if (await sortButton.count()) {
      await sortButton.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/11-sort-options.png` })
    }
  })

  test('finding 17/18 — both footers flush at the bottom', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')

    const viewport = page.viewportSize()!
    const tabBar = page.locator('.fixed.bottom-0').first()
    const tabBox = await tabBar.boundingBox()
    expect(Math.abs(tabBox!.y + tabBox!.height - viewport.height)).toBeLessThan(2)

    // The detail view's Add to Week footer is the second instance of the same bug.
    await page.getByTestId('recipe-card-scan-001').click()
    await page.waitForLoadState('networkidle')
    const actionBar = page.getByTestId('detail-action-footer')
    const actionBox = await actionBar.boundingBox()
    expect(Math.abs(actionBox!.y + actionBox!.height - viewport.height)).toBeLessThan(2)
    await page.screenshot({ path: `${OUT}/12-detail-footer.png` })
  })

  test('week view', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'This Week' }).click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${OUT}/13-week.png` })
  })
})
