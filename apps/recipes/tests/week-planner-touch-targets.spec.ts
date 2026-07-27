import { test, expect, type Page, type BrowserContext } from '@playwright/test'

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

  test('the page never scrolls sideways while a screen slides in', async ({ page }) => {
    // The screens arrive from `x: 100%`. Without a clipping ancestor that off-screen transform
    // extends the document's scrollable width, and on a real iPhone the page scrolls sideways
    // mid-transition — the view underneath ends up clipped on one edge with a horizontal
    // scrollbar. Transforms alone look fine while this is broken, so measure the document.
    const overflow = async () =>
      page.evaluate(() => ({
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      }))

    await page.getByTestId('open-meal-suggester').click()
    for (let i = 0; i < 8; i++) {
      const { doc, body } = await overflow()
      expect(doc, `document gained ${doc}px of horizontal scroll`).toBeLessThanOrEqual(1)
      expect(body, `body gained ${body}px of horizontal scroll`).toBeLessThanOrEqual(1)
      await page.waitForTimeout(40)
    }

    await expect(page.getByTestId('week-screen')).toBeVisible()
    const settled = await overflow()
    expect(settled.doc).toBeLessThanOrEqual(1)
  })

  test('the arriving screen is opaque, not a cross-fade', async ({ page }) => {
    // Fading in from transparent left the plan legible straight through the incoming screen,
    // with its text running through the chips.
    await page.getByTestId('open-meal-suggester').click()
    await page.waitForTimeout(60)

    const opacity = await page
      .getByTestId('week-screen')
      .evaluate((el) => Number(getComputedStyle(el).opacity))
    expect(opacity).toBe(1)
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

/**
 * What the plan offers, and in what order.
 *
 * The suggester is a way *in* — it belongs on an empty week, not stacked above meals the cook has
 * already chosen. The review asks about a week that is over, so it sits at the bottom rather than
 * above the week they actually opened the planner to see.
 */
test.describe('week plan layout', () => {
  const planWith = (planned: unknown[]) => async (page: Page, context: BrowserContext) => {
    await page.goto('about:blank')
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'Emilio', domain: '127.0.0.1', path: '/' },
    ])
    await page.route('**/api/bootstrap*', (route) =>
      route.fulfill({ json: { recipes: all, planned, family: null, user: 'Emilio' } }),
    )
    await page.route('**/api/recipes/*/family-data', (route) =>
      route.fulfill({ json: { success: true, data: { reviews: [], ratings: [] } } }),
    )
    await page.route('**/api/recipes*', (route) => route.fulfill({ json: { recipes: all } }))
    await page.route('**/api/week/suggest', (route) =>
      route.fulfill({ json: { success: true, turn: { say: 'Hi', widgets: [] } } }),
    )
    await page.route('**/api/week/review*', (route) =>
      route.fulfill({
        json: { success: true, pending: { weekStart: '2026-07-13', recipeIds: ['r1'] } },
      }),
    )
    await page.goto('/protected/recipes/')
    await page.waitForLoadState('networkidle')
    // Target the tab bar specifically. A bare `getByRole('button', {name: /This Week/i}).first()`
    // also matches a library card's own "This Week" toggle as soon as anything is planned, which
    // silently lands on the recipe detail page — where a suggester button is missing and a recipe
    // title is present, so an unwary assertion passes for entirely the wrong reason.
    await page.locator('.fixed.bottom-0').getByRole('button', { name: /This Week/i }).click()
    // `.first()`, not `.or()`: on an empty week with a pending review both are present, and a
    // locator resolving to two elements is a strict-mode violation rather than a wait.
    await expect(
      page
        .locator('[data-testid="open-meal-suggester"], [data-testid="open-week-review"]')
        .first(),
    ).toBeVisible()
  }

  /** Monday of the current week, which is the only week `addRecipeToWeek` ever assigns to. */
  const thisMonday = () => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d.toISOString().slice(0, 10)
  }

  test('offers the suggester only while the week is empty', async ({ page, context }) => {
    await planWith([])(page, context)
    await expect(page.getByTestId('open-meal-suggester')).toBeVisible()
  })

  test('hides the suggester once a meal is scheduled', async ({ page, context }) => {
    await planWith([
      { id: 'r1', weekPlan: { isPlanned: true, assignedDate: thisMonday() }, reviews: [] },
    ])(page, context)

    await expect(page.getByText('Buzhenina, Roasted Garlic Pork')).toBeVisible()
    await expect(page.getByTestId('open-meal-suggester')).toBeHidden()
  })

  test('puts the review below the week, not above it', async ({ page, context }) => {
    await planWith([
      { id: 'r1', weekPlan: { isPlanned: true, assignedDate: thisMonday() }, reviews: [] },
    ])(page, context)

    // The review card only appears once `GET /api/week/review` has answered, so wait for it
    // rather than measuring whatever happens to be laid out yet.
    await expect(page.getByTestId('open-week-review')).toBeVisible()

    const review = await page.getByTestId('open-week-review').boundingBox()
    const meal = await page.getByText('Buzhenina, Roasted Garlic Pork').boundingBox()
    expect(review!.y).toBeGreaterThan(meal!.y)
  })
})
