import { test, expect } from './msw-setup'
import type { Page } from '@playwright/test'

/**
 * The suggester's opening pantry step.
 *
 * Lives in its own file rather than in meal-suggester-conversation.spec.ts, which reaches the
 * suggester through the week plan's own button and is currently red for unrelated setup reasons.
 * This takes the route a cook actually takes from the week view.
 */
async function openSuggester(page: Page) {
  await page.getByRole('button', { name: 'This Week', exact: true }).click()
  await page.getByRole('button', { name: /help me pick/i }).click()
  await expect(page.getByTestId('meal-suggester')).toBeVisible()
}

test.describe('pantry step', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'testuser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])

    // Two recipes share spinach so it clears the "appears more than once" bar and is offered as
    // a chip; garlic appears once and is not.
    await page.route(/api\/recipes(\?|$)/, async (route) => {
      if (route.request().method() !== 'GET') return route.fulfill({ json: { success: true } })
      await route.fulfill({
        json: {
          recipes: [
            {
              id: '1',
              title: 'Spinach Pie',
              servings: 4,
              prepTime: 10,
              cookTime: 20,
              ingredients: [
                { name: 'spinach', amount: '1 bag' },
                { name: 'feta', amount: '200g' },
              ],
              steps: [],
            },
            {
              id: '2',
              title: 'Spinach Soup',
              servings: 4,
              prepTime: 5,
              cookTime: 25,
              ingredients: [
                { name: 'baby spinach', amount: '1 bag' },
                { name: 'garlic', amount: '2 cloves' },
              ],
              steps: [],
            },
          ],
        },
      })
    })

    // The suggester's own endpoint: echo the constraints back so the test can assert what the
    // client actually sent, without depending on a model.
    await page.route(/api\/week\/suggest/, async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill({
        json: {
          success: true,
          turn: {
            say: 'How many meals?',
            widgets: [{ kind: 'actions', options: [{ label: 'Find me meals', intent: 'more' }] }],
          },
          constraints: body?.constraints ?? {},
        },
      })
    })

    await page.route(/sw.js/, (route) => route.abort())
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/protected/recipes')
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
  })

  test('offers ingredients drawn from the library, and only ones that match something', async ({
    page,
  }) => {
    await openSuggester(page)
    await expect(page.getByTestId('pantry-picker')).toBeVisible()

    // "spinach" and "baby spinach" collapse to one chip, because they are one ingredient.
    const picker = page.getByTestId('pantry-picker')
    await expect(picker.getByRole('button', { name: /spinach/i })).toHaveCount(1)

    // A chip nothing matches is worse than no chip; garlic appears in one recipe only.
    await expect(picker.getByRole('button', { name: /^garlic$/i })).toHaveCount(0)
  })

  test('the step is optional, and sits above "Find me meals" rather than under it', async ({
    page,
  }) => {
    // A waiter who insists on an inventory before bringing anything is not a good waiter — so the
    // way past this step has to be visible, and below it, since that button ends the screen.
    await openSuggester(page)

    const findMeMeals = page.getByRole('button', { name: /find me meals/i })
    await expect(findMeMeals).toBeVisible()

    const picker = await page.getByTestId('pantry-picker').boundingBox()
    const button = await findMeMeals.boundingBox()
    expect(picker!.y + picker!.height).toBeLessThanOrEqual(button!.y + 1)
  })

  test('what the cook says they have becomes a chip they can take back', async ({ page }) => {
    await openSuggester(page)

    await page
      .getByTestId('pantry-picker')
      .getByRole('button', { name: /spinach/i })
      .click()
    await expect(page.getByTestId('constraint-bar')).toContainText('have spinach')

    await page.getByLabel(/remove have spinach/i).click()
    await expect(page.getByTestId('constraint-bar')).toBeHidden()
  })

  test('an ingredient can be typed in as well as tapped', async ({ page }) => {
    // The deliberate exception to "taps for narrowing, words only after suggestions exist": what
    // is in someone's fridge is a fact only they know, and no list of chips covers it.
    await openSuggester(page)

    await page.getByLabel(/add an ingredient you already have/i).fill('leftover rice')
    await page.getByLabel(/add this ingredient/i).click()

    await expect(page.getByTestId('constraint-bar')).toContainText('have leftover rice')
  })

  test('the dead "use up what we have" mood chip is gone', async ({ page }) => {
    // It named no actual ingredient, so it steered nothing. The pantry step is that idea done
    // properly, and the decoration should not outlive it.
    await openSuggester(page)
    await expect(page.getByRole('button', { name: /use up what we have/i })).toHaveCount(0)
  })
})
