import { test, expect, type Page } from '@playwright/test'

/**
 * The week's two full screens, measured against the 44px minimum touch target.
 *
 * Both screens are almost entirely pills — four outcome buttons per recipe on the review, and up
 * to thirty facet chips on the suggester. They were built from the same `px-3 py-1.5` class string,
 * written out twice, which renders about 30px tall. That is the difference between a screen that
 * works on a phone and one that feels fiddly, and it is invisible in code review, so it is
 * asserted here instead.
 *
 * `.agent/rules/04-ios-webkit.md` and the design system both put the floor at 44px (Apple HIG).
 */

const MIN_TOUCH_TARGET = 44

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})

const recipe = (id: string, title: string, protein: string) => ({
  id,
  createdBy: 'Emilio',
  title,
  servings: 4,
  prepTime: 10,
  cookTime: 25,
  images: [],
  ingredients: [{ name: 'salt', amount: '1 tsp' }],
  steps: ['Cook it.'],
  protein,
})

const all = [
  recipe('r1', 'Buzhenina, Roasted Garlic Pork', 'Pork'),
  recipe('r2', 'Sheet Pan Tandoori Chicken', 'Chicken'),
]

/** Every element that is tappable must clear the floor on its short edge. */
async function expectAllTappable(page: Page, selector: string) {
  const targets = page.locator(selector)
  const count = await targets.count()
  expect(count, `expected some tappable elements matching ${selector}`).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const target = targets.nth(i)
    if (!(await target.isVisible())) continue
    const box = await target.boundingBox()
    const label = (await target.textContent())?.trim() || `#${i}`
    // Rounded: at deviceScaleFactor 2 the browser reports layout in 1/64ths, so an element that
    // is exactly 44px comes back as 43.99997. That is a rendering artifact, not a small button.
    expect(
      Math.round(box!.height),
      `"${label}" is only ${box!.height}px tall`,
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
  }
}

test.describe('week planner touch targets', () => {
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
    await page.route('**/api/recipes*', (route) => route.fulfill({ json: { recipes: all } }))
    await page.route('**/api/week/suggest', (route) =>
      route.fulfill({
        json: {
          success: true,
          turn: {
            say: 'What are you after?',
            widgets: [
              {
                kind: 'chips',
                id: 'proteins',
                mode: 'many',
                options: [
                  { label: 'Chicken', value: 'Chicken', count: 1 },
                  { label: 'Pork', value: 'Pork', count: 1 },
                ],
              },
              { kind: 'chips', id: 'mood', mode: 'many', options: [{ label: 'comforting', value: 'comforting' }] },
              { kind: 'counter', id: 'wanted', min: 1, max: 7, value: 4 },
              { kind: 'actions', options: [{ label: 'Find me meals', intent: 'more' }] },
            ],
          },
          constraints: {
            wanted: 4,
            mood: [],
            facets: { proteins: [], dishTypes: [], cuisines: [], difficulties: [], maxMinutes: null },
            keptIds: [],
            rejectedIds: [],
          },
        },
      }),
    )
    await page.route('**/api/week/review*', async (route) => {
      if (route.request().method() !== 'GET') {
        return route.fulfill({ json: { success: true, recorded: 1, closed: true } })
      }
      await route.fulfill({
        json: { success: true, pending: { weekStart: '2026-07-13', recipeIds: ['r1', 'r2'] } },
      })
    })

    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('button', { name: /This Week/i })
      .first()
      .click()
    await page.waitForTimeout(900)
  })

  test('every outcome button on the review clears 44px', async ({ page }) => {
    await page.getByTestId('open-week-review').click()
    await expect(page.getByTestId('week-review-prompt')).toBeVisible()

    await expectAllTappable(page, '[data-testid="week-review-prompt"] button')
  })

  test('every chip in the suggester clears 44px', async ({ page }) => {
    await page.getByTestId('open-meal-suggester').click()
    await expect(page.getByTestId('meal-suggester')).toBeVisible()
    // The prefetched turn arrives with counter, mood and facet chips — the densest group there is.
    await expect(page.getByRole('button', { name: /comforting/ })).toBeVisible()

    await expectAllTappable(page, '[data-testid="meal-suggester"] button')
  })

  test('the tab bar gets out of the way of a full screen', async ({ page }) => {
    // The bottom tab bar is `fixed z-50` and later in the DOM than the overlay's `absolute z-50`,
    // so it painted straight over a screen meant to have the viewport to itself — and one tap on
    // it discarded a half-finished exchange.
    // `exact` matters: the workspace header's back button is labelled "Back to Library".
    const libraryTab = page.getByRole('button', { name: 'Library', exact: true })
    await expect(libraryTab).toBeVisible()

    await page.getByTestId('open-meal-suggester').click()
    await expect(page.getByTestId('week-screen')).toBeVisible()
    await expect(libraryTab).toBeHidden()

    await page.getByRole('button', { name: 'Back to the week' }).click()
    await expect(libraryTab).toBeVisible()
  })
})
