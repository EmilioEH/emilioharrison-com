import { test, expect } from '@playwright/test'

test.describe('Feedback System', () => {
  // Bypass authentication for all tests in this file
  test.use({
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
          value: 'FeedbackTester',
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

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the page light and stable
    await page.route('**/api/user-data', async (route) => {
      await route.fulfill({
        json: {
          recipes: [
            {
              id: '1',
              title: 'Test Recipe',
              protein: 'Chicken',
              ingredients: [],
              steps: [],
            },
          ],
        },
      })
    })

    await page.goto('/protected/recipes')
    // Wait for the app UI to stabilize - 'Add Recipe' button is more reliable for interaction checks
    await expect(page.getByRole('button', { name: 'Add Recipe' })).toBeVisible({ timeout: 15000 })
  })

  test('should allow submitting a bug report', async ({ page }) => {
    // 1. Open Feedback Modal
    await page.getByRole('button', { name: 'Feedback' }).click()
    await expect(page.getByText('Submit Feedback')).toBeVisible()

    // 2. Select Bug Report (Default)
    await expect(page.getByRole('button', { name: 'Bug Report' })).toHaveClass(
      /border-md-sys-color-primary/,
    )

    // 3. Fill out bug details
    await page.getByLabel('What happened? (Actual)').fill('Search button is frozen')
    await page.getByLabel('What did you expect?').fill('Expected results to show')

    // 4. Submit
    await page.getByRole('button', { name: 'Send Feedback' }).click()

    // 5. Verify Success message
    await expect(page.getByText('Thank you!')).toBeVisible()
    await expect(page.getByText('Your feedback has been received.')).toBeVisible()
  })

  test('should allow submitting an idea', async ({ page }) => {
    // 1. Open Feedback Modal
    await page.getByRole('button', { name: 'Feedback' }).click()

    // 2. Switch to Idea
    await page.getByRole('button', { name: 'Idea / Idea' }).click()
    await expect(page.getByRole('button', { name: 'Idea / Idea' })).toHaveClass(
      /border-md-sys-color-tertiary/,
    )

    // 3. Fill out idea
    await page
      .getByLabel('Tell us about your idea')
      .fill('Add a unit converter for international recipes')

    // 4. Submit
    await page.getByRole('button', { name: 'Send Feedback' }).click()

    // 5. Verify Success message
    await expect(page.getByText('Thank you!')).toBeVisible()
  })

  test('should include technical context automatically', async ({ page }) => {
    await page.getByRole('button', { name: 'Feedback' }).click()
    await expect(
      page.getByText('Technical context (logs, state, OS) will be included automatically.'),
    ).toBeVisible()
  })
})
