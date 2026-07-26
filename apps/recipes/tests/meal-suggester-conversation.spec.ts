import { test, expect, type Page } from '@playwright/test'

/**
 * The suggester as an exchange rather than a form.
 *
 * Every turn is mocked, because the point under test is the client's half of the contract: that
 * previous turns stay on screen, that a tap becomes a new turn rather than mutating history, that
 * a typed sentence surfaces as a chip the cook can take back, and that dismissing one card doesn't
 * throw away the others. The model's half is covered by `suggest-turns.test.ts`.
 */

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
  recipe('r3', 'White Bean Soup', 'Vegetarian'),
]

const emptyConstraints = {
  wanted: 4,
  mood: [],
  facets: { proteins: [], dishTypes: [], cuisines: [], difficulties: [], maxMinutes: null },
  keptIds: [],
  rejectedIds: [],
}

const suggestionTurn = {
  say: 'Two that would work this week.',
  widgets: [
    {
      kind: 'recipes',
      picks: [
        { recipeId: 'r1', why: "You haven't made this yet." },
        { recipeId: 'r2', why: 'Lighter, to balance the pork.' },
      ],
    },
    {
      kind: 'actions',
      options: [
        { label: 'Show me others', intent: 'more' },
        { label: "That's the week", intent: 'done' },
      ],
    },
  ],
}

/** Serve a scripted sequence of turns, one per POST. */
async function scriptTurns(page: Page, turns: Array<Record<string, unknown>>) {
  let call = 0
  await page.route('**/api/week/suggest', (route) => {
    const turn = turns[Math.min(call, turns.length - 1)]
    call += 1
    route.fulfill({
      json: {
        success: true,
        turn: turn.turn ?? turn,
        constraints: turn.constraints ?? emptyConstraints,
      },
    })
  })
}

async function openSuggester(page: Page) {
  await page.goto('/protected/recipes/')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /This Week/i })
    .first()
    .click()
  await page.waitForTimeout(900)
  await page.getByTestId('open-meal-suggester').click()
  await expect(page.getByTestId('meal-suggester')).toBeVisible()
}

test.describe('meal suggester conversation', () => {
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
    await page.route('**/api/week/review*', (route) =>
      route.fulfill({ json: { success: true, pending: null } }),
    )
  })

  test('a suggestion turn renders its picks with reasons', async ({ page }) => {
    await scriptTurns(page, [{ turn: suggestionTurn }])
    await openSuggester(page)

    await expect(page.getByTestId('suggestion-card')).toHaveCount(2)
    await expect(page.getByText("You haven't made this yet.")).toBeVisible()
    await expect(page.getByText('Two that would work this week.')).toBeVisible()
  })

  test('earlier turns stay on screen when a new one arrives', async ({ page }) => {
    await scriptTurns(page, [
      { turn: suggestionTurn },
      { turn: { say: 'Here are two others.', widgets: [] } },
    ])
    await openSuggester(page)

    await expect(page.getByText('Two that would work this week.')).toBeVisible()
    await page.getByRole('button', { name: 'Show me others' }).click()

    // The old build blanked the list on every round; both turns must be readable together.
    await expect(page.getByText('Here are two others.')).toBeVisible()
    await expect(page.getByText('Two that would work this week.')).toBeVisible()
  })

  test('dismissing one card leaves the others alone', async ({ page }) => {
    await scriptTurns(page, [{ turn: suggestionTurn }])
    await openSuggester(page)

    await expect(page.getByTestId('suggestion-card')).toHaveCount(2)
    await page.getByRole('button', { name: 'Not Buzhenina, Roasted Garlic Pork' }).click()

    // Batch rejection used to discard everything on screen, including cards still being considered.
    await expect(page.getByTestId('suggestion-card')).toHaveCount(1)
    await expect(page.getByText('Sheet Pan Tandoori Chicken')).toBeVisible()
  })

  test('adding a meal records it in the transcript, and it can be undone', async ({ page }) => {
    await scriptTurns(page, [{ turn: suggestionTurn }])
    await page.route('**/api/recipes/*/week-plan', (route) =>
      route.fulfill({ json: { success: true, data: { id: 'r1' } } }),
    )
    await openSuggester(page)

    await page
      .getByRole('button', { name: 'Add to week' })
      .first()
      .click()

    await expect(page.getByText(/Added Buzhenina/)).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText(/Added Buzhenina/)).toBeHidden()
  })

  test('typed feedback appears as a bubble and its patch becomes a removable chip', async ({
    page,
  }) => {
    await scriptTurns(page, [
      { turn: suggestionTurn },
      {
        turn: { say: 'No chicken then.', widgets: [] },
        constraints: {
          ...emptyConstraints,
          facets: { ...emptyConstraints.facets, proteins: ['Chicken'] },
        },
      },
    ])
    await openSuggester(page)

    const composer = page.getByTestId('suggester-composer')
    await expect(composer).toBeVisible()
    await composer.fill('too much chicken')
    await composer.press('Enter')

    await expect(page.getByTestId('cook-said')).toHaveText('too much chicken')
    // The whole point of the patch: what the sentence did is visible and reversible.
    const chip = page.getByTestId('constraint-bar').getByRole('button', { name: 'Remove Chicken' })
    await expect(chip).toBeVisible()
  })

  test('the composer stays shut until there is something to react to', async ({ page }) => {
    await scriptTurns(page, [{ turn: { say: 'How many meals?', widgets: [] } }])
    await openSuggester(page)

    await expect(page.getByTestId('suggester-composer')).toBeHidden()
  })

  test('"that\'s the week" leaves the suggester', async ({ page }) => {
    await scriptTurns(page, [{ turn: suggestionTurn }])
    await openSuggester(page)

    await page.getByRole('button', { name: "That's the week" }).click()
    await expect(page.getByTestId('meal-suggester')).toBeHidden()
  })
})
